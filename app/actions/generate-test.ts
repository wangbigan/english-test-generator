import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { buildSamplePaper } from "./build-sample-paper"
import { getFinalPromptTemplate } from "../components/prompt-config-dialog"

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
    trueFalse: { count: number; score: number }
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
  // 使用getFinalPromptTemplate函数获取完整的prompt模板（包含JSON示例）
  const template = getFinalPromptTemplate(promptConfig || null)

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

    // 判断题
    trueFalseCount: config.questionTypes.trueFalse.count.toString(),
    trueFalseScore: config.questionTypes.trueFalse.score.toString(),
    trueFalseTotalScore: (config.questionTypes.trueFalse.count * config.questionTypes.trueFalse.score).toString(),
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
