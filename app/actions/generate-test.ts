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
      const { systemMessage, userMessage } = buildMessages(config, promptConfig)
      const prompt = systemMessage + "\n\n" + userMessage
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
      // 对于Kimi、GPT等其他模型，都使用OpenAI兼容格式
      provider = createOpenAI({
        apiKey: openaiConfig.apiKey,
        baseURL: openaiConfig.baseUrl || "https://api.openai.com/v1",
      })
    }

    // 构建system和user消息
    const { systemMessage, userMessage } = buildMessages(config, promptConfig)

    // 根据模型类型设置不同的参数
    let generateParams: any = {
      model: provider(openaiConfig.model),
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
    }

    // 为不同模型设置合适的token限制
    if (openaiConfig.model.startsWith("kimi") || openaiConfig.model.startsWith("moonshot") || openaiConfig.model.startsWith("Doubao")) {
      // Kimi和豆包模型使用max_tokens而不是maxTokens
      generateParams.max_tokens = 8000
    } else {
      generateParams.maxTokens = 8000
    }

    // 添加调试信息
    console.log('[API Call] Model:', openaiConfig.model)
    console.log('[API Call] BaseURL:', openaiConfig.baseUrl)
    console.log('[API Call] Params:', JSON.stringify(generateParams, null, 2))

    const { text } = await generateText(generateParams)

    const content = text
    console.log('[API Response] Success, content length:', content?.length || 0)

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
      return { test: result, prompt: systemMessage + "\n\n" + userMessage, rawResponse: cleanedText }
    } catch (error) {
      console.error("Failed to parse JSON:", error)
      console.error("Raw response from API:", cleanedText)
      throw new Error("Failed to parse JSON from API response.")
    }
  } catch (error: any) {
    console.error("Error generating test paper:", error)
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      model: openaiConfig.model,
      baseUrl: openaiConfig.baseUrl
    })

    // 特殊处理网络错误
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.error('Network error detected. This might be due to:')
      console.error('1. Incorrect Base URL for the model')
      console.error('2. API endpoint not accessible')
      console.error('3. CORS issues')
      console.error('4. Invalid API key')
      
      if (openaiConfig.model.startsWith('kimi') || openaiConfig.model.startsWith('moonshot')) {
        console.error('For Kimi models, ensure Base URL is: https://api.moonshot.cn/v1')
      } else if (openaiConfig.model.startsWith('Doubao')) {
        console.error('For Doubao models, ensure Base URL is: https://ark.cn-beijing.volces.com/api/v3/chat/completions')
      }
    }

    // 如果API调用失败，返回示例试卷而不是抛出错误
    console.warn("API call failed, falling back to sample paper")
    const { systemMessage, userMessage } = buildMessages(config, promptConfig)
    const prompt = systemMessage + "\n\n" + userMessage
    return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
  }
}

export function buildMessages(config: TestConfig, promptConfig?: PromptConfig): { systemMessage: string; userMessage: string } {
  // System消息：JSON格式限定和风险控制
  const systemMessage = `你是一名资深的小学英语老师，擅长按照配置和要求生成高质量的英语试卷或题目。请严格遵循以下要求：

## 输出格式要求
- 必须严格按照JSON示例格式输出，不要包含任何其他内容
- 务必确保在token长度限制内输出完整JSON结构，且语法正确。
- 在满足上述要求的前提下，尽可能保证生成的题目数量最大化满足各题型要求，如实在不能满足，在json的questionNumber字段附加注视说明

## 内容要求：
- 题目设计必须确保正确答案只有一个，且不能出现二义性
- 材料、题干和选项中涉及数字部分都尽可能用英文单词，避免用数字表示

## 内容安全要求
- 生成的内容必须适合小学生，积极健康
- 不得包含任何政治敏感、宗教争议、暴力、色情等不当内容
- 避免涉及种族、性别、地域等歧视性内容
- 确保所有题目内容符合教育规范和社会主义核心价值观
`

  // 获取prompt模板（包含JSON示例）
  const template = getFinalPromptTemplate(promptConfig || null)
  
  // 准备变量替换的数据
  const variables = {
    grade: getGradeName(config.grade),
    difficulty: getDifficultyName(config.difficulty),
    theme: config.theme,
    knowledgePoints: config.knowledgePoints,
    totalScore: config.totalScore.toString(),
    totalQuestions: (
      config.questionTypes.listening.count +
      config.questionTypes.multipleChoice.count +
      config.questionTypes.fillInBlank.count +
      config.questionTypes.reading.count +
      config.questionTypes.writing.count +
      config.questionTypes.trueFalse.count
    ).toString(),

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

  // 替换Prompt模板中的变量
  let userMessage = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    userMessage = userMessage.replace(regex, value)
  })

  return { systemMessage, userMessage }
}

export function buildPrompt(config: TestConfig, promptConfig?: PromptConfig): string {
  const { systemMessage, userMessage } = buildMessages(config, promptConfig)
  return systemMessage + "\n\n" + userMessage
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
