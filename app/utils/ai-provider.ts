import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { OpenAIConfig } from "../types/shared"
import { logger, APICallLog } from "./logger"

/**
 * 根据配置创建AI模型提供者实例
 * @param openaiConfig - OpenAI配置对象
 * @returns AI模型提供者实例
 */
export function createAIProvider(openaiConfig: OpenAIConfig) {
  if (openaiConfig.model.startsWith("deepseek")) {
    return createDeepSeek({
      apiKey: openaiConfig.apiKey,
      baseURL: openaiConfig.baseUrl || "https://api.deepseek.com/v1",
    })
  } else {
    // 对于Kimi、GPT等其他模型，都使用OpenAI兼容格式
    return createOpenAI({
      apiKey: openaiConfig.apiKey,
      baseURL: openaiConfig.baseUrl || "https://api.openai.com/v1",
    })
  }
}

/**
 * 根据模型类型设置生成参数
 * @param provider - AI模型提供者
 * @param openaiConfig - OpenAI配置
 * @param systemMessage - 系统消息
 * @param userMessage - 用户消息
 * @param maxTokens - 最大token数，默认8000
 * @returns 生成参数对象
 */
export function createGenerateParams(
  provider: ReturnType<typeof createOpenAI | typeof createDeepSeek>,
  openaiConfig: OpenAIConfig,
  systemMessage: string,
  userMessage: string,
  maxTokens: number = 8000
) {
  const generateParams: Record<string, unknown> = {
    model: provider(openaiConfig.model),
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage }
    ],
    response_format: {'type': "json_object"},
    temperature: 0.7,
  }

  // 为不同模型设置合适的token限制
  if (openaiConfig.model.startsWith("kimi") || 
      openaiConfig.model.startsWith("moonshot") || 
      openaiConfig.model.startsWith("Doubao")) {
    // Kimi和豆包模型使用max_tokens而不是maxTokens
    generateParams.max_tokens = maxTokens
  } else {
    generateParams.maxTokens = maxTokens
  }

  return generateParams
}

/**
 * 清理AI模型返回的文本内容
 * @param text - 原始文本
 * @returns 清理后的文本
 */
export function cleanAIResponse(text: string): string {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim()
}

/**
 * 记录API调用开始信息
 * @param module - 模块名称
 * @param model - 模型名称
 * @param baseUrl - 基础URL
 * @param params - 参数对象
 * @param requestId - 请求ID（可选，如果不提供会自动生成）
 * @returns 请求ID
 */
export function logAPICallStart(
  module: string,
  model: string,
  baseUrl: string,
  params: Record<string, unknown>,
  requestId?: string
): string {
  const id = requestId || logger.generateRequestId()
  
  // 提取prompt信息
  const messages = params.messages as Array<{ role: string; content: string }>
  const fullPrompt = messages.map(m => m.content).join('\n\n')
  const promptPreview = fullPrompt.length > 200 ? fullPrompt.substring(0, 200) + '...' : fullPrompt
  
  const apiCallLog: Pick<APICallLog, 'requestId' | 'model' | 'baseUrl' | 'inputData'> = {
    requestId: id,
    model,
    baseUrl,
    inputData: {
      promptLength: fullPrompt.length,
      temperature: (params.temperature as number) || 0.7,
      maxTokens: (params.maxTokens || params.max_tokens) as number,
      promptPreview
    }
  }
  
  logger.logAPICallStart(module, apiCallLog)
  
  // 保持原有的console.log用于开发调试
  console.log('[API Call] Model:', model)
  console.log('[API Call] BaseURL:', baseUrl)
  console.log('[API Call] Params:', JSON.stringify(params, null, 2))
  
  return id
}

/**
 * 记录API调用成功信息
 * @param module - 模块名称
 * @param requestId - 请求ID
 * @param content - 响应内容
 * @param startTime - 开始时间
 */
export function logAPICallSuccess(
  module: string,
  requestId: string,
  content: string | null,
  startTime: number
): void {
  const duration = `${Date.now() - startTime}ms`
  const responseLength = content?.length || 0
  const responsePreview = content && content.length > 200 ? content.substring(0, 200) + '...' : content || ''
  
  // 检测是否为乱码响应
  const isGarbledResponse = content ? detectGarbledText(content) : false
  
  const apiCallLog: Pick<APICallLog, 'requestId' | 'outputData'> = {
    requestId,
    outputData: {
      responseLength,
      duration,
      responsePreview,
      fullResponse: content || undefined,
      isGarbledResponse
    }
  }
  
  logger.logAPICallSuccess(module, apiCallLog)
  
  // 保持原有的console.log用于开发调试
  console.log('[API Response] Success, content length:', responseLength)
}

/**
 * 记录API调用失败信息
 * @param module - 模块名称
 * @param requestId - 请求ID
 * @param error - 错误信息
 */
export function logAPICallError(
  module: string,
  requestId: string,
  error: Error
): void {
  const apiCallLog: Pick<APICallLog, 'requestId' | 'error'> = {
    requestId,
    error: {
      message: error.message,
      stack: error.stack
    }
  }
  
  logger.logAPICallError(module, apiCallLog)
  
  // 保持原有的console.log用于开发调试
  console.error('[API Error]:', error.message)
}

/**
 * 检测文本是否为乱码
 * @param text - 待检测的文本
 * @returns 是否为乱码
 */
function detectGarbledText(text: string): boolean {
  if (!text || text.length === 0) return false
  
  // 计算非ASCII字符的比例
  const nonAsciiCount = text.split('').filter(char => char.charCodeAt(0) > 127).length
  const nonAsciiRatio = nonAsciiCount / text.length
  
  // 检查是否包含大量控制字符或特殊字符
  const controlCharCount = text.split('').filter(char => {
    const code = char.charCodeAt(0)
    return (code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127
  }).length
  
  // 如果控制字符超过5%或非ASCII字符超过80%，认为是乱码
  return (controlCharCount / text.length > 0.05) || (nonAsciiRatio > 0.8)
}

/**
 * 兼容性函数：记录API调用信息（保持向后兼容）
 * @deprecated 请使用 logAPICallStart 替代
 */
export function logAPICall(model: string, baseUrl: string, params: Record<string, unknown>) {
  console.log('[API Call] Model:', model)
  console.log('[API Call] BaseURL:', baseUrl)
  console.log('[API Call] Params:', JSON.stringify(params, null, 2))
}

/**
 * 兼容性函数：记录API响应信息（保持向后兼容）
 * @deprecated 请使用 logAPICallSuccess 替代
 */
export function logAPIResponse(content: string | null) {
  console.log('[API Response] Success, content length:', content?.length || 0)
}