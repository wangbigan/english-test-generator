import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import { OpenAIConfig } from "../types/shared"

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
 * 记录API调用信息
 * @param model - 模型名称
 * @param baseUrl - 基础URL
 * @param params - 参数对象
 */
export function logAPICall(model: string, baseUrl: string, params: Record<string, unknown>) {
  console.log('[API Call] Model:', model)
  console.log('[API Call] BaseURL:', baseUrl)
  console.log('[API Call] Params:', JSON.stringify(params, null, 2))
}

/**
 * 记录API响应信息
 * @param content - 响应内容
 */
export function logAPIResponse(content: string | null) {
  console.log('[API Response] Success, content length:', content?.length || 0)
}