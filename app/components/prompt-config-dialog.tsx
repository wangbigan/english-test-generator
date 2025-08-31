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

import { PromptConfig, getGradeName } from "../types/shared"

interface PromptConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: PromptConfig | null
  onConfigSave: (config: PromptConfig) => void
}

const JSON_EXAMPLE = `\n\nJSON示例：\n\n\`\`\`json
  {
    "title": "一年级英语中等测试",
    "subtitle": "Unit 1-3",
    "instructions": "请认真阅读题目，仔细作答。听力题请仔细听录音。",
    "totalScore": 100,
    "sections": [
      {
        "type": "listening",
        "title": "一、听力题",
        "listeningMaterial": "Hello, my name is Tom. I am seven years old. I like apples and bananas. My favorite color is blue. I have a pet dog named Max.",
        "questionNumber": 1,
        "questions": [
          {
            "id": 1,
            "question": "What is the boy's name?",
            "answer": "C",
            "options": ["Jack", "Mike", "Tom"],
            "explanation": "从听力材料中可以听到'Hello, my name is Tom'，所以答案是Tom。",
            "knowledgePoint": "介绍常用语",
            "points": 2
          }
        ]
      },
      {
        "type": "multipleChoice",
        "title": "二、选择题",
        "questionNumber": 1,
        "questions": [
          {
            "id": 2,
            "question": "What is your name?",
            "options": ["My name is Tom", "I am a student", "Nice to meet you"],
            "answer": "A",
            "explanation": "询问姓名的标准回答是'My name is...'，所以选择A。",
            "knowledgePoint": "介绍常用语",
            "points": 2
          }
        ]
      },
      {
        "type": "fillInBlank",
        "title": "三、填空题",
        "questionNumber": 1,
        "questions": [
          {
            "id": 3,
            "question": "I ___ a student.",
            "answer": "am",
            "explanation": "主语是I，be动词应该用am。",
            "knowledgePoint": "介绍常用语",
            "points": 2
          }
        ]
      },
      {
        "type": "trueFalse",
        "title": "四、判断题",
        "questionNumber": 1,
        "questions": [
          {
            "id": 4,
            "question": "The sky is blue.",
            "answer": "True",
            "explanation": "天空是蓝色的，所以答案是True。",
            "knowledgePoint": "表示颜色的单词",
            "points": 2
          }
        ]
      },
      {
        "type": "reading",
        "title": "五、阅读理解",
        "readingMaterial": "I am a student. I like apples. My favorite color is blue. I have a pet dog named Max.",
        "questionNumber": 1,
        "questions": [
          {
            "id": 5,
            "question": "What is I like?",
            "options": ["I like apples", "I like oranges", "I like pears"],
            "answer": "A",
            "explanation": "从阅读材料中可以找到答案。",
            "knowledgePoint": "表示喜欢的东西",
            "points": 2
          }
        ]
      },
      {
        "type": "writing",
        "title": "六、写作题",
        "questionNumber": 1,
        "questions": [
          {
            "id": 6,
            "question": "Write a short essay about your favorite color.",
            "explanation": "评分标准：\n1. 内容完整，符合要求\n2. 语法正确，表达清晰\n3. 格式规范，无错别字\n4. 同时满足上述3点要求的，每个句子得一分",
            "knowledgePoint": "表示颜色的单词",
            "points": 10
          }
        ]
      }
    ]
  }\`\`\`\n`;

// 预设的prompt模板
export const DEFAULT_TEMPLATES: PromptTemplate[] = [
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
2. 选择题: {{multipleChoiceCount}}道，每题{{multipleChoiceScore}}分（每题3个选项）
3. 填空题: {{fillInBlankCount}}道，每题{{fillInBlankScore}}分
4. 判断题: {{trueFalseCount}}道，每题{{trueFalseScore}}分
5. 阅读理解: {{readingCount}}道，每题{{readingScore}}分
6. 写作题: {{writingCount}}道，每题{{writingScore}}分

特殊要求：
1. 如果重点知识点不为空，则所有题目必须以考核重点知识点为目的，且所有题目应覆盖完整的重点知识点。
2. 听力题需要生成听力材料(listeningMaterial)，包含完整的听力文本，听力题默认为选择题的形式。
3. 只有听力题的题目与听力材料(listeningMaterial)相关，其他题目都与听力材料(listeningMaterial)无关。
4. 选择题必须有3个选项，选项内容不要包含A、B、C标签，只写纯内容
5. 除写作题以外，其他题目都需要标准答案(answer)和详细解析(explanation)
6. 写作题不需要答案(answer)，解析(explanation)中写评分标准
7. 判断题为判断对错，答案为“True”或“False”，并给出解析。
8. 严格按照每个题型的数量生成相应数量的题型

试卷结构: 
- 严格按照json格式输出，json不要包裹引号，不要输出其他内容。`,
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
      "trueFalseCount",
      "trueFalseScore",
    ],
  },
  {
    id: "exam_focused",
    name: "考试导向模板",
    description: "严格按照考试标准设计，适合期中期末等正式考试",
    template: `请你根据以下要求生成一份小学英语试卷：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题 (theme): {{theme}}
## 知识点 (knowledgePoints): {{knowledgePoints}}
# 题型配置
1. 听力题 (listening): 
   - 数量: {{listeningCount}}
   - 题型 (listeningType): {{ "选择/填空/匹配" }} 
   
2. 选择题 (multipleChoice):
   - 数量: {{multipleChoiceCount}}
   - 每题分值: {{multipleChoiceScore}}
   - 选项要求: 3个选项（不包含A/B/C标签）

3. 填空题 (fillInBlank):
   - 数量: {{fillInBlankCount}}
   - 每题分值: {{fillInBlankScore}}
   - 类型: {{ "单词/短语/句子" }}

4. 判断题 (trueFalse):
   - 数量: {{trueFalseCount}}
   - 每题分值: {{trueFalseScore}}

5. 阅读理解 (reading):
   - 数量: {{readingCount}}
   - 每题分值: {{readingScore}}
   - 结构要求:
     - 文本长度: {{ "50-80词" if grade<=2 else "100-150词" if grade<=4 else "200-250词" }}
     - 题目类型: {{ ["选择题","判断题"] }}  # 至少包含两种题型

6. 写作题 (writing):
   - 数量: {{writingCount}}
   - 每题分值: {{writingScore}}

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **听力题规范**：
   - 必须生成听力材料 (material)
   - 题目必须基于听力材料
   - 支持题型：选择题/填空题/图片匹配

4. **答案解析要求**：
   - 写作题：提供评分标准，比如：
      1. 内容完整，符合要求
      2. 语法正确，表达清晰
      3. 格式规范，无错别字
      4. 同时满足上述3点要求的，每个句子得一分
   - 其他题：提供答案和解析

5. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区
`,
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
      "trueFalseCount",
      "trueFalseTotalScore",
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
1. **听力题** ({{listeningCount}}题 × {{listeningScore}}分)
2. **选择题** ({{multipleChoiceCount}}题 × {{multipleChoiceScore}}分)
3. **填空题** ({{fillInBlankCount}}题 × {{fillInBlankScore}}分)
4. **阅读理解** ({{readingCount}}题 × {{readingScore}}分)
5. **写作题** ({{writingCount}}题 × {{writingScore}}分)
6. **判断题** ({{trueFalseCount}}题 × {{trueFalseScore}}分)

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
请严格按照JSON示例格式输出，不要包裹引号，不要输出其他内容。`,
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
      "trueFalseCount",
      "trueFalseScore",
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

## 输出格式
请严格按照JSON示例格式输出，不要包裹引号，不要输出其他内容。`,
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
      "trueFalseCount",
      "trueFalseScore",
    ],
  },
]

// 注释掉自动拼接JSON_EXAMPLE，避免与generate-test.ts中的defaultPrompt重复
// DEFAULT_TEMPLATES.forEach(t => { if (!t.template.endsWith(JSON_EXAMPLE)) t.template += JSON_EXAMPLE })

const getJsonExampleFromTemplate = (template: string): string | null => {
  const match = template.match(/```json([\s\S]*?)```/)
  return match ? match[1].trim() : null
}

const stripJsonExample = (template: string): string => {
  return template.replace(/\n*请严格按照如下JSON格式输出：[\s\S]*?```json[\s\S]*?```/g, '').trim()
}

export function PromptConfigDialog({ open, onOpenChange, config, onConfigSave }: PromptConfigDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(config?.selectedTemplate || "standard")
  const standardTemplate = DEFAULT_TEMPLATES.find(t => t.id === "standard")?.template || ""
  const [customTemplate, setCustomTemplate] = useState<string>(
    config?.customTemplate && getJsonExampleFromTemplate(config.customTemplate)
      ? config.customTemplate
      : standardTemplate
  )
  const [activeTab, setActiveTab] = useState("templates")

  useEffect(() => {
    if (config) {
      setSelectedTemplate(config.selectedTemplate || "standard")
      if (config.customTemplate) {
        setCustomTemplate(stripJsonExample(config.customTemplate))
      } else {
        setCustomTemplate(stripJsonExample(standardTemplate))
      }
    }
  }, [config, standardTemplate])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = DEFAULT_TEMPLATES.find((t) => t.id === templateId)
    if (template) {
      setCustomTemplate(stripJsonExample(template.template))
    }
  }

  const handleSave = () => {
    const newConfig: PromptConfig = {
      selectedTemplate,
      // 如果用户修改了模板内容，且与选中的预设模板不同，则保存为自定义模板
      // 否则清空customTemplate，使用selectedTemplate
      customTemplate: isCustomTemplate() ? customTemplate : "",
      variables: {},
    }
    onConfigSave(newConfig)
    onOpenChange(false)
  }

  // 判断当前是否为自定义模板
  const isCustomTemplate = () => {
    const selectedTemplateContent = DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate)?.template || ""
    return customTemplate !== stripJsonExample(selectedTemplateContent)
  }

  const handleReset = () => {
    const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.id === "standard")
    if (defaultTemplate) {
      setSelectedTemplate("standard")
      setCustomTemplate(stripJsonExample(defaultTemplate.template))
    }
  }

  const currentTemplate = DEFAULT_TEMPLATES.find((t) => t.id === selectedTemplate)

  // 自定义编辑Tab下，展示时统一拼接JSON_EXAMPLE用于只读区
  const fullTemplateWithJson = `${customTemplate}\n\n${JSON_EXAMPLE}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col overflow-hidden">
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
                  className={`cursor-pointer transition-colors ${selectedTemplate === template.id ? "ring-2 ring-primary" : "hover:bg-gray-50"}`}
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
                      <div className="flex flex-wrap gap-1 mb-2">
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

          <TabsContent value="editor" className="space-y-4 overflow-y-auto pb-8">
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
                  模板中的变量会在生成试卷时自动替换为实际值。
                </span>
              </div>
            </div>
            {/* JSON 示例只读高亮显示 */}
            <div className="mt-4">
              <div className="font-semibold mb-1 text-gray-800">JSON格式示例（只读）</div>
              <pre className="bg-gray-50 p-3 rounded border-[1.5px] border-solid border-gray-300 z-10 shadow-sm text-xs overflow-x-auto text-gray-800 select-none" style={{userSelect:'none', maxHeight: '180px', overflowY: 'auto'}}>
                {getJsonExampleFromTemplate(`${customTemplate}\n\n${JSON_EXAMPLE}`) || '无JSON示例'}
              </pre>
            </div>
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
                      { type: "判断题", prefix: "trueFalse" },
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

// 题型专用的Prompt模板
export const QUESTION_TYPE_TEMPLATES = {
  listening: {
    template: `请你根据以下要求生成听力题：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题场景 (theme): {{scenario}}
## 知识点 (knowledgePoints): {{knowledgePoints}}

# 内容要求
  - 数量: {{listeningCount}}
  - 题型 (listeningType): {{ "选择/填空/匹配" }} 

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **听力题规范**：
   - 必须生成听力材料 (material)
   - 题目必须基于听力材料
   - 支持题型：选择题/填空题/图片匹配

4. **答案解析要求**：
   - 提供答案和解析

5. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区`,
    jsonExample: `{
  "type": "listening",
  "title": "一、听力题",
  "listeningMaterial": "Hello, my name is Tom. I am seven years old. I like apples and bananas. My favorite color is blue. I have a pet dog named Max.",
  "questionNumber": 1,
  "questions": [
    {
      "id": 1,
      "question": "What is the boy's name?",
      "answer": "C",
      "options": ["Jack", "Mike", "Tom"],
      "explanation": "从听力材料中可以听到'Hello, my name is Tom'，所以答案是Tom。",
      "knowledgePoint": "介绍常用语"
    }
  ]
}`
  },
  multipleChoice: {
    template: `请你根据以下要求生成选择题：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题场景 (theme): {{scenario}}
## 知识点 (knowledgePoints): {{knowledgePoints}}

# 内容要求
  - 数量: {{multipleChoiceCount}}
  - 选项要求: 3个选项（不包含A/B/C标签）

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **答案解析要求**：
   - 提供答案和解析

4. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区`,
    jsonExample: `{
  "type": "multipleChoice",
  "title": "二、选择题",
  "questionNumber": 1,
  "questions": [
    {
      "id": 2,
      "question": "What is your name?",
      "options": ["My name is Tom", "I am a student", "Nice to meet you"],
      "answer": "A",
      "explanation": "询问姓名的标准回答是'My name is...'，所以选择A。",
      "knowledgePoint": "介绍常用语"
    }
  ]
}`
  },
  fillInBlank: {
    template: `请你根据以下要求生成填空题：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题场景 (theme): {{scenario}}
## 知识点 (knowledgePoints): {{knowledgePoints}}

# 内容要求
  - 数量: {{fillInBlankCount}}
  - 类型: {{ "单词/短语/句子" }}

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **答案解析要求**：
   - 提供答案和解析

4. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区`,
    jsonExample: `{
  "type": "fillInBlank",
  "title": "三、填空题",
  "questionNumber": 1,
  "questions": [
    {
      "id": 3,
      "question": "I ___ a student.",
      "answer": "am",
      "explanation": "主语是I，be动词应该用am。",
      "knowledgePoint": "介绍常用语"
    }
  ]
}`
  },
  trueFalse: {
    template: `请你根据以下要求生成判断题：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题场景 (theme): {{scenario}}
## 知识点 (knowledgePoints): {{knowledgePoints}}

# 内容要求
  - 数量: {{trueFalseCount}}

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **答案解析要求**：
   - 提供答案和解析

4. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区`,
    jsonExample: `{
  "type": "trueFalse",
  "title": "四、判断题",
  "questionNumber": 1,
  "questions": [
    {
      "id": 4,
      "question": "The sky is blue.",
      "answer": "True",
      "explanation": "天空是蓝色的，所以答案是True。",
      "knowledgePoint": "表示颜色的单词"
    }
  ]
}`
  },
  reading: {
    template: `请你根据以下要求生成阅读理解题：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题场景 (theme): {{scenario}}
## 知识点 (knowledgePoints): {{knowledgePoints}}

# 内容要求
  - 数量: {{readingCount}}
  - 结构要求:
    - 文本长度: {{ "50-80词" if grade<=2 else "100-150词" if grade<=4 else "200-250词" }}
    - 题目类型: {{ ["选择题","判断题"] }}  # 至少包含两种题型

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **答案解析要求**：
   - 提供答案和解析

4. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区`,
    jsonExample: `{
  "type": "reading",
  "title": "五、阅读理解",
  "readingMaterial": "I am a student. I like apples. My favorite color is blue. I have a pet dog named Max.",
  "questionNumber": 1,
  "questions": [
    {
      "id": 5,
      "question": "What is I like?",
      "options": ["I like apples", "I like oranges", "I like pears"],
      "answer": "A",
      "explanation": "从阅读材料中可以找到答案。",
      "knowledgePoint": "表示喜欢的东西"
    }
  ]
}`
  },
  writing: {
    template: `请你根据以下要求生成写作题：

# 试卷元数据 (metadata)
## 年级 (grade): {{grade}} 
## 难度级别 (difficulty): {{difficulty}}  
## 主题场景 (theme): {{scenario}}
## 知识点 (knowledgePoints): {{knowledgePoints}}

# 内容要求
  - 数量: {{writingCount}}

# 核心规则
1. **知识点覆盖**：
   - 每个知识点至少分配 1 道题，1道题可以覆盖多个知识点。
   - 题目必须明确标注考核知识点字段

2. **难度控制**：
   | 难度等级 | 知识点中难点知识占比 | 
   |---------|-------------------|
   | 低难度  | <=5%     |
   | 中等难度  | 5%-10%   |
   | 高难度  | 10%-20%  |

3. **答案解析要求**：
   - 提供评分标准，比如：
      1. 内容完整，符合要求
      2. 语法正确，表达清晰
      3. 格式规范，无错别字
      4. 同时满足上述3点要求的，每个句子得一分

4. **题目生成逻辑**：
   - 题目数量严格按照题型配置中的数量要求生成
   - 题目不能重复
   - 确保题目的难易度与配置的难易度一致
   - 选项设计：错误选项必须基于常见学习误区`,
    jsonExample: `{
  "type": "writing",
  "title": "六、写作题",
  "questionNumber": 1,
  "questions": [
    {
      "id": 6,
      "question": "Write a short essay about your favorite color.",
      "explanation": "评分标准：\n1. 内容完整，符合要求\n2. 语法正确，表达清晰\n3. 格式规范，无错别字\n4. 同时满足上述3点要求的，每个句子得一分",
      "knowledgePoint": "表示颜色的单词"
    }
  ]
}`
  }
};

// 获取题型专用的Prompt模板
export function getQuestionTypePrompt(
  questionType: keyof typeof QUESTION_TYPE_TEMPLATES,
  config: any,
  scenario?: string,
  knowledgePoints?: string
): string {
  const typeTemplate = QUESTION_TYPE_TEMPLATES[questionType];
  if (!typeTemplate) {
    throw new Error(`Unknown question type: ${questionType}`);
  }

  let prompt = typeTemplate.template;
  
  // 替换模板中的变量
  const replacements = {
    grade: config.grade ? getGradeName(config.grade) : '三年级',
    difficulty: config.difficulty || '中等',
    scenario: scenario || config.theme || '日常生活',
    knowledgePoints: knowledgePoints || config.knowledgePoints || '基础词汇和语法',
    listeningCount: config.questionTypes?.listening?.count || 0,
    multipleChoiceCount: config.questionTypes?.multipleChoice?.count || 0,
    fillInBlankCount: config.questionTypes?.fillInBlank?.count || 0,
    trueFalseCount: config.questionTypes?.trueFalse?.count || 0,
    readingCount: config.questionTypes?.reading?.count || 0,
    writingCount: config.questionTypes?.writing?.count || 0
  };

  // 替换所有变量
  Object.entries(replacements).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    prompt = prompt.replace(regex, String(value));
  });

  // 添加JSON示例
  return `${prompt}\n\n${typeTemplate.jsonExample}`;
}

// 获取最终用于生成试卷的prompt（根据配置选择模板+json示例）
export function getFinalPromptTemplate(config: PromptConfig | null): string {
  let template = ""
  
  if (config?.customTemplate) {
    // 用户有自定义模板，使用自定义模板
    template = config.customTemplate
  } else {
    // 根据选择的模板ID获取对应模板
    const selectedTemplate = DEFAULT_TEMPLATES.find(t => t.id === (config?.selectedTemplate || "standard"))
    template = selectedTemplate?.template || DEFAULT_TEMPLATES.find(t => t.id === "standard")?.template || ""
  }
  
  // 检查模板是否已经包含JSON示例，如果没有则添加
  if (!getJsonExampleFromTemplate(template)) {
    return `${template}\n\n${JSON_EXAMPLE}`
  }
  
  return template
}
