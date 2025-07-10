"use client"

import { useState, useEffect } from "react"
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
import { Eye, EyeOff, Info } from "lucide-react"

interface OpenAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

interface OpenAIConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: OpenAIConfig | null
  onConfigSave: (config: OpenAIConfig) => void
}

export function OpenAIConfigDialog({ open, onOpenChange, config, onConfigSave }: OpenAIConfigDialogProps) {
  const [formData, setFormData] = useState<OpenAIConfig>({
    apiKey: config?.apiKey || "",
    baseUrl: config?.baseUrl || "https://api.deepseek.com",
    model: config?.model || "deepseek-chat",
  })
  const [showApiKey, setShowApiKey] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    if (config) {
      setFormData({
        apiKey: config.apiKey || "",
        baseUrl: config.baseUrl || "https://api.deepseek.com",
        model: config.model || "deepseek-chat",
      })
    }
  }, [config])

  const handleSave = async () => {
    if (!formData.apiKey.trim()) {
      alert("请输入API Key")
      return
    }

    if (!formData.baseUrl.trim()) {
      alert("请输入Base URL")
      return
    }

    if (!formData.model.trim()) {
      alert("请选择模型")
      return
    }

    setIsValidating(true)

    // 这里可以添加API连接测试
    try {
      // 简单的格式验证
      if (!formData.apiKey.startsWith("sk-") && !formData.apiKey.includes("key-")) {
        console.warn("API Key格式可能不正确")
      }

      onConfigSave(formData)
    } catch (error) {
      console.error("配置验证失败:", error)
      alert("配置验证失败，请检查参数")
    } finally {
      setIsValidating(false)
    }
  }

  const handleReset = () => {
    setFormData({
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            OpenAI 配置
          </DialogTitle>
          <DialogDescription>配置您的OpenAI API参数以启用AI试卷生成功能</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>您的API密钥将安全地存储在本地浏览器中，不会上传到服务器。</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="pr-10"
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
              从{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                OpenAI官网
              </a>{" "}
              获取您的API Key
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.openai.com/v1"
              value={formData.baseUrl}
              onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
            />
            <p className="text-xs text-gray-500">使用官方API或兼容的第三方服务地址</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">模型</Label>
            <Select value={formData.model} onValueChange={(value) => setFormData({ ...formData, model: value })}>
              <SelectTrigger>
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek-chat">DeepSeek Chat (推荐)</SelectItem>
                <SelectItem value="deepseek-reasoner">DeepSeek Reasoner</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">推荐使用DeepSeek Chat获得最佳试卷生成效果</p>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            重置
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isValidating}>
              {isValidating ? "验证中..." : "保存配置"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
