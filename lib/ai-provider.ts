import { createOpenAI } from "@ai-sdk/openai"
import { createDeepSeek } from "@ai-sdk/deepseek"
import type { LanguageModel } from "ai"
import type { AIProviderConfig } from "./types"

/**
 * 根据配置创建 LanguageModel 实例
 * - 仅当 baseUrl 指向 DeepSeek 官方 API 时使用 createDeepSeek
 * - 其他厂商/聚合平台（Kimi / 智谱 / MiniMax / 硅基流动 / OpenAI 等）一律走 OpenAI 兼容格式
 *   注意：以 baseUrl 主机名而非模型名前缀做判定，避免硅基流动的 deepseek-ai/* 模型被误路由到 DeepSeek SDK
 */
export function createLanguageModel(config: AIProviderConfig): LanguageModel {
  const baseUrl = config.baseUrl?.trim() || ""
  const isDeepSeekOfficial = baseUrl.includes("api.deepseek.com")

  if (isDeepSeekOfficial) {
    const provider = createDeepSeek({
      apiKey: config.apiKey,
      baseURL: baseUrl || "https://api.deepseek.com/v1",
    })
    return provider(config.model)
  }

  const provider = createOpenAI({
    apiKey: config.apiKey,
    baseURL: baseUrl || "https://api.openai.com/v1",
  })
  return provider(config.model)
}

/**
 * 获取模型生成参数
 * Kimi 和 Doubao 使用 max_tokens，其他模型使用 maxTokens
 */
export function getModelGenerationParams(config: AIProviderConfig): { maxTokens?: number; max_tokens?: number } {
  const isKimiOrDoubao =
    config.model.startsWith("kimi") ||
    config.model.startsWith("moonshot") ||
    config.model.startsWith("Doubao")

  return isKimiOrDoubao ? { max_tokens: 8000 } : { maxTokens: 8000 }
}
