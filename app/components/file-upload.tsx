"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, Loader2, X, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploadProps {
  onKnowledgePointsExtracted: (points: string) => void
  openaiConfig: { apiKey: string; baseUrl: string; model: string } | null
}

export function FileUpload({ onKnowledgePointsExtracted, openaiConfig }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [extractedText, setExtractedText] = useState("")
  const [isExtracting, setIsExtracting] = useState(false)
  const [parseError, setParseError] = useState("")
  const [showFullText, setShowFullText] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B"
    const k = 1024
    const sizes = ["B", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      "application/vnd.ms-powerpoint", // .ppt
      "application/pdf", // .pdf
      "text/plain", // .txt
    ]

    if (!allowedTypes.includes(file.type)) {
      alert("请上传支持的文件格式：Word文档(.docx, .doc)、PowerPoint(.pptx, .ppt)、PDF(.pdf)或文本文件(.txt)")
      return
    }

    // 检查文件大小（限制为100MB）
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      alert(`文件大小不能超过100MB，当前文件大小：${formatFileSize(file.size)}`)
      return
    }

    setUploadedFile(file)
    setIsUploading(true)
    setParseError("")
    setExtractedText("")

    try {
      let text = ""

      if (file.type === "text/plain") {
        // 处理文本文件，使用UTF-8编码
        text = await file.text()
      } else {
        // 对于二进制文件（Word、PPT），我们需要发送到服务器端处理
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/parse-document", {
          method: "POST",
          body: formData,
        })

        // 安全地解析响应
        let data
        try {
          const contentType = response.headers.get("content-type") || ""
          if (contentType.includes("application/json")) {
            data = await response.json()
          } else {
            // 如果不是JSON响应，获取文本内容
            const textResponse = await response.text()
            throw new Error(textResponse || "服务器返回非JSON响应")
          }
        } catch (jsonError) {
          console.error("解析响应失败:", jsonError)
          throw new Error("服务器响应格式错误")
        }

        if (!response.ok) {
          throw new Error(data?.error || "文档解析失败")
        }

        if (data?.error) {
          throw new Error(data.error)
        }

        text = data?.text || ""
      }

      if (!text.trim()) {
        setParseError("未能从文档中提取到文本内容，请检查文档是否包含可读文本")
        return
      }

      // 限制文本长度为30k字符
      const maxTextLength = 30000
      if (text.length > maxTextLength) {
        text = text.substring(0, maxTextLength)
        setParseError(`文本内容过长，已截取前${maxTextLength}个字符`)
      }

      // 清理和处理文本
      const cleanText = text
        .replace(/\s+/g, " ") // 合并多个空白字符
        .trim()

      setExtractedText(cleanText)
    } catch (error) {
      console.error("文件处理失败:", error)
      setParseError(error instanceof Error ? error.message : "文件处理失败，请重试")
    } finally {
      setIsUploading(false)
    }
  }

  const handleExtractKnowledgePoints = async () => {
    if (!extractedText || !openaiConfig?.apiKey) {
      alert("请先上传文件并配置OpenAI")
      return
    }

    setIsExtracting(true)

    try {
      const response = await fetch("/api/extract-knowledge-points", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: extractedText,
          config: openaiConfig,
        }),
      })

      if (!response.ok) {
        throw new Error("提取知识点失败")
      }

      const data = await response.json()
      onKnowledgePointsExtracted(data.knowledgePoints)

      // 清理状态
      setUploadedFile(null)
      setExtractedText("")
      setParseError("")
    } catch (error) {
      console.error("提取知识点失败:", error)
      alert("提取知识点失败，请重试")
    } finally {
      setIsExtracting(false)
    }
  }

  const handleClear = () => {
    setUploadedFile(null)
    setExtractedText("")
    setParseError("")
  }

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept=".docx,.doc,.pptx,.ppt,.pdf,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              ) : (
                <Upload className="w-8 h-8 text-gray-400" />
              )}
              <p className="text-sm text-gray-600">{isUploading ? "正在处理文件..." : "点击上传文档"}</p>
              <p className="text-xs text-gray-500">请上传支持的文件格式：Word文档(.docx, .doc)、PowerPoint(.pptx, .ppt)、PDF(.pdf)或文本文件(.txt)</p>
              <p className="text-xs text-gray-400">文件大小限制：100MB，提取文本限制：30K字符</p>
            </div>
          </label>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">{uploadedFile.name}</span>
                <span className="text-xs text-gray-500">({formatFileSize(uploadedFile.size)})</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {parseError && (
              <Alert className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{parseError}</AlertDescription>
              </Alert>
            )}

            {extractedText && (
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-600 font-medium">文档内容：</p>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-xs">
                        {extractedText.length}/30,000 字符
                        {extractedText.length >= 30000 && " (已达上限)"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFullText(!showFullText)}
                        className="text-xs h-6 px-2"
                      >
                        {showFullText ? "收起" : "展开全部"}
                      </Button>
                    </div>
                  </div>
                  <div
                    className={`text-gray-800 whitespace-pre-wrap leading-relaxed overflow-y-auto ${
                      showFullText ? "max-h-96" : "max-h-40"
                    }`}
                  >
                    {showFullText
                      ? extractedText
                      : `${extractedText.substring(0, 800)}${extractedText.length > 800 ? "..." : ""}`}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleExtractKnowledgePoints}
                    disabled={isExtracting || !openaiConfig?.apiKey}
                    size="sm"
                    className="flex-1"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        正在提取知识点...
                      </>
                    ) : (
                      "提取知识点"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(extractedText)
                      alert("文本已复制到剪贴板")
                    }}
                  >
                    复制文本
                  </Button>
                </div>

                {!openaiConfig?.apiKey && (
                  <Alert>
                    <AlertDescription className="text-xs">请先配置OpenAI API以使用知识点提取功能</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
