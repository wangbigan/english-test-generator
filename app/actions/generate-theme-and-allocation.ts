import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"

import { TestConfig, OpenAIConfig, getGradeName, getQuestionTypeName } from "../types/shared"

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

// 构建题型配置描述
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

export async function generateThemeAndAllocation(
  theme: string,
  grade: string,
  knowledgePoints: string,
  questionTypes: TestConfig['questionTypes'],
  openaiConfig: OpenAIConfig
): Promise<ThemeAndAllocationResult> {
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

    const systemMessage = `你是一名资深的小学英语教师，擅长设计主题化的教学场景和合理分配知识点。请严格按照JSON格式输出，不要包含任何其他内容。`

    const userMessage = `请根据以下信息生成主题场景并分配知识点：

## 基本信息
- 年级：${getGradeName(grade)}
- 主题：${theme}
- 重点知识点：${knowledgePoints}
- 题型配置：${buildQuestionTypesConfig(questionTypes)}

## 任务要求
1. **主题场景设计**：
   - 为主题创建一个连贯的背景故事，适合小学生理解和兴趣
   - 为每个有题目的题型设计具体的场景情境
   - 确保各个场景在主题下形成完整的故事线

2. **知识点分配**：
   - 将重点知识点合理分配到各个题型
   - 确保知识点覆盖完整，避免遗漏
   - 根据题型特点分配合适的知识点（如听力题适合对话类知识点）

3. **输出格式**：严格按照以下JSON格式输出

\`\`\`json
{
  "mainTheme": "主题名称",
  "backgroundDescription": "主题的整体背景描述，为整个试卷提供统一的情境",
  "scenarios": [
    {
      "questionType": "listening",
      "scenarioTitle": "场景标题",
      "scenarioDescription": "具体的场景描述，要生动有趣",
      "knowledgePoints": ["知识点1", "知识点2"]
    },
    {
      "questionType": "multipleChoice",
      "scenarioTitle": "场景标题",
      "scenarioDescription": "具体的场景描述",
      "knowledgePoints": ["知识点3", "知识点4"]
    }
  ],
  "knowledgePointsCoverage": {
    "total": ["所有知识点列表"],
    "covered": ["已分配的知识点"],
    "uncovered": ["未分配的知识点"]
  }
}
\`\`\``

    // 根据模型类型设置不同的参数
    const generateParams: any = {
      model: provider(openaiConfig.model),
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
    }

    // 为不同模型设置合适的token限制
    if (openaiConfig.model.startsWith("kimi") || openaiConfig.model.startsWith("moonshot") || openaiConfig.model.startsWith("Doubao")) {
      generateParams.max_tokens = 4000
    } else {
      generateParams.maxTokens = 4000
    }

    console.log('[Theme Generation] Starting theme and allocation generation...')
    const { text } = await generateText(generateParams)

    if (!text) {
      throw new Error("No content received from API.")
    }

    // 清理返回内容
    const cleanedText = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim()

    console.log('[Theme Generation] Raw response:', text)
    console.log('[Theme Generation] Cleaned text:', cleanedText)

    try {
      const result = JSON.parse(cleanedText) as ThemeAndAllocationResult
      
      // 验证结果结构
      if (!result.mainTheme || !result.backgroundDescription || !Array.isArray(result.scenarios)) {
        throw new Error('Invalid response structure')
      }

      console.log('[Theme Generation] Success:', result)
      return result
    } catch (parseError) {
      console.error('Failed to parse theme generation response:', parseError)
      console.error('Raw response:', cleanedText)
      throw new Error('Failed to parse theme generation response')
    }

  } catch (error: any) {
    console.error('Error generating theme and allocation:', error)
    
    // 返回默认结果
    const activeQuestionTypes = Object.entries(questionTypes)
      .filter(([_, config]) => config.count > 0)
      .map(([type, _]) => type)
    
    const knowledgePointsList = knowledgePoints.split(/[,，、；;]/).map(p => p.trim()).filter(p => p)
    
    const defaultScenarios: ThemeScenarioWithAllocation[] = activeQuestionTypes.map((type, index) => ({
      questionType: type,
      scenarioTitle: `${getQuestionTypeName(type)}场景`,
      scenarioDescription: `基于"${theme}"主题的${getQuestionTypeName(type)}情境`,
      knowledgePoints: knowledgePointsList.slice(index * 2, (index + 1) * 2)
    }))

    return {
      mainTheme: theme,
      backgroundDescription: `基于"${theme}"主题的英语学习情境`,
      scenarios: defaultScenarios,
      knowledgePointsCoverage: {
        total: knowledgePointsList,
        covered: knowledgePointsList,
        uncovered: []
      }
    }
  }
}