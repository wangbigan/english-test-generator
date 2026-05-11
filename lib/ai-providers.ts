/**
 * 大模型厂商 / 聚合平台注册表
 * 集中维护，供配置对话框和页面状态共享。
 */

export interface ProviderInfo {
  id: string
  name: string
  description: string
  baseUrl: string
  models: ReadonlyArray<{ value: string; label: string }>
  apiKeyUrl: string
  apiKeyName: string
  apiKeyPlaceholder: string
}

export const PROVIDERS: ReadonlyArray<ProviderInfo> = [
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "深度求索 - V4 系列百万上下文，思考/非思考双模式",
    baseUrl: "https://api.deepseek.com/v1",
    models: [
      { value: "deepseek-v4-flash", label: "DeepSeek-V4-Flash (推荐 经济)" },
      { value: "deepseek-v4-pro", label: "DeepSeek-V4-Pro (旗舰)" },
      { value: "deepseek-chat", label: "DeepSeek-Chat (兼容, 2026-07 迁移)" },
      { value: "deepseek-reasoner", label: "DeepSeek-Reasoner (兼容, 2026-07 迁移)" },
    ],
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyName: "DeepSeek 开放平台",
    apiKeyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot AI)",
    description: "月之暗面 - K2.6 长程代码与 Agent 能力突出，256K 上下文",
    baseUrl: "https://api.moonshot.cn/v1",
    models: [
      { value: "kimi-k2.6", label: "Kimi K2.6 (推荐 旗舰)" },
      { value: "kimi-k2.5", label: "Kimi K2.5" },
      { value: "kimi-latest", label: "Kimi Latest (自动追新)" },
      { value: "moonshot-v1-128k", label: "Moonshot v1-128k (兼容)" },
      { value: "moonshot-v1-32k", label: "Moonshot v1-32k (兼容)" },
    ],
    apiKeyUrl: "https://platform.moonshot.cn/console/api-keys",
    apiKeyName: "Moonshot AI 开放平台",
    apiKeyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    description: "智谱 AI - GLM-5/GLM-4.6 旗舰，对标 Claude Opus/Sonnet",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { value: "glm-5.1", label: "GLM-5.1 (旗舰)" },
      { value: "glm-5", label: "GLM-5" },
      { value: "glm-4.6", label: "GLM-4.6 (推荐 200K 上下文)" },
      { value: "glm-4.5-air", label: "GLM-4.5-Air (轻量)" },
      { value: "glm-4-flash", label: "GLM-4-Flash (免费)" },
    ],
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    apiKeyName: "智谱 AI 开放平台",
    apiKeyPlaceholder: "xxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxx",
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "稀宇科技 - M2.5 生产旗舰，M1 提供 1M 上下文推理",
    baseUrl: "https://api.minimaxi.com/v1",
    models: [
      { value: "MiniMax-M2.5", label: "MiniMax-M2.5 (推荐 生产旗舰)" },
      { value: "MiniMax-M1", label: "MiniMax-M1 (推理 1M 上下文)" },
      { value: "MiniMax-Text-01", label: "MiniMax-Text-01 (经典)" },
      { value: "abab6.5s-chat", label: "abab6.5s-chat (轻量)" },
    ],
    apiKeyUrl: "https://platform.minimaxi.com/user-center/basic-information/interface-key",
    apiKeyName: "MiniMax 开放平台",
    apiKeyPlaceholder: "eyJhbGciOi...",
  },
  {
    id: "siliconflow",
    name: "硅基流动 SiliconFlow",
    description: "聚合平台 - 一个 Key 调用 Qwen3.6 / DeepSeek-V3.1 / GLM 等百余款",
    baseUrl: "https://api.siliconflow.cn/v1",
    models: [
      { value: "Qwen/Qwen3.6-35B-A3B", label: "Qwen3.6-35B-A3B (推荐 MoE)" },
      { value: "Qwen/Qwen3.5-397B-A17B", label: "Qwen3.5-397B-A17B (旗舰 MoE)" },
      { value: "deepseek-ai/DeepSeek-V3.1-Terminus", label: "DeepSeek-V3.1-Terminus" },
      { value: "deepseek-ai/DeepSeek-R1", label: "DeepSeek-R1 (深度推理)" },
      { value: "Qwen/Qwen3.6-27B", label: "Qwen3.6-27B (稠密)" },
      { value: "Qwen/Qwen3-8B", label: "Qwen3-8B (免费)" },
    ],
    apiKeyUrl: "https://cloud.siliconflow.cn/account/ak",
    apiKeyName: "SiliconFlow 控制台",
    apiKeyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "OpenAI 官方 - GPT-5 系列旗舰，GPT-4.1/4o 仍在 API 提供",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { value: "gpt-5.5", label: "GPT-5.5 (旗舰)" },
      { value: "gpt-5.4-mini", label: "GPT-5.4 Mini (推荐 平衡)" },
      { value: "gpt-5.4-nano", label: "GPT-5.4 Nano (经济)" },
      { value: "gpt-4.1", label: "GPT-4.1" },
      { value: "gpt-4o", label: "GPT-4o" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    ],
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyName: "OpenAI 平台",
    apiKeyPlaceholder: "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  },
]

export const DEFAULT_PROVIDER: ProviderInfo = PROVIDERS[0]

/** 根据 baseUrl 主机名反查厂商，用于回填已保存的配置 */
export function findProviderByBaseUrl(baseUrl: string | undefined | null): ProviderInfo {
  if (!baseUrl) return DEFAULT_PROVIDER
  const matched = PROVIDERS.find((p) => {
    try {
      return new URL(p.baseUrl).hostname === new URL(baseUrl).hostname
    } catch {
      return false
    }
  })
  return matched ?? DEFAULT_PROVIDER
}
