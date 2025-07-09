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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Info, RotateCcw, Save, FileText, Wand2 } from "lucide-react"

interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
}

interface PromptConfig {
  selectedTemplate: string
  customTemplate: string
  variables: Record<string, string>
}

interface PromptConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: PromptConfig | null
  onConfigSave: (config: PromptConfig) => void
}

// 预设的prompt模板
const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "standard",
    name: "标准模板",
    description: "适用于大多数情况的标准试卷生成模板",
    template: `请你根据以下要求，生成一份小学英语试卷，返回 JSON 格式数据：

- 年级: {{grade}}
- 难度: {{difficulty}}
- 主题: {{theme}}
- 重点知识点: {{knowledgePoints}}
- 总分: {{totalScore}}

题型配比（按以下顺序出题）:
1. 听力题: {{listeningCount}}道，每题{{listeningScore}}分
2. 选择题: {{multipleChoiceCount}}道，每题{{multipleChoiceScore}}分（每题必须有4个选项）
3. 填空题: {{fillInBlankCount}}道，每题{{fillInBlankScore}}分
4. 阅读理解: {{readingCount}}道，每题{{readingScore}}分
5. 写作题: {{writingCount}}道，每题{{writingScore}}分

特殊要求：
1. 听力题需要生成听力材料(listeningMaterial)，包含完整的听力文本
2. 选择题必须有4个选项，选项内容不要包含A、B、C、D标签，只写纯内容
3. 每道题都需要标准答案(answer)和详细解析(explanation)
4. 题目顺序：听力题在最前面，写作题在最后面
5. 生成完整的答案解析页面(answerKey)

试卷结构:
- 试卷包含标题(title)，副标题(subtitle)，考试说明(instructions)，总分(totalScore)
- 听力材料(listeningMaterial)：完整的听力文本内容
- 试卷分为多个section，按顺序：听力题、选择题、填空题、阅读理解、写作题
- 每个section包含题型(type)，标题(title)，题目列表(questions)
- 每道题包含题目内容(question)，分值(points)，id，答案(answer)，解析(explanation)
- 选择题必须包含4个选项(options)，格式为["选项1内容", "选项2内容", "选项3内容", "选项4内容"]，不要包含A、B、C、D标签
- 答案解析页面(answerKey)：包含所有题目的答案和解析`,
    variables: [
      "grade",
      "difficulty",
      "theme",
      "knowledgePoints",
      "totalScore",
      "listeningCount",
      "listeningScore",
      "multipleChoiceCount",
      "multipleChoiceScore",
      "fillInBlankCount",
      "fillInBlankScore",
      "readingCount",
      "readingScore",
      "writingCount",
      "writingScore",
    ],
  },
  {
    id: "detailed",
    name: "详细模板",
    description: "包含更详细要求和示例的模板，适合高质量试卷生成",
    template: `作为一名专业的小学英语教师，请根据以下要求生成一份高质量的英语试卷：

## 基本信息
- 适用年级: {{grade}}年级
- 难度等级: {{difficulty}}
- 主题内容: {{theme}}
- 核心知识点: {{knowledgePoints}}
- 试卷总分: {{totalScore}}分

## 题型分布
1. **听力理解** ({{listeningCount}}题 × {{listeningScore}}分)
2. **单项选择** ({{multipleChoiceCount}}题 × {{multipleChoiceScore}}分)
3. **词汇填空** ({{fillInBlankCount}}题 × {{fillInBlankScore}}分)
4. **阅读理解** ({{readingCount}}题 × {{readingScore}}分)
5. **书面表达** ({{writingCount}}题 × {{writingScore}}分)

## 质量要求
### 听力题要求：
- 提供完整的听力材料，语言自然流畅
- 题目设计要符合小学生认知水平
- 涵盖日常生活场景和课堂学习内容

### 选择题要求：
- 每题提供4个选项（A、B、C、D）
- 选项内容只写纯文本，不包含字母标签
- 干扰项要有一定迷惑性但不过于困难
- 正确答案分布要相对均匀

### 填空题要求：
- 重点考查语法和词汇运用
- 空格设置要合理，不影响句子理解
- 答案要唯一且明确

### 阅读理解要求：
- 短文内容要生动有趣，贴近学生生活
- 问题设计要层次分明，由浅入深
- 包含细节理解和推理判断

### 写作题要求：
- 题目要具有开放性和创造性
- 提供必要的写作提示和要求
- 评分标准要明确具体

## 输出格式
请严格按照JSON格式输出，包含完整的试卷结构、答案解析和元数据信息。`,
    variables: [
      "grade",
      "difficulty",
      "theme",
      "knowledgePoints",
      "totalScore",
      "listeningCount",
      "listeningScore",
      "multipleChoiceCount",
      "multipleChoiceScore",
      "fillInBlankCount",
      "fillInBlankScore",
      "readingCount",
      "readingScore",
      "writingCount",
      "writingScore",
    ],
  },
  {
    id: "creative",
    name: "创意模板",
    description: "注重创新和趣味性的模板，适合激发学生学习兴趣",
    template: `🎯 创意英语试卷生成任务

你是一位富有创意的小学英语教师，请设计一份既有趣又有效的英语试卷：

📚 试卷参数：
- 目标年级：{{grade}}年级小学生
- 挑战难度：{{difficulty}}水平
- 探索主题：{{theme}}
- 学习重点：{{knowledgePoints}}
- 满分设定：{{totalScore}}分

🎪 题型创意设计：
1. 🎧 **听力探险** ({{listeningCount}}题，{{listeningScore}}分/题)
   - 设计有趣的故事情节或对话场景
   - 融入音效描述和情境想象

2. 🎯 **智慧选择** ({{multipleChoiceCount}}题，{{multipleChoiceScore}}分/题)
   - 创造生动的情境和角色
   - 选项设计要有故事性

3. 📝 **词汇魔法** ({{fillInBlankCount}}题，{{fillInBlankScore}}分/题)
   - 将填空融入小故事或对话中
   - 注重语境的完整性

4. 📖 **阅读冒险** ({{readingCount}}题，{{readingScore}}分/题)
   - 选择有趣的故事或实用的信息
   - 问题设计要引导思考

5. ✍️ **创作天地** ({{writingCount}}题，{{writingScore}}分/题)
   - 提供开放性和想象空间
   - 鼓励个性化表达

🌟 特色要求：
- 语言要生动活泼，贴近儿童心理
- 内容要积极向上，传递正能量
- 难度要循序渐进，增强自信心
- 设计要新颖有趣，激发学习兴趣

请生成符合要求的JSON格式试卷数据。`,
    variables: [
      "grade",
      "difficulty",
      "theme",
      "knowledgePoints",
      "totalScore",
      "listeningCount",
      "listeningScore",
      "multipleChoiceCount",
      "multipleChoiceScore",
      "fillInBlankCount",
      "fillInBlankScore",
      "readingCount",
      "readingScore",
      "writingCount",
      "writingScore",
    ],
  },
  {
    id: "exam_focused",
    name: "考试导向模板",
    description: "严格按照考试标准设计，适合期中期末等正式考试",
    template: `请严格按照小学英语考试标准，生成一份规范的英语试卷：

考试信息：
- 年级：{{grade}}
- 难度：{{difficulty}}
- 考试范围：{{theme}}
- 重点内容：{{knowledgePoints}}
- 总分：{{totalScore}}分
- 考试时间：60分钟

题型及分值分布：
一、听力部分 ({{listeningCount}}题，共{{listeningTotalScore}}分)
二、笔试部分：
   1. 单项选择题 ({{multipleChoiceCount}}题，共{{multipleChoiceTotalScore}}分)
   2. 完形填空题 ({{fillInBlankCount}}题，共{{fillInBlankTotalScore}}分)
   3. 阅读理解题 ({{readingCount}}题，共{{readingTotalScore}}分)
   4. 书面表达题 ({{writingCount}}题，共{{writingTotalScore}}分)

命题要求：
1. 严格按照课程标准和教学大纲要求
2. 题目难度分布：基础题70%，中等题20%，提高题10%
3. 知识点覆盖要全面均衡
4. 语言材料要真实自然
5. 避免偏题、怪题和超纲题
6. 答案要准确无误，解析要详细清楚

评分标准：
- 听力题：理解准确，答案正确
- 选择题：选项唯一，逻辑清晰
- 填空题：语法正确，拼写准确
- 阅读题：理解深入，推理合理
- 写作题：内容完整，语言流畅，格式规范

请按照标准考试试卷格式生成JSON数据。`,
    variables: [
      "grade",
      "difficulty",
      "theme",
      "knowledgePoints",
      "totalScore",
      "listeningCount",
      "listeningTotalScore",
      "multipleChoiceCount",
      "multipleChoiceTotalScore",
      "fillInBlankCount",
      "fillInBlankTotalScore",
      "readingCount",
      "readingTotalScore",
      "writingCount",
      "writingTotalScore",
    ],
  },
]

export function PromptConfigDialog({ open, onOpenChange, config, onConfigSave }: PromptConfigDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(config?.selectedTemplate || "standard")
  const [customTemplate, setCustomTemplate] = useState<string>(config?.customTemplate || DEFAULT_TEMPLATES[0].template)
  const [activeTab, setActiveTab] = useState("templates")

  useEffect(() => {
    if (config) {
      setSelectedTemplate(config.selectedTemplate || "standard")
      setCustomTemplate(config.customTemplate || DEFAULT_TEMPLATES[0].template)
    }
  }, [config])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setCustomTemplate(template.template)
    }
  }

  const handleSave = () => {
    const newConfig: PromptConfig = {
      selectedTemplate,
      customTemplate,
      variables: {},
    }
    onConfigSave(newConfig)
    onOpenChange(false)
  }

  const handleReset = () => {
    const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.id === "standard")
    if (defaultTemplate) {
      setSelectedTemplate("standard")
      setCustomTemplate(defaultTemplate.template)
    }
  }

  const currentTemplate = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplate)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Prompt 模板配置
          </DialogTitle>
          <DialogDescription>自定义AI生成试卷的提示词模板，支持变量替换和个性化配置</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">预设模板</TabsTrigger>
            <TabsTrigger value="editor">自定义编辑</TabsTrigger>
            <TabsTrigger value="variables">变量说明</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4 overflow-y-auto max-h-[400px]">
            <div className="grid gap-4">
              {DEFAULT_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate === template.id ? "ring-2 ring-primary" : "hover:bg-gray-50"
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      {selectedTemplate === template.id && <Badge variant="default">已选择</Badge>}
                    </div>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">支持变量: {template.variables.length}个</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 8).map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                        {template.variables.length > 8 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.variables.length - 8}个
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="editor" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-editor">Prompt 模板内容</Label>
              <Textarea
                id="template-editor"
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                placeholder="输入自定义的prompt模板..."
                className="min-h-[300px] font-mono text-sm"
              />
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Info className="w-4 h-4" />
                <span>
                  使用 {`{{变量名}}`} 格式插入动态变量，如 {`{{grade}}`}、{`{{difficulty}}`} 等
                </span>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>提示：</strong>模板中的变量会在生成试卷时自动替换为实际值。
                请确保JSON输出格式的要求清晰明确，以获得最佳的生成效果。
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="variables" className="space-y-4 overflow-y-auto max-h-[400px]">
            <div className="space-y-4">
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  以下是系统支持的所有变量，您可以在模板中使用 {`{{变量名}}`} 的格式引用：
                </AlertDescription>
              </Alert>

              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">基本配置变量</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Badge variant="outline">grade</Badge> - 年级
                      </div>
                      <div>
                        <Badge variant="outline">difficulty</Badge> - 难度
                      </div>
                      <div>
                        <Badge variant="outline">theme</Badge> - 主题
                      </div>
                      <div>
                        <Badge variant="outline">knowledgePoints</Badge> - 知识点
                      </div>
                      <div>
                        <Badge variant="outline">totalScore</Badge> - 总分
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">题型配置变量</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { type: "听力题", prefix: "listening" },
                      { type: "选择题", prefix: "multipleChoice" },
                      { type: "填空题", prefix: "fillInBlank" },
                      { type: "阅读题", prefix: "reading" },
                      { type: "写作题", prefix: "writing" },
                    ].map(({ type, prefix }) => (
                      <div key={prefix} className="border-l-2 border-gray-200 pl-3">
                        <p className="font-medium text-sm mb-1">{type}</p>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {prefix}Count
                            </Badge>{" "}
                            - 题目数量
                          </div>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {prefix}Score
                            </Badge>{" "}
                            - 每题分值
                          </div>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {prefix}TotalScore
                            </Badge>{" "}
                            - 总分值
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">使用示例</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      <p>
                        请生成一份{`{{grade}}`}年级的{`{{difficulty}}`}难度英语试卷
                      </p>
                      <p>主题：{`{{theme}}`}</p>
                      <p>
                        选择题：{`{{multipleChoiceCount}}`}道，每题{`{{multipleChoiceScore}}`}分
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2 bg-transparent">
            <RotateCcw className="w-4 h-4" />
            重置为默认
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              保存配置
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
