"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ExternalLink, Eye, EyeOff, Info } from "lucide-react"
import type { AIProviderConfig } from "@/lib/types"
import {
  DEFAULT_PROVIDER,
  PROVIDERS,
  findProviderByBaseUrl,
  type ProviderInfo,
} from "@/lib/ai-providers"
import { loadDecryptedKeysMap, saveProviderAIConfig } from "@/lib/ai-config-storage"

interface OpenAIConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: AIProviderConfig | null
  onConfigSave: (config: AIProviderConfig) => void
}

export function OpenAIConfigDialog({ open, onOpenChange, config, onConfigSave }: OpenAIConfigDialogProps) {
  const initialProvider = findProviderByBaseUrl(config?.baseUrl)

  const [providerId, setProviderId] = useState<string>(initialProvider.id)
  const [formData, setFormData] = useState<AIProviderConfig>({
    apiKey: config?.apiKey || "",
    baseUrl: config?.baseUrl || initialProvider.baseUrl,
    model: config?.model || initialProvider.models[0].value,
  })
  // 各厂商已保存的明文 key 缓存（dialog 打开时一次性预解密）
  // 不会落盘 —— 仅在 dialog 内部用于「切换厂商时回填该厂商已存的 key」
  const [decryptedKeys, setDecryptedKeys] = useState<Record<string, string>>({})
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const provider = useMemo<ProviderInfo>(
    () => PROVIDERS.find((p) => p.id === providerId) ?? DEFAULT_PROVIDER,
    [providerId],
  )

  // 父组件传入的 config 变化时同步本地表单（首次加载、保存后回流）
  useEffect(() => {
    if (!config) return
    const matched = findProviderByBaseUrl(config.baseUrl)
    setProviderId(matched.id)
    setFormData({
      apiKey: config.apiKey || "",
      baseUrl: config.baseUrl || matched.baseUrl,
      model: config.model || matched.models[0].value,
    })
  }, [config])

  // dialog 打开时拉取所有厂商已保存的解密 key
  // 使用 hasLoadedRef 避免每次 open 切换都触发，但 open 关闭再打开时重新拉取以反映最新状态
  const lastOpenRef = useRef(false)
  useEffect(() => {
    if (!open) {
      lastOpenRef.current = false
      return
    }
    if (lastOpenRef.current) return
    lastOpenRef.current = true
    loadDecryptedKeysMap()
      .then(setDecryptedKeys)
      .catch((err) => {
        console.error("[OpenAIConfigDialog] 解密已保存的 key 失败:", err)
        setDecryptedKeys({})
      })
  }, [open])

  const handleProviderChange = (nextProviderId: string) => {
    const next = PROVIDERS.find((p) => p.id === nextProviderId) ?? DEFAULT_PROVIDER
    setProviderId(next.id)
    // 切换厂商时回填该厂商已保存的 key；没保存过则置空（互不混用）
    setFormData({
      apiKey: decryptedKeys[next.id] ?? "",
      baseUrl: next.baseUrl,
      model: next.models[0].value,
    })
  }

  const handleModelChange = (model: string) => {
    setFormData((prev) => ({ ...prev, model }))
  }

  const handleSave = async () => {
    if (!formData.apiKey.trim()) {
      alert("请输入 API Key")
      return
    }

    if (!formData.baseUrl.trim()) {
      alert("请输入 Base URL")
      return
    }

    if (!formData.model.trim()) {
      alert("请选择模型")
      return
    }

    setIsSaving(true)
    try {
      // 加密写入 localStorage（仅更新当前厂商的槽位，不动其它厂商）
      await saveProviderAIConfig(providerId, formData)
      // 同步内部解密缓存，避免立刻切换厂商时还要重新解密
      setDecryptedKeys((prev) => ({ ...prev, [providerId]: formData.apiKey }))
      onConfigSave(formData)
    } catch (error) {
      console.error("[OpenAIConfigDialog] 保存配置失败:", error)
      alert("配置保存失败，请重试")
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setProviderId(DEFAULT_PROVIDER.id)
    setFormData({
      apiKey: "",
      baseUrl: DEFAULT_PROVIDER.baseUrl,
      model: DEFAULT_PROVIDER.models[0].value,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            AI 模型配置
          </DialogTitle>
          <DialogDescription>选择大模型厂商或聚合平台，配置 API 参数以启用试卷生成功能</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              API 密钥按厂商加密后保存在本地浏览器（AES-GCM），不会上传到服务器；不同厂商的 key 互不混用。
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="provider">厂商 / 平台 *</Label>
            <Select value={providerId} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="选择厂商或平台" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">{provider.description}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">模型 *</Label>
            <Select value={formData.model} onValueChange={handleModelChange}>
              <SelectTrigger id="model">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {provider.models.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder={provider.apiKeyPlaceholder}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="pr-10"
                autoComplete="off"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              没有 Key？前往{" "}
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-blue-500 hover:underline"
              >
                {provider.apiKeyName}
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              申请。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder={provider.baseUrl}
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            />
            <p className="text-xs text-gray-500">切换厂商时会自动填充，一般无需手动修改</p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            重置
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存配置"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
