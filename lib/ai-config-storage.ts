/**
 * AI 厂商配置的本地加密存储
 *
 * 设计要点：
 * 1. 多厂商 API Key 互相隔离 —— encryptedKeys[providerId] 各自独立，切换厂商不会串值
 * 2. API Key 使用 Web Crypto API (AES-GCM + PBKDF2) 加密后存入 localStorage
 * 3. 自动从旧版 "openai-config" 明文配置迁移到新版加密结构
 *
 * 安全说明：
 *   App 密钥必须打包进前端 JS 才能在浏览器里完成解密，因此理论上任何能读到 JS 包
 *   的人都能解出 localStorage 中的 key。该加密层主要防御：
 *     - 无意中导出/截图 localStorage 时直接暴露明文
 *     - 同设备其他扩展或脚本通过 devtools 直接读到明文
 *   并不能抵御针对本应用的定向逆向。如需更高安全性，应改为后端代理调用模型。
 */

"use client"

import type { AIProviderConfig } from "./types"

const STORAGE_KEY = "ai-provider-config-v2"
const LEGACY_STORAGE_KEY = "openai-config"
const APP_SECRET = "english-test-generator/v1"
const SALT = "ai-config-salt/v1"
const PBKDF2_ITERATIONS = 100_000
const IV_LENGTH = 12 // bytes, AES-GCM 推荐值

export interface StoredAIConfig {
  /** 当前激活的厂商 id */
  currentProvider: string
  /** 当前激活厂商对应的 baseUrl */
  baseUrl: string
  /** 当前激活厂商对应的模型 */
  model: string
  /** 各厂商的加密 API Key，按 providerId 索引 */
  encryptedKeys: Record<string, string>
}

// ===== Web Crypto 工具 =====

let cachedKeyPromise: Promise<CryptoKey> | null = null

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedKeyPromise) return cachedKeyPromise
  cachedKeyPromise = (async () => {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(APP_SECRET),
      { name: "PBKDF2" },
      false,
      ["deriveKey"],
    )
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode(SALT), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )
  })()
  return cachedKeyPromise
}

function bufToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function base64ToBuf(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function encryptApiKey(plain: string): Promise<string> {
  if (!plain) return ""
  const key = await getCryptoKey()
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plain),
  )
  const cipher = new Uint8Array(cipherBuffer)
  const combined = new Uint8Array(iv.length + cipher.length)
  combined.set(iv, 0)
  combined.set(cipher, iv.length)
  return bufToBase64(combined)
}

export async function decryptApiKey(ciphertext: string): Promise<string> {
  if (!ciphertext) return ""
  try {
    const combined = base64ToBuf(ciphertext)
    if (combined.length <= IV_LENGTH) return ""
    const iv = combined.slice(0, IV_LENGTH)
    const cipher = combined.slice(IV_LENGTH)
    const key = await getCryptoKey()
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher)
    return new TextDecoder().decode(plain)
  } catch (error) {
    console.error("[ai-config-storage] decryptApiKey failed:", error)
    return ""
  }
}

// ===== 存储读写 =====

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readStoredConfig(): StoredAIConfig | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredAIConfig>
    if (typeof parsed?.currentProvider !== "string") return null
    return {
      currentProvider: parsed.currentProvider,
      baseUrl: parsed.baseUrl ?? "",
      model: parsed.model ?? "",
      encryptedKeys: parsed.encryptedKeys ?? {},
    }
  } catch {
    return null
  }
}

export function writeStoredConfig(config: StoredAIConfig): void {
  if (!isBrowser()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  // 写入新版后清理旧版明文存储
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

/**
 * 将旧版 "openai-config"（明文 apiKey）迁移到新版加密结构。
 * 由于 providerId 解析依赖 UI 层的厂商注册表，调用方需注入 resolveProviderId。
 */
export async function migrateLegacyIfNeeded(
  resolveProviderId: (baseUrl: string) => string,
): Promise<StoredAIConfig | null> {
  if (!isBrowser()) return null
  if (window.localStorage.getItem(STORAGE_KEY)) return readStoredConfig()
  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!legacyRaw) return null
  try {
    const legacy = JSON.parse(legacyRaw) as { apiKey?: string; baseUrl?: string; model?: string }
    if (!legacy.baseUrl || !legacy.model) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      return null
    }
    const providerId = resolveProviderId(legacy.baseUrl)
    const encrypted = legacy.apiKey ? await encryptApiKey(legacy.apiKey) : ""
    const migrated: StoredAIConfig = {
      currentProvider: providerId,
      baseUrl: legacy.baseUrl,
      model: legacy.model,
      encryptedKeys: encrypted ? { [providerId]: encrypted } : {},
    }
    writeStoredConfig(migrated)
    return migrated
  } catch (error) {
    console.warn("[ai-config-storage] legacy migration failed:", error)
    return null
  }
}

/**
 * 加载当前激活厂商的运行时配置（apiKey 已解密）。
 * 没有任何已保存配置时返回 null。
 */
export async function loadCurrentAIConfig(
  resolveProviderId: (baseUrl: string) => string,
): Promise<AIProviderConfig | null> {
  let stored = readStoredConfig()
  if (!stored) {
    stored = await migrateLegacyIfNeeded(resolveProviderId)
  }
  if (!stored) return null
  const encrypted = stored.encryptedKeys?.[stored.currentProvider] ?? ""
  const apiKey = encrypted ? await decryptApiKey(encrypted) : ""
  return { apiKey, baseUrl: stored.baseUrl, model: stored.model }
}

/**
 * 保存某个厂商的完整配置：
 * - 加密 apiKey 写入 encryptedKeys[providerId]
 * - 更新 currentProvider / baseUrl / model
 * - 不影响其它厂商已保存的 key
 */
export async function saveProviderAIConfig(
  providerId: string,
  config: AIProviderConfig,
): Promise<void> {
  const existing = readStoredConfig() ?? {
    currentProvider: providerId,
    baseUrl: config.baseUrl,
    model: config.model,
    encryptedKeys: {},
  }
  const encrypted = config.apiKey ? await encryptApiKey(config.apiKey) : ""
  const next: StoredAIConfig = {
    currentProvider: providerId,
    baseUrl: config.baseUrl,
    model: config.model,
    encryptedKeys: {
      ...existing.encryptedKeys,
      [providerId]: encrypted,
    },
  }
  writeStoredConfig(next)
}

/**
 * 解密所有已保存的厂商 keys，返回 { providerId: plainKey } 映射。
 * 用于对话框展示「该厂商已保存的 key」。
 */
export async function loadDecryptedKeysMap(): Promise<Record<string, string>> {
  const stored = readStoredConfig()
  if (!stored?.encryptedKeys) return {}
  const result: Record<string, string> = {}
  await Promise.all(
    Object.entries(stored.encryptedKeys).map(async ([id, encrypted]) => {
      result[id] = encrypted ? await decryptApiKey(encrypted) : ""
    }),
  )
  return result
}
