import { generateText } from "ai"
import { buildSamplePaper } from "./build-sample-paper"
import { getFinalPromptTemplate, getQuestionTypePrompt } from "../components/prompt-config-dialog"
import { generateThemeAndAllocation, type ThemeAndAllocationResult } from "./generate-theme-and-allocation"
import { createAIProvider, createGenerateParams, cleanAIResponse, logAPICall, logAPIResponse } from "../utils/ai-provider"

import { TestConfig, OpenAIConfig, PromptConfig, getGradeName, getDifficultyName } from "../types/shared"

export async function generateTestPaper(config: TestConfig, openaiConfig: OpenAIConfig, promptConfig?: PromptConfig) {
  try {
    if (!openaiConfig?.apiKey?.trim()) {
      console.warn("API Key missing – falling back to local sample paper")
      // 构建prompt
      const { systemMessage, userMessage } = buildMessages(config, promptConfig)
      const prompt = systemMessage + "\n\n" + userMessage
      return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
    }

    // 创建AI提供者实例
    const provider = createAIProvider(openaiConfig)

    // 构建system和user消息
    const { systemMessage, userMessage } = buildMessages(config, promptConfig)

    // 创建生成参数
    const generateParams = createGenerateParams(provider, openaiConfig, systemMessage, userMessage, 8000)

    // 记录API调用信息
    logAPICall(openaiConfig.model, openaiConfig.baseUrl, generateParams)

    const { text } = await generateText(generateParams)

    const content = text
    logAPIResponse(content)

    if (!content) {
      throw new Error("No content received from API.")
    }

    // 清理AI响应文本
    const cleanedText = cleanAIResponse(content)

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

// 并行生成试卷的主函数
export async function generateTestPaperParallel(
  config: TestConfig, 
  openaiConfig: OpenAIConfig, 
  promptConfig?: PromptConfig,
  themeAndAllocation?: ThemeAndAllocationResult
) {
  try {
    if (!openaiConfig?.apiKey?.trim()) {
      console.warn("API Key missing – falling back to local sample paper")
      const { systemMessage, userMessage } = buildMessages(config, promptConfig)
      const prompt = systemMessage + "\n\n" + userMessage
      return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
    }

    // 如果没有提供主题场景和知识点分配，先生成
     let finalThemeAndAllocation = themeAndAllocation
     if (!finalThemeAndAllocation) {
       console.log('[Parallel Generation] Generating theme and allocation first...')
       finalThemeAndAllocation = await generateThemeAndAllocation(
         config.theme,
         config.grade,
         config.knowledgePoints,
         config.questionTypes,
         openaiConfig
       )
     }

    // 获取有效的题型（数量大于0的题型）
    const activeQuestionTypes = getActiveQuestionTypes(config)
    
    if (activeQuestionTypes.length === 0) {
      throw new Error('No active question types found')
    }

    console.log(`[Parallel Generation] Starting parallel generation for ${activeQuestionTypes.length} question types...`)

    // 并行生成各题型
    const generationPromises = activeQuestionTypes.map(async (questionType) => {
      try {
        const scenario = finalThemeAndAllocation.scenarios.find(s => s.questionType === questionType)?.scenarioDescription || finalThemeAndAllocation.backgroundDescription
         const knowledgePoints = finalThemeAndAllocation.scenarios.find(s => s.questionType === questionType)?.knowledgePoints.join(', ') || config.knowledgePoints
        
        console.log(`[Parallel Generation] Generating ${questionType} with scenario: ${scenario}`)
        
        const { result, prompt, rawResponse } = await generateSingleQuestionType(
          questionType,
          config,
          openaiConfig,
          scenario,
          knowledgePoints
        )
        
        return { questionType, result, success: true, prompt, rawResponse }
      } catch (error) {
        console.error(`[Parallel Generation] Failed to generate ${questionType}:`, error)
        return { questionType, result: null, success: false, error, prompt: '', rawResponse: '' }
      }
    })

    // 等待所有题型生成完成
    const results = await Promise.all(generationPromises)
    
    // 检查成功率
    const successfulResults = results.filter(r => r.success)
    const failedResults = results.filter(r => !r.success)
    
    console.log(`[Parallel Generation] Completed: ${successfulResults.length}/${results.length} successful`)
    
    if (failedResults.length > 0) {
      console.warn('[Parallel Generation] Failed question types:', failedResults.map(r => r.questionType))
    }

    // 如果所有题型都失败，降级到示例试卷
    if (successfulResults.length === 0) {
      console.warn('[Parallel Generation] All question types failed, falling back to sample paper')
      const { systemMessage, userMessage } = buildMessages(config, promptConfig)
      const prompt = systemMessage + "\n\n" + userMessage
      return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
    }

    // 合并结果
    const mergedTest = mergeQuestionTypeResults(successfulResults, config, finalThemeAndAllocation)
    
    // 构建prompt信息（用于显示）
    const { systemMessage } = buildMessages(config, promptConfig)
    const combinedPrompts = results.map(r => 
       `=== ${r.questionType.toUpperCase()} ===\n${getQuestionTypePrompt(r.questionType as any, config, 
         finalThemeAndAllocation.scenarios.find(s => s.questionType === r.questionType)?.scenarioDescription,
         finalThemeAndAllocation.scenarios.find(s => s.questionType === r.questionType)?.knowledgePoints.join(', ')
       )}`
     ).join('\n\n')
    
    const prompt = systemMessage + "\n\n" + combinedPrompts
    
    // 构建questionTypePrompts数据
    const questionTypePrompts = results.reduce((acc, r) => {
      if (r.success && r.prompt && r.rawResponse) {
        acc[r.questionType] = {
          prompt: r.prompt,
          response: r.rawResponse
        }
      }
      return acc
    }, {} as Record<string, {prompt: string, response: string}>)
    
    return { 
      test: mergedTest, 
      prompt, 
      rawResponse: `Parallel generation completed. ${successfulResults.length}/${results.length} question types generated successfully.`,
      themeAndAllocation: finalThemeAndAllocation,
      questionTypePrompts
    }
    
  } catch (error: any) {
    console.error("Error in parallel generation:", error)
    
    // 降级到示例试卷
    console.warn("Parallel generation failed, falling back to sample paper")
    const { systemMessage, userMessage } = buildMessages(config, promptConfig)
    const prompt = systemMessage + "\n\n" + userMessage
    return { test: buildSamplePaper(config), prompt, rawResponse: undefined }
  }
}

// 生成单个题型
async function generateSingleQuestionType(
  questionType: string,
  config: TestConfig,
  openaiConfig: OpenAIConfig,
  scenario: string,
  knowledgePoints: string
): Promise<{result: any, prompt: string, rawResponse: string}> {
  // 创建AI提供者实例
  const provider = createAIProvider(openaiConfig)

  // 获取题型专用的prompt
  const prompt = getQuestionTypePrompt(questionType as any, config, scenario, knowledgePoints)
  
  // 构建system消息
  const systemMessage = `你是一名资深的小学英语老师，专门负责生成${questionType}题型。请严格按照要求生成高质量的题目。

## 输出格式要求
- 必须严格按照JSON示例格式输出，不要包含任何其他内容
- 务必确保JSON结构完整且语法正确

## 内容安全要求
- 生成的内容必须适合小学生，积极健康
- 不得包含任何不当内容`

  // 创建生成参数
  const generateParams = createGenerateParams(provider, openaiConfig, systemMessage, prompt, 4000)

  console.log(`[${questionType}] Calling API...`)
  
  const { text } = await generateText(generateParams)
  
  if (!text) {
    throw new Error(`No content received for ${questionType}`)
  }

  // 清理和解析响应
  const cleanedText = cleanAIResponse(text)

  console.log(`[${questionType}] Raw response:`, cleanedText)
  
  try {
    const result = safeJsonParse(cleanedText)
    console.log(`[${questionType}] Successfully parsed`)
    return {
      result,
      prompt: systemMessage + "\n\n" + prompt,
      rawResponse: text
    }
  } catch (error) {
    console.error(`[${questionType}] Failed to parse JSON:`, error)
    throw new Error(`Failed to parse JSON for ${questionType}`)
  }
}

// 获取有效的题型（数量大于0的题型）
function getActiveQuestionTypes(config: TestConfig): string[] {
  const types: string[] = []
  
  if (config.questionTypes.listening.count > 0) types.push('listening')
  if (config.questionTypes.multipleChoice.count > 0) types.push('multipleChoice')
  if (config.questionTypes.fillInBlank.count > 0) types.push('fillInBlank')
  if (config.questionTypes.trueFalse.count > 0) types.push('trueFalse')
  if (config.questionTypes.reading.count > 0) types.push('reading')
  if (config.questionTypes.writing.count > 0) types.push('writing')
  
  return types
}

// 合并各题型的结果
function mergeQuestionTypeResults(
  results: Array<{ questionType: string; result: any; success: boolean }>,
  config: TestConfig,
  themeAndAllocation: ThemeAndAllocationResult
): any {
  const mergedTest: any = {
    title: `${getGradeName(config.grade)}英语试卷`,
    subtitle: `主题：${config.theme} | 难度：${getDifficultyName(config.difficulty)}`,
    totalScore: config.totalScore,
    timeLimit: "60分钟",
    instructions: "请仔细阅读题目要求，在规定时间内完成答题。",
    themeBackground: themeAndAllocation.backgroundDescription,
    sections: []
  }

  // 按照固定顺序添加题型
  const orderedTypes = ['listening', 'multipleChoice', 'fillInBlank', 'trueFalse', 'reading', 'writing']
  
  for (const questionType of orderedTypes) {
    const result = results.find(r => r.questionType === questionType)
    if (result && result.success && result.result) {
      // 新格式直接使用result.result作为section数据
      const sectionData = result.result
      if (sectionData && sectionData.type === questionType) {
        // 获取该题型的分值配置
        const questionTypeConfig = config.questionTypes[questionType as keyof typeof config.questionTypes]
        const pointsPerQuestion = questionTypeConfig?.score || 0
        const totalSectionScore = (questionTypeConfig?.count || 0) * pointsPerQuestion
        
        // 获取该题型的主题场景信息
        const scenarioInfo = themeAndAllocation.scenarios.find(s => s.questionType === questionType)
        
        // 为section添加分值信息和主题场景信息
        const sectionWithScores = {
          type: questionType,
          title: sectionData.title || getQuestionTypeTitle(questionType),
          totalScore: totalSectionScore,
          pointsPerQuestion: pointsPerQuestion,
          // 添加主题场景信息
          scenarioTitle: scenarioInfo?.scenarioTitle,
          scenarioDescription: scenarioInfo?.scenarioDescription,
          scenarioKnowledgePoints: scenarioInfo?.knowledgePoints,
          ...sectionData
        }
        
        // 为每道题添加分值信息
        if (sectionWithScores.questions && Array.isArray(sectionWithScores.questions)) {
          sectionWithScores.questions = sectionWithScores.questions.map((question: any) => ({
            ...question,
            points: pointsPerQuestion
          }))
        }
        
        mergedTest.sections.push(sectionWithScores)
      }
    }
  }

  return mergedTest
}

// 获取题型标题
function getQuestionTypeTitle(questionType: string): string {
  const titles: Record<string, string> = {
    listening: '听力理解',
    multipleChoice: '选择题',
    fillInBlank: '填空题',
    trueFalse: '判断题',
    reading: '阅读理解',
    writing: '写作题'
  }
  return titles[questionType] || questionType
}
