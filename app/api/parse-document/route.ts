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
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "不支持的文件格式" }, { status: 400 })
    }

    // 检查文件大小（100MB）
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "文件大小超过100MB限制" }, { status: 400 })
    }

    let result: { content: string; metadata: any; warning?: string }

    try {
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer()

      // 根据文件类型选择解析方法
      if (file.type.includes("presentationml") || file.name.toLowerCase().endsWith(".pptx")) {
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

      // 限制文本长度为10k字符
      const maxTextLength = 10000
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
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
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
    // 尝试使用mammoth解析DOC文件
    const result = await mammoth.extractRawText({ arrayBuffer: buffer })
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

// DOC文件备用解析方法
const parseDocFallback = async (buffer: ArrayBuffer): Promise<string> => {
  // 使用更智能的文本提取算法
  const uint8Array = new Uint8Array(buffer)
  const textChunks: string[] = []
  let currentChunk = ""

  for (let i = 0; i < uint8Array.length - 1; i++) {
    const char = uint8Array[i]
    const nextChar = uint8Array[i + 1]

    // 检查是否为可打印字符
    if (char >= 32 && char <= 126) {
      currentChunk += String.fromCharCode(char)
    } else if (char === 0 && currentChunk.length > 3) {
      // 遇到空字符且当前块有内容时，保存块
      textChunks.push(currentChunk.trim())
      currentChunk = ""
    } else if (char === 10 || char === 13) {
      currentChunk += "\n"
    }
  }

  if (currentChunk.trim()) {
    textChunks.push(currentChunk.trim())
  }

  // 过滤和清理文本块
  const cleanedChunks = textChunks
    .filter((chunk) => chunk.length > 2 && /[a-zA-Z\u4e00-\u9fff]/.test(chunk))
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())

  const content = cleanedChunks.join("\n\n")

  if (!content || content.length < 10) {
    throw new Error("无法从DOC文件中提取有效文本内容")
  }

  return content
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
