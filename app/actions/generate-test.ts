import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { buildSamplePaper } from "./build-sample-paper"

interface TestConfig {
  grade: string
  difficulty: string
  theme: string
  knowledgePoints: string
  totalScore: number
  questionTypes: {
    multipleChoice: { count: number; score: number }
    fillInBlank: { count: number; score: number }
    reading: { count: number; score: number }
    writing: { count: number; score: number }
    listening: { count: number; score: number }
  }
}

interface OpenAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export async function generateTestPaper(config: TestConfig, openaiConfig: OpenAIConfig) {
  try {
    if (!openaiConfig?.apiKey?.trim()) {
      console.warn("API Key missing – falling back to local sample paper")
      return buildSamplePaper(config)
    }

    // 根据模型类型创建对应的provider实例
    let provider
    if (openaiConfig.model.startsWith("deepseek")) {
      provider = createDeepSeek({
        apiKey: openaiConfig.apiKey,
        baseURL: openaiConfig.baseUrl || "https://api.deepseek.com/v1",
      })
    } else {
      provider = createOpenAI({
        apiKey: openaiConfig.apiKey,
        baseURL: openaiConfig.baseUrl || "https://api.openai.com/v1",
      })
    }

    const { text } = await generateText({
      model: provider(openaiConfig.model),
      prompt: `
      请你根据以下要求，生成一份小学英语试卷，返回 JSON 格式数据：

      - 年级: ${config.grade}
      - 难度: ${config.difficulty}
      - 主题: ${config.theme}
      - 重点知识点: ${config.knowledgePoints}
      - 总分: ${config.totalScore}

      题型配比（按以下顺序出题）:
      1. 听力题: ${config.questionTypes.listening.count}道，每题${config.questionTypes.listening.score}分
      2. 选择题: ${config.questionTypes.multipleChoice.count}道，每题${config.questionTypes.multipleChoice.score}分（每题必须有4个选项）
      3. 填空题: ${config.questionTypes.fillInBlank.count}道，每题${config.questionTypes.fillInBlank.score}分
      4. 阅读理解: ${config.questionTypes.reading.count}道，每题${config.questionTypes.reading.score}分
      5. 写作题: ${config.questionTypes.writing.count}道，每题${config.questionTypes.writing.score}分

      特殊要求：
      1. 听力题需要生成听力材料(listeningMaterial)，包含完整的听力文本
      2. 选择题必须有4个选项，选项内容不要包含A、B、C、D标签，只写纯内容
      3. 每道题都需要标准答案(answer)和详细解析(explanation)
      4. 题目顺序：听力题在最前面，写作题在最后面
      5. 生成完整的答案解析页面(answerKey)

      试卷结构:
      - 试卷包含标题(title)，副标题(subtitle)，考试说明(instructions)，总分(totalScore)
      - 听力材料(listeningMaterial)：完整的听力文本内容
      - 试卷分为多个section，按顺序：听力题、选择题、填空题、阅读理解、写作题
      - 每个section包含题型(type)，标题(title)，题目列表(questions)
      - 每道题包含题目内容(question)，分值(points)，id，答案(answer)，解析(explanation)
      - 选择题必须包含4个选项(options)，格式为["选项1内容", "选项2内容", "选项3内容", "选项4内容"]，不要包含A、B、C、D标签
      - 答案解析页面(answerKey)：包含所有题目的答案和解析

      JSON 示例:
      \`\`\`json
      {
        "title": "一年级英语中等测试",
        "subtitle": "Unit 1-3",
        "instructions": "请认真阅读题目，仔细作答。听力题请仔细听录音。",
        "totalScore": 100,
        "listeningMaterial": "Hello, my name is Tom. I am seven years old. I like apples and bananas. My favorite color is blue. I have a pet dog named Max.",
        "sections": [
          {
            "type": "listening",
            "title": "一、听力题",
            "questions": [
              {
                "id": 1,
                "question": "What is the boy's name?",
                "answer": "Tom",
                "explanation": "从听力材料中可以听到'Hello, my name is Tom'，所以答案是Tom。",
                "points": 5
              }
            ]
          },
          {
            "type": "multipleChoice",
            "title": "二、选择题",
            "questions": [
              {
                "id": 2,
                "question": "What is your name?",
                "options": ["My name is Tom", "I am a student", "Nice to meet you", "How are you"],
                "answer": "A",
                "explanation": "询问姓名的标准回答是'My name is...'，所以选择A。",
                "points": 5
              }
            ]
          },
          {
            "type": "fillInBlank",
            "title": "三、填空题",
            "questions": [
              {
                "id": 3,
                "question": "I _______ a teacher.",
                "answer": "am",
                "explanation": "主语是I，be动词应该用am，构成'I am a teacher'。",
                "points": 5
              }
            ]
          }
        ],
        "answerKey": [
          {
            "id": 1,
            "answer": "Tom",
            "explanation": "从听力材料中可以听到'Hello, my name is Tom'，所以答案是Tom。"
          },
          {
            "id": 2,
            "answer": "A",
            "explanation": "询问姓名的标准回答是'My name is...'，所以选择A。"
          }
        ]
      }
      \`\`\`
    `,
      temperature: 0.7,
    })

    const content = text

    if (!content) {
      throw new Error("No content received from API.")
    }

    // 把 \`\`\`json … \`\`\` 或 \`\`\` … \`\`\` 包裹去掉
    const cleanedText = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    try {
      const result = JSON.parse(cleanedText)
      return result
    } catch (error) {
      console.error("Failed to parse JSON:", error)
      console.error("Raw response from API:", cleanedText)
      throw new Error("Failed to parse JSON from API response.")
    }
  } catch (error: any) {
    console.error("Error generating test paper:", error)

    // 如果API调用失败，返回示例试卷而不是抛出错误
    console.warn("API call failed, falling back to sample paper")
    return buildSamplePaper(config)
  }
}
