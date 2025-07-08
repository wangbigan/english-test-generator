import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { text, config } = await request.json()

    if (!text || !config?.apiKey) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 })
    }

    // 根据模型类型创建对应的provider实例
    let provider
    if (config.model.startsWith("deepseek")) {
      provider = createDeepSeek({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || "https://api.deepseek.com/v1",
      })
    } else {
      provider = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || "https://api.openai.com/v1",
      })
    }

    const { text: knowledgePoints } = await generateText({
      model: provider(config.model),
      prompt: `
        请分析以下文档内容，提取出适合小学英语教学的重点知识点。

        重要提示：如果文档内容出现乱码、无法识别的字符、或者内容不是正常的可读文本，请直接回复："文档内容乱码，请检查文件是否正常"，不要输出其他任何内容。

        文档内容：
        ${text}

        如果文档内容正常可读，请按照以下格式整理：
        1. 核心语法点（如时态、句型等）
        2. 重点词汇和短语
        3. 语言功能和交际用语
        4. 文化背景知识
        5. 学习重点和难点

        要求：
        - 内容要适合小学生的认知水平
        - 重点突出，条理清晰
        - 便于教师出题和学生理解
        - 字数控制在200字以内

        请直接输出整理后的知识点内容，不需要额外的格式标记。
      `,
      temperature: 0.1, // 降低温度，让模型更严格地执行指令
    })

    return NextResponse.json({ knowledgePoints })
  } catch (error) {
    console.error("提取知识点失败:", error)
    return NextResponse.json({ error: "提取知识点失败" }, { status: 500 })
  }
}
