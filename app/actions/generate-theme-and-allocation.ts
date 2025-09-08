import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"

import { TestConfig, OpenAIConfig, getGradeName } from "../types/shared"
import { logAPICallStart, logAPICallSuccess, logAPICallError } from "../utils/ai-provider"

export interface ThemeScenarioWithAllocation {
  questionType: string
  scenarioTitle: string
  scenarioDescription: string
  knowledgePoints: string[]
}

export interface ThemeAndAllocationResult {
  mainTheme: string
  backgroundDescription: string
  scenarios: ThemeScenarioWithAllocation[]
  knowledgePointsCoverage: {
    total: string[]
    covered: string[]
    uncovered: string[]
  }
}

/**
 * 构建题型配置描述
 * @param questionTypes 题型配置对象
 * @returns 题型配置的文字描述
 */
function buildQuestionTypesConfig(questionTypes: TestConfig['questionTypes']): string {
  const configs = []
  
  if (questionTypes.listening.count > 0) {
    configs.push(`听力题：${questionTypes.listening.count}题，每题${questionTypes.listening.score}分`)
  }
  if (questionTypes.multipleChoice.count > 0) {
    configs.push(`选择题：${questionTypes.multipleChoice.count}题，每题${questionTypes.multipleChoice.score}分`)
  }
  if (questionTypes.fillInBlank.count > 0) {
    configs.push(`填空题：${questionTypes.fillInBlank.count}题，每题${questionTypes.fillInBlank.score}分`)
  }
  if (questionTypes.trueFalse.count > 0) {
    configs.push(`判断题：${questionTypes.trueFalse.count}题，每题${questionTypes.trueFalse.score}分`)
  }
  if (questionTypes.reading.count > 0) {
    configs.push(`阅读理解：${questionTypes.reading.count}题，每题${questionTypes.reading.score}分`)
  }
  if (questionTypes.writing.count > 0) {
    configs.push(`写作题：${questionTypes.writing.count}题，每题${questionTypes.writing.score}分`)
  }
  
  return configs.join('；')
}

/**
 * 构建动态JSON示例，只包含实际配置的题型
 * @param questionTypes 题型配置对象
 * @returns JSON示例字符串
 */
function buildDynamicJsonExample(questionTypes: TestConfig['questionTypes']): string {
  const activeScenarios = []
  
  if (questionTypes.listening.count > 0) {
    activeScenarios.push(`    {
      "questionType": "listening",
      "scenarioTitle": "听力场景标题",
      "scenarioDescription": "具体的听力场景描述，要生动有趣",
      "knowledgePoints": ["知识点1", "知识点2"]
    }`)
  }
  if (questionTypes.multipleChoice.count > 0) {
    activeScenarios.push(`    {
      "questionType": "multipleChoice",
      "scenarioTitle": "选择题场景标题",
      "scenarioDescription": "具体的选择题场景描述，要生动有趣",
      "knowledgePoints": ["知识点3", "知识点4"]
    }`)
  }
  if (questionTypes.fillInBlank.count > 0) {
    activeScenarios.push(`    {
      "questionType": "fillInBlank",
      "scenarioTitle": "填空题场景标题",
      "scenarioDescription": "具体的填空题场景描述，要生动有趣",
      "knowledgePoints": ["知识点5", "知识点6"]
    }`)
  }
  if (questionTypes.trueFalse.count > 0) {
    activeScenarios.push(`    {
      "questionType": "trueFalse",
      "scenarioTitle": "判断题场景标题",
      "scenarioDescription": "具体的判断题场景描述，要生动有趣",
      "knowledgePoints": ["知识点7", "知识点8"]
    }`)
  }
  if (questionTypes.reading.count > 0) {
    activeScenarios.push(`    {
      "questionType": "reading",
      "scenarioTitle": "阅读理解场景标题",
      "scenarioDescription": "具体的阅读理解场景描述，要生动有趣",
      "knowledgePoints": ["知识点9", "知识点10"]
    }`)
  }
  if (questionTypes.writing.count > 0) {
    activeScenarios.push(`    {
      "questionType": "writing",
      "scenarioTitle": "写作题场景标题",
      "scenarioDescription": "具体的写作题场景描述，要生动有趣",
      "knowledgePoints": ["知识点11", "知识点12"]
    }`)
  }
  
  return `{
  "mainTheme": "主题名称",
  "backgroundDescription": "主题的整体背景描述，为整个试卷提供统一的情境",
  "scenarios": [
${activeScenarios.join(',\n')}
  ],
  "knowledgePointsCoverage": {
    "total": ["所有知识点列表"],
    "covered": ["已分配的知识点"],
    "uncovered": ["未分配的知识点"]
  }
}`
}

export async function generateThemeAndAllocation(
  theme: string,
  grade: string,
  knowledgePoints: string,
  questionTypes: TestConfig['questionTypes'],
  openaiConfig: OpenAIConfig
): Promise<ThemeAndAllocationResult> {
  const moduleName = 'generate-theme-and-allocation'
  let requestId: string | undefined
  
  try {
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

    // 构建题型配置信息
    const questionTypesConfig = buildQuestionTypesConfig(questionTypes)
    console.log('[Theme Generation Prompt] Question Types Config:', questionTypesConfig)
    
    // 构建动态JSON示例
    const dynamicJsonExample = buildDynamicJsonExample(questionTypes)
    console.log('[Theme Generation Prompt] Dynamic JSON Example:', dynamicJsonExample)

    const systemMessage = `你是一名资深的小学英语教师，擅长设计主题化的教学场景和合理分配知识点。请严格按照JSON格式输出，不要包含任何其他内容。`

    const userMessage = `请根据以下信息生成主题场景并分配知识点：

## 基本信息
- 年级：${getGradeName(grade)}
- 主题：${theme}
- 重点知识点：${knowledgePoints}
- 题型配置：${questionTypesConfig}

## 任务要求
1. **主题场景设计**：
   - 为主题创建一个连贯的背景故事，小学生能理解并感兴趣
   - 为每个有题目的题型设计具体的场景情境（每个题型只能有一个场景）
   - 确保各个场景在主题下形成完整的故事线

2. **知识点分配**：
   - 将全部知识点合理分配到各个题型
   - 重点知识点至少在2到3类题型中至少出现一次
   - 确保知识点覆盖完整，避免遗漏
   - 根据题型特点分配合适的知识点（如听力题适合对话类知识点）

3. **输出格式**：严格按照以下JSON格式输出，不要包含任何其他内容：

EXAMPLE JSON OUTPUT:
${dynamicJsonExample}

## 重要约束条件
**每个题型只能出现一次**：scenarios数组中，每个questionType只能有一个对应的场景对象，绝对不允许重复！
**严格按照题型配置**：只为上述"题型配置"中列出的题型生成场景，其他题型一律不生成！
场景标题（scenarioTitle）和场景描述（scenarioDescription）请使用中文，请勿使用英文！
知识点（knowledgePoints）中英文结合！
`

    // 记录完整的prompt输入内容
    console.log('[Theme Generation Prompt] System Message:', systemMessage)
    console.log('[Theme Generation Prompt] User Message:', userMessage)
    console.log('[Theme Generation Prompt] Full Prompt Length:', systemMessage.length + userMessage.length)

    // 根据模型类型设置不同的参数
    const generateParams: {
      model: unknown;
      messages: Array<{ role: string; content: string }>;
      response_format: { type: string };
      temperature: number;
      max_tokens?: number;
      maxTokens?: number;
    } = {
      model: provider(openaiConfig.model),
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: {'type': "json_object"},
      temperature: 0.7,
    }

    // 为不同模型设置合适的token限制
    if (openaiConfig.model.startsWith("kimi") || openaiConfig.model.startsWith("moonshot") || openaiConfig.model.startsWith("Doubao")) {
      generateParams.max_tokens = 4000
    } else {
      generateParams.maxTokens = 4000
    }

    // 记录API调用开始信息
    const startTime = Date.now()
    requestId = logAPICallStart(
      moduleName,
      openaiConfig.model,
      openaiConfig.baseUrl || '',
      generateParams
    )

    console.log('[Theme Generation] Starting theme and allocation generation...')
    const { text } = await generateText(generateParams as Parameters<typeof generateText>[0])

    // 记录API调用成功信息
    logAPICallSuccess(moduleName, requestId, text, startTime)

    if (!text) {
      throw new Error("No content received from API.")
    }

    // 清理返回内容 - 移除markdown代码块标记
    const cleanedText = text
      .replace(/```json/gi, "")  // 移除开头的```json标记
      .replace(/```$/g, "")      // 移除末尾的```标记
      .replace(/```/g, "")       // 移除任何剩余的```标记
      .trim()

    // 增强的JSON清理逻辑
    // 修复常见的JSON格式错误
    // cleanedText = cleanedText
    //   .replace(/(["'])(\w+)(["'])\s*:/g, '"$2":') // 统一属性名格式
    //   .replace(/:\s*(["'])([^"']*?)(["'])(?=\s*[,}])/g, ': "$2"') // 统一字符串值格式
    //   .replace(/"([^"]*?)"\s*:\s*([^"\[{][^,}]*?)(?=[,}])/g, '"$1": "$2"') // 为未加引号的值添加引号
    //   .replace(/,\s*}/g, '}') // 移除多余的逗号
    //   .replace(/,\s*]/g, ']') // 移除数组末尾多余的逗号

    console.log('[Theme Generation] Raw response:', text)
    console.log('[Theme Generation] Cleaned text:', cleanedText)

    try {
      const result = JSON.parse(cleanedText) as ThemeAndAllocationResult
      
      // 验证结果结构
      if (!result.mainTheme || !result.backgroundDescription || !Array.isArray(result.scenarios)) {
        throw new Error('Invalid response structure')
      }

      // 验证题型唯一性
      const questionTypes = result.scenarios.map(s => s.questionType)
      const uniqueQuestionTypes = [...new Set(questionTypes)]
      if (questionTypes.length !== uniqueQuestionTypes.length) {
        console.warn('[Theme Generation] Detected duplicate question types, removing duplicates...')
        // 去重：保留每个题型的第一个场景
        const seenTypes = new Set<string>()
        result.scenarios = result.scenarios.filter(scenario => {
          if (seenTypes.has(scenario.questionType)) {
            return false
          }
          seenTypes.add(scenario.questionType)
          return true
        })
      }

      console.log('[Theme Generation] Success:', result)
      return result
    } catch (parseError) {
      console.error('Failed to parse theme generation response:', parseError)
      console.error('Raw response:', cleanedText)
      throw new Error('Failed to parse theme generation response')
    }

  } catch (error: unknown) {
    // 记录API调用失败信息
    if (requestId) {
      logAPICallError(moduleName, requestId, error instanceof Error ? error : new Error(String(error)))
    }
    
    console.error('Error generating theme and allocation:', error)
    
    // 直接抛出错误，不返回默认数据
    throw error
  }
}