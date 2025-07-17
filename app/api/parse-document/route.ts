import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "没有找到文件" }, { status: 400 })
    }

    // 检查文件类型
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/vnd.ms-powerpoint", // .ppt
      "application/pdf", // .pdf
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 })
    }

    // 检查文件大小（4MB）
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "文件大小超过4MB限制" }, { status: 400 })
    }

    let result: { content: string; metadata: any; warning?: string }

    try {
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer()

      // 根据文件类型选择解析方法
      // 根据文件类型选择解析方法
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        // 使用pdf-parse库替代pdfjs-dist以避免Node.js环境问题
        const pdfParse = await import("pdf-parse")
        
        try {
          const pdfData = await pdfParse.default(Buffer.from(arrayBuffer))
          const content = pdfData.text
          const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length

          result = {
            content,
            metadata: {
              wordCount,
              pageCount: pdfData.numpages,
              parseEngine: "pdf-parse",
            },
          }
        } catch (err) {
          console.error("[PDF] pdf-parse error:", err)
          throw err
        }
      }
      else if (file.type.includes("presentationml") || file.name.toLowerCase().endsWith(".pptx")) {
        // PPTX 文件 - 使用JSZip + XML解析器
        result = await parsePptx(arrayBuffer)
      } else if (file.type.includes("ms-powerpoint") || file.name.toLowerCase().endsWith(".ppt")) {
        // PPT 文件 - JSZip + 启发式二进制解析
        result = await parsePptWithConversion(arrayBuffer, file.name)
      } else if (file.type.includes("wordprocessingml") || file.name.toLowerCase().endsWith(".docx")) {
        // DOCX 文件 - 使用mammoth.js (完全支持)
        result = await parseDocx(arrayBuffer)
      } else if (file.type.includes("msword") || file.name.toLowerCase().endsWith(".doc")) {
        // DOC 文件 - mammoth.js + 智能备用解析
        result = await parseDocWithMammoth(arrayBuffer)
      } else {
        throw new Error("不支持的文件格式")
      }

      // 检测是否为乱码
      if (isGarbledText(result.content)) {
        return NextResponse.json({
          error: "文档内容出现乱码，可能是文件格式不支持或文件损坏，请检查文件是否正常",
        })
      }

      // 清理提取的文本
      const cleanedText = cleanExtractedText(result.content)

      // 限制文本长度为30k字符
      const maxTextLength = 30000
      const finalText = cleanedText.length > maxTextLength ? cleanedText.substring(0, maxTextLength) : cleanedText

      if (!finalText.trim() || finalText.length < 10) {
        return NextResponse.json({
          error: "未能从文档中提取到足够的可读文本，请确保文档包含文本内容且格式正确",
        })
      }

      return NextResponse.json({
        text: finalText,
        metadata: result.metadata,
        warning: result.warning,
      })
    } catch (error) {
      console.error("文档解析错误:", error)
      return NextResponse.json({
        error: `文档解析失败: ${error instanceof Error ? error.message : "未知错误"}`,
      })
    }
  } catch (error) {
    console.error("处理请求失败:", error)
    return NextResponse.json({ error: "服务器处理失败" }, { status: 500 })
  }
}

// 解析DOCX文件 - 使用mammoth.js
const parseDocx = async (buffer: ArrayBuffer): Promise<{ content: string; metadata: any }> => {
  try {
    const mammoth = await import("mammoth")
    
    // 将ArrayBuffer转换为Buffer，mammoth.js更好地支持Buffer
    const nodeBuffer = Buffer.from(buffer)
    
    // 使用buffer参数而不是arrayBuffer
    const result = await mammoth.extractRawText({ buffer: nodeBuffer })
    const content = result.value

    if (result.messages && result.messages.length > 0) {
      console.log("Mammoth messages:", result.messages)
    }

    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length
    const paragraphCount = content.split(/\n\s*\n/).length

    return {
      content,
      metadata: {
        wordCount,
        paragraphCount,
        extractedImages: 0,
        parseEngine: "mammoth.js",
      },
    }
  } catch (error) {
    throw new Error(`DOCX解析失败: ${error instanceof Error ? error.message : "未知错误"}`)
  }
}

// 解析DOC文件 - 尝试使用mammoth.js
const parseDocWithMammoth = async (
  buffer: ArrayBuffer,
): Promise<{ content: string; metadata: any; warning?: string }> => {
  try {
    const mammoth = await import("mammoth")
    
    // 将ArrayBuffer转换为Buffer，mammoth.js更好地支持Buffer
    const nodeBuffer = Buffer.from(buffer)
    
    // 尝试使用mammoth解析DOC文件
    const result = await mammoth.extractRawText({ buffer: nodeBuffer })
    let content = result.value
    let warning: string | undefined

    // 如果内容太少或为空，可能是因为DOC格式不完全兼容
    if (!content || content.trim().length < 10) {
      // 尝试备用解析方法
      content = await parseDocFallback(buffer)
      warning = "DOC格式解析可能不完整，建议转换为DOCX格式以获得最佳效果"
    }

    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length
    const paragraphCount = content.split(/\n\s*\n/).length

    return {
      content,
      warning,
      metadata: {
        wordCount,
        paragraphCount,
        extractedImages: 0,
        parseEngine: "mammoth.js + fallback",
      },
    }
  } catch (error) {
    // 如果mammoth完全失败，使用备用方法
    try {
      const content = await parseDocFallback(buffer)
      return {
        content,
        warning: "使用备用解析器处理DOC文件，建议转换为DOCX格式",
        metadata: {
          wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
          paragraphCount: content.split(/\n\s*\n/).length,
          extractedImages: 0,
          parseEngine: "fallback parser",
        },
      }
    } catch (fallbackError) {
      throw new Error(`DOC解析失败: ${error instanceof Error ? error.message : "未知错误"}`)
    }
  }
}

// DOC文件备用解析方法 - 改进版
const parseDocFallback = async (buffer: ArrayBuffer): Promise<string> => {
  const uint8Array = new Uint8Array(buffer)
  const textSegments: string[] = []
  
  // DOC文件的文本通常存储在特定的数据结构中
  // 我们需要寻找连续的可读文本段落
  
  let i = 0
  while (i < uint8Array.length - 10) {
    // 寻找文本段落的开始
    let textStart = -1
    let consecutiveReadable = 0
    
    // 检查是否有连续的可读字符
    for (let j = i; j < Math.min(i + 100, uint8Array.length); j++) {
      const char = uint8Array[j]
      
      if ((char >= 32 && char <= 126) || // ASCII可打印字符
          (char >= 128 && char <= 255) || // 扩展ASCII
          char === 9 || char === 10 || char === 13) { // 制表符、换行符
        if (textStart === -1) textStart = j
        consecutiveReadable++
      } else if (char === 0) {
        // 空字符可能是文本分隔符，但不重置计数
        continue
      } else {
        // 遇到不可读字符，重置
        if (consecutiveReadable >= 10) {
          // 如果已经有足够的可读字符，提取这段文本
          break
        }
        textStart = -1
        consecutiveReadable = 0
      }
    }
    
    // 如果找到了足够长的可读文本段
    if (consecutiveReadable >= 10 && textStart !== -1) {
      let textEnd = textStart + consecutiveReadable
      
      // 扩展文本段，直到遇到大量不可读字符
      let nonReadableCount = 0
      while (textEnd < uint8Array.length && nonReadableCount < 5) {
        const char = uint8Array[textEnd]
        if ((char >= 32 && char <= 126) || 
            (char >= 128 && char <= 255) ||
            char === 9 || char === 10 || char === 13) {
          nonReadableCount = 0
        } else if (char === 0) {
          // 空字符不计入不可读计数
        } else {
          nonReadableCount++
        }
        textEnd++
      }
      
      // 提取文本段
      const textBytes = uint8Array.slice(textStart, textEnd - nonReadableCount)
      let text = ""
      
      for (let k = 0; k < textBytes.length; k++) {
        const char = textBytes[k]
        if (char >= 32 && char <= 126) {
          text += String.fromCharCode(char)
        } else if (char === 9) {
          text += " "
        } else if (char === 10 || char === 13) {
          text += "\n"
        } else if (char === 0) {
          // 跳过空字符
          continue
        } else if (char >= 128 && char <= 255) {
          // 尝试处理扩展ASCII字符
          try {
            text += String.fromCharCode(char)
          } catch {
            // 如果转换失败，跳过
          }
        }
      }
      
      // 清理和验证提取的文本
      text = text.replace(/\s+/g, " ").trim()
      
      // 只保留包含有意义内容的文本段
      if (text.length >= 5 && 
          /[a-zA-Z\u4e00-\u9fff]/.test(text) && 
          !text.match(/^[\s\W]*$/)) {
        textSegments.push(text)
      }
      
      i = textEnd
    } else {
      i += 50 // 跳过一段距离继续搜索
    }
  }
  
  // 合并和清理所有文本段
  let finalText = textSegments
    .filter(segment => {
      // 过滤掉过短或无意义的段落
      return segment.length >= 3 && 
             /[a-zA-Z\u4e00-\u9fff]/.test(segment) &&
             !segment.match(/^[\s\W\d]*$/) && // 不是纯符号或数字
             !segment.match(/^[a-zA-Z]{1,2}$/) // 不是单个或两个字母
    })
    .map(segment => {
      // 进一步清理每个段落
      return segment
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // 移除控制字符
        .replace(/\s+/g, " ") // 合并空白字符
        .trim()
    })
    .filter(segment => segment.length >= 3)
    .join("\n\n")
  
  if (!finalText || finalText.length < 10) {
    throw new Error("无法从DOC文件中提取有效文本内容，建议转换为DOCX格式")
  }
  
  return finalText
}

// 解析PPTX文件 - 使用JSZip
const parsePptx = async (buffer: ArrayBuffer): Promise<{ content: string; metadata: any }> => {
  try {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(buffer)

    const slideTexts: string[] = []
    let slideCount = 0

    // 获取所有幻灯片文件
    const slideFiles = Object.keys(zipContent.files)
      .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
      .sort((a, b) => {
        const aNum = Number.parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || "0")
        const bNum = Number.parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || "0")
        return aNum - bNum
      })

    for (const slideFile of slideFiles) {
      try {
        const slideXml = await zipContent.files[slideFile].async("text")
        const slideText = extractTextFromPptxXml(slideXml)
        if (slideText.trim()) {
          slideCount++
          slideTexts.push(`=== 幻灯片 ${slideCount} ===\n${slideText}\n`)
        }
      } catch (slideError) {
        console.warn(`解析幻灯片 ${slideFile} 时出错:`, slideError)
      }
    }

    // 尝试提取备注内容
    const notesFiles = Object.keys(zipContent.files).filter(
      (name) => name.startsWith("ppt/notesSlides/notesSlide") && name.endsWith(".xml"),
    )

    for (const notesFile of notesFiles) {
      try {
        const notesXml = await zipContent.files[notesFile].async("text")
        const notesText = extractTextFromPptxXml(notesXml)
        if (notesText.trim()) {
          const slideNum = notesFile.match(/notesSlide(\d+)\.xml$/)?.[1] || "?"
          slideTexts.push(`=== 幻灯片 ${slideNum} 备注 ===\n${notesText}\n`)
        }
      } catch (notesError) {
        console.warn(`解析备注 ${notesFile} 时出错:`, notesError)
      }
    }

    const content = slideTexts.join("\n")
    const wordCount = content.split(/\s+/).filter((word) => word.length > 0).length

    return {
      content,
      metadata: {
        wordCount,
        paragraphCount: slideCount,
        extractedImages: 0,
        parseEngine: "JSZip + XML parser",
      },
    }
  } catch (error) {
    throw new Error(`PPTX解析失败: ${error instanceof Error ? error.message : "未知错误"}`)
  }
}

// 解析PPT文件 - 尝试转换后使用JSZip
const parsePptWithConversion = async (
  buffer: ArrayBuffer,
  filename: string,
): Promise<{ content: string; metadata: any; warning?: string }> => {
  try {
    // 首先尝试将PPT当作ZIP文件处理（某些PPT可能是压缩格式）
    const JSZip = (await import("jszip")).default
    try {
      const zip = new JSZip()
      const zipContent = await zip.loadAsync(buffer)

      // 检查是否包含PowerPoint相关文件
      const pptFiles = Object.keys(zipContent.files).filter((name) => name.includes("ppt") || name.includes("slide"))

      if (pptFiles.length > 0) {
        // 尝试按PPTX方式解析
        const result = await parsePptx(buffer)
        return {
          ...result,
          warning: "PPT文件可能包含压缩内容，已尝试解析",
          metadata: {
            ...result.metadata,
            parseEngine: "JSZip (PPT as ZIP)",
          },
        }
      }
    } catch (zipError) {
      // ZIP解析失败，继续使用备用方法
    }

    // 使用改进的二进制解析方法
    const content = await parsePptBinary(buffer)

    return {
      content,
      warning: "PPT格式解析可能不完整，建议转换为PPTX格式以获得最佳效果",
      metadata: {
        wordCount: content.split(/\s+/).filter((word) => word.length > 0).length,
        paragraphCount: content.split(/\n\s*\n/).length,
        extractedImages: 0,
        parseEngine: "Binary parser with heuristics",
      },
    }
  } catch (error) {
    throw new Error(`PPT解析失败: ${error instanceof Error ? error.message : "未知错误"}`)
  }
}

// PPT二进制解析（改进版）
const parsePptBinary = async (buffer: ArrayBuffer): Promise<string> => {
  const uint8Array = new Uint8Array(buffer)
  const textSegments: string[] = []
  let currentText = ""

  // PPT文件中的文本通常以特定模式存储
  for (let i = 0; i < uint8Array.length - 1; i++) {
    const char = uint8Array[i]
    const nextChar = uint8Array[i + 1]

    // 检查Unicode字符
    if (char >= 32 && char <= 126) {
      currentText += String.fromCharCode(char)
    } else if (char === 0 && nextChar >= 32 && nextChar <= 126 && currentText.length > 0) {
      // 可能是Unicode文本的开始
      if (currentText.trim().length > 2) {
        textSegments.push(currentText.trim())
      }
      currentText = ""
    } else if (char === 10 || char === 13) {
      currentText += "\n"
    }
  }

  if (currentText.trim()) {
    textSegments.push(currentText.trim())
  }

  // 过滤和清理文本段
  const cleanedSegments = textSegments
    .filter((segment) => {
      // 过滤掉太短的段落和可能的垃圾数据
      return segment.length > 3 && /[a-zA-Z\u4e00-\u9fff]/.test(segment) && !segment.match(/^[^a-zA-Z\u4e00-\u9fff]*$/)
    })
    .map((segment, index) => {
      // 为每个文本段添加幻灯片标识
      if (segment.length > 10) {
        return `=== 内容片段 ${index + 1} ===\n${segment}`
      }
      return segment
    })

  const content = cleanedSegments.join("\n\n")

  if (!content || content.length < 10) {
    throw new Error("无法从PPT文件中提取有效文本内容")
  }

  return content
}

// 从PPTX XML中提取文本内容（改进版）
const extractTextFromPptxXml = (xml: string): string => {
  // 更精确的XML文本提取
  const textElements: string[] = []

  // 提取 <a:t> 标签中的文本（主要文本内容）
  const textMatches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/g)
  if (textMatches) {
    textMatches.forEach((match) => {
      const text = match.replace(/<a:t[^>]*>/, "").replace(/<\/a:t>/, "")
      if (text.trim()) {
        textElements.push(decodeXmlEntities(text.trim()))
      }
    })
  }

  // 提取其他可能的文本标签
  const otherTextMatches = xml.match(/<a:r[^>]*>.*?<\/a:r>/g)
  if (otherTextMatches) {
    otherTextMatches.forEach((match) => {
      const innerText = match.match(/<a:t[^>]*>(.*?)<\/a:t>/)
      if (innerText && innerText[1] && innerText[1].trim()) {
        const text = decodeXmlEntities(innerText[1].trim())
        if (!textElements.includes(text)) {
          textElements.push(text)
        }
      }
    })
  }

  return textElements.join("\n")
}

// 解码XML实体
const decodeXmlEntities = (text: string): string => {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
}

// 检测是否为乱码文本（更宽容的检测）
function isGarbledText(text: string): boolean {
  if (!text || text.length < 5) return true

  // 检查有效字符比例
  const totalChars = text.length
  const validChars = (text.match(/[\u4e00-\u9fa5a-zA-Z0-9\s.,!?;:'"()[\]{}]/g) || []).length
  const validRatio = validChars / totalChars

  // 检查可读字符数量
  const chineseCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishCount = (text.match(/[a-zA-Z]/g) || []).length
  const readableCount = chineseCount + englishCount

  // 只有在有效比例很低且可读字符很少时才判定为乱码
  return validRatio < 0.2 && readableCount < 20
}

// 清理提取的文本
function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, " ") // 合并空白字符
    .replace(/[\x00-\x1F\x7F]/g, "") // 移除控制字符
    .replace(/([.,!?;:])\1+/g, "$1") // 移除重复标点
    .replace(/\b\w+\.(jpg|jpeg|png|gif|bmp|svg|tiff|webp)\b/gi, "") // 移除图片文件名
    .replace(/\b(rId\d+|rel\d+|image\d+|picture\d+)\b/gi, "") // 移除图片标识符
    .replace(/<[^>]*>/g, "") // 移除XML标签
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s.,!?;:'"()[\]{}]{8,}/g, " ") // 移除长串特殊字符
    .replace(/\b[A-Za-z0-9]{25,}\b/g, "") // 移除超长随机字符串
    .trim()
}
