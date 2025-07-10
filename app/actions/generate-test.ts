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

interface PromptConfig {
  selectedTemplate: string
  customTemplate: string
  variables: Record<string, string>
}

export async function generateTestPaper(config: TestConfig, openaiConfig: OpenAIConfig, promptConfig?: PromptConfig) {
  try {
    if (!openaiConfig?.apiKey?.trim()) {
      console.warn("API Key missing – falling back to local sample paper")
      // 构建prompt
      const prompt = buildPrompt(config, promptConfig)
      return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
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

    // 构建prompt
    const prompt = buildPrompt(config, promptConfig)

    const { text } = await generateText({
      model: provider(openaiConfig.model),
      prompt,
      temperature: 0.7,
    })

    const content = text

    if (!content) {
      throw new Error("No content received from API.")
    }

    // 把 ```json … ``` 或 ``` … ``` 包裹去掉
    const cleanedText = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    // 日志：输出大模型原始返回和清理后的内容
    console.log("[AI Raw Response]", content);
    console.log("[AI Cleaned Text]", cleanedText);

    try {
      // 日志：每次解析前输出内容
      console.log("[AI Parse Input]", cleanedText);
      const result = safeJsonParse(cleanedText);
      return { test: result, prompt, rawResponse: cleanedText }
    } catch (error) {
      console.error("Failed to parse JSON:", error)
      console.error("Raw response from API:", cleanedText)
      throw new Error("Failed to parse JSON from API response.")
    }
  } catch (error: any) {
    console.error("Error generating test paper:", error)

    // 如果API调用失败，返回示例试卷而不是抛出错误
    console.warn("API call failed, falling back to sample paper")
    const prompt = buildPrompt(config, promptConfig)
    return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
  }
}

export function buildPrompt(config: TestConfig, promptConfig?: PromptConfig): string {
  // 默认prompt模板
  const defaultPrompt = `请你根据以下要求，生成一份小学英语试卷，返回 JSON 格式数据：

- 年级: {{grade}}
- 难度: {{difficulty}}
- 主题: {{theme}}
- 重点知识点: {{knowledgePoints}}
- 总分: {{totalScore}}

题型配比（按以下顺序出题）:
1. 听力题: {{listeningCount}}道，每题{{listeningScore}}分
2. 选择题: {{multipleChoiceCount}}道，每题{{multipleChoiceScore}}分（每题必须有4个选项）
3. 填空题: {{fillInBlankCount}}道，每题{{fillInBlankScore}}分
4. 阅读理解: {{readingCount}}道，每题{{readingScore}}分
5. 写作题: {{writingCount}}道，每题{{writingScore}}分

特殊要求：
1. 听力题需要生成听力材料(listeningMaterial)，包含完整的听力文本
2. 选择题必须有3个选项，选项内容不要包含A、B、C标签，只写纯内容
3. 除写作题以外，其他题目都需要标准答案(answer)和详细解析(explanation)
4. 写作题不需要答案(answer)，解析(explanation)中写评分标准
5. 题目顺序：听力题在最前面，写作题在最后面
6. 生成完整的答案解析页面(answerKey)

试卷结构:
- 试卷包含标题(title)，副标题(subtitle)，考试说明(instructions)，总分(totalScore)
- 听力材料(listeningMaterial)：完整的听力文本内容
- 试卷分为多个section，按顺序：听力题、选择题、填空题、阅读理解、写作题
- 每个section包含题型(type)，标题(title)，题目列表(questions)
- 每道题包含题目内容(question)，分值(points)，id，答案(answer)，解析(explanation)
- 选择题必须包含3个选项(options)，格式为["选项1内容", "选项2内容", "选项3内容", "选项4内容"]，不要包含A、B、C、D标签
- 答案解析页面(answerKey)：包含所有题目的答案和解析

严格按照json格式输出，不要输出其他内容。

JSON 示例:
\`\`\`json
{
  "title": "一年级英语中等测试",
  "subtitle": "Unit 1-3",
  "instructions": "请认真阅读题目，仔细作答。听力题请仔细听录音。",
  "totalScore": 100,
  "sections": [
    {
      "type": "listening",
      "title": "一、听力题（选择题形式）",
      "listeningMaterial": "Hello, my name is Tom. I am seven years old. I like apples and bananas. My favorite color is blue. I have a pet dog named Max.",
      "questions": [
        {
          "id": 1,
          "question": "What is the boy's name?",
          "answer": "C",
          "options": ["Jack", "Mike", "Tom"],
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
          "options": ["My name is Tom", "I am a student", "Nice to meet you"],
          "answer": "A",
          "explanation": "询问姓名的标准回答是'My name is...'，所以选择A。",
          "points": 5
        }
      ]
    },
    {
      "type": "fillInBlank",
      "title": "二、填空题",
      "questions": [
        {
          "id": 3,
          "question": "I ___ a student.",
          "answer": "am",
          "explanation": "主语是I，be动词应该用am。",
          "points": 5
        }
      ]
    },
    {
      "type": "reading",
      "title": "三、阅读理解(选择题形式)",
      "readingMaterial": "I am a student. I like apples. My favorite color is blue. I have a pet dog named Max.",
      "questions": [
        {
          "id": 4,
          "question": "What is I like?",
          "options": ["I like apples", "I like oranges", "I like pears"],
          "answer": "A",
          "explanation": "从阅读材料中可以找到答案。",
          "points": 5
        }
      ]
    },
    {
      "type": "writing",
      "title": "四、写作题",
      "question": "Write a short essay about your favorite color.",
      "explanation": "评分标准：\n1. 内容完整，符合要求\n2. 语法正确，表达清晰\n3. 格式规范，无错别字\n4. 同时满足上述3点要求的，每个句子得一分",
      "points": 5
    }
  ],
  "answerKey": [
    {
      "id": 1,
      "answer": "Tom",
      "explanation": "从听力材料中可以听到'Hello, my name is Tom'，所以答案是Tom。"
    }
  ]
}
\`\`\`
`

  // 使用用户配置的模板或默认模板
  const template = promptConfig?.customTemplate || defaultPrompt

  // 准备变量替换的数据
  const variables = {
    grade: getGradeName(config.grade),
    difficulty: getDifficultyName(config.difficulty),
    theme: config.theme,
    knowledgePoints: config.knowledgePoints,
    totalScore: config.totalScore.toString(),

    // 听力题
    listeningCount: config.questionTypes.listening.count.toString(),
    listeningScore: config.questionTypes.listening.score.toString(),
    listeningTotalScore: (config.questionTypes.listening.count * config.questionTypes.listening.score).toString(),

    // 选择题
    multipleChoiceCount: config.questionTypes.multipleChoice.count.toString(),
    multipleChoiceScore: config.questionTypes.multipleChoice.score.toString(),
    multipleChoiceTotalScore: (
      config.questionTypes.multipleChoice.count * config.questionTypes.multipleChoice.score
    ).toString(),

    // 填空题
    fillInBlankCount: config.questionTypes.fillInBlank.count.toString(),
    fillInBlankScore: config.questionTypes.fillInBlank.score.toString(),
    fillInBlankTotalScore: (config.questionTypes.fillInBlank.count * config.questionTypes.fillInBlank.score).toString(),

    // 阅读题
    readingCount: config.questionTypes.reading.count.toString(),
    readingScore: config.questionTypes.reading.score.toString(),
    readingTotalScore: (config.questionTypes.reading.count * config.questionTypes.reading.score).toString(),

    // 写作题
    writingCount: config.questionTypes.writing.count.toString(),
    writingScore: config.questionTypes.writing.score.toString(),
    writingTotalScore: (config.questionTypes.writing.count * config.questionTypes.writing.score).toString(),
  }

  // 替换模板中的变量
  let finalPrompt = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    finalPrompt = finalPrompt.replace(regex, value)
  })

  return finalPrompt
}

// 辅助函数
function getGradeName(grade: string): string {
  const gradeNames: Record<string, string> = {
    "1": "一年级",
    "2": "二年级",
    "3": "三年级",
    "4": "四年级",
    "5": "五年级",
    "6": "六年级",
  }
  return gradeNames[grade] || "小学"
}

function getDifficultyName(difficulty: string): string {
  const difficultyNames: Record<string, string> = {
    low: "基础",
    medium: "中等",
    high: "提高",
  }
  return difficultyNames[difficulty] || "标准"
}

// 防御性JSON解析，兼容大模型返回的多层字符串和非法控制字符
function safeJsonParse(text: string) {
  let cleaned = text
    // 去除字符串外部的控制字符（如直接的换行、回车、制表符）
    .replace(/[\u0000-\u001F]+/g, (m) => {
      // 只保留常见的转义字符
      if (m === '\n' || m === '\r' || m === '\t') return '';
      return '';
    })
    .trim();

  // 多层 parse，最多 3 层，防止死循环
  for (let i = 0; i < 3; i++) {
    try {
      console.log(`[AI Parse Attempt ${i+1}]`, cleaned);
      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'string') {
        cleaned = parsed;
        continue;
      }
      return parsed;
    } catch (e) {
      break;
    }
  }
  throw new Error('Failed to parse JSON from API response.');
}
