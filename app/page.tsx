"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Settings, FileText, Download, Loader2, Settings2 } from "lucide-react"
import { TestPaper } from "./components/test-paper"
import { generateTestPaper } from "./actions/generate-test"
import { OpenAIConfigDialog } from "./components/openai-config-dialog"

interface TestConfig {
  grade: string
  difficulty: string
  theme: string
  knowledgePoints: string
  totalScore: number
  questionTypes: {
    multipleChoice: { count: number; score: number }
    fillInBlank: { count: number; score: number }
    reading: { count: number; score: number }
    writing: { count: number; score: number }
    listening: { count: number; score: number }
  }
}

interface GeneratedTest {
  title: string
  subtitle: string
  instructions: string
  sections: Array<{
    type: string
    title: string
    questions: Array<{
      id: number
      question: string
      options?: string[]
      answer?: string
      points: number
      explanation?: string
    }>
  }>
  totalScore: number
  listeningMaterial?: string
  answerKey: Array<{
    id: number
    answer: string
    explanation: string
  }>
}

export default function HomePage() {
  const [config, setConfig] = useState<TestConfig>({
    grade: "1", // 默认1年级
    difficulty: "medium", // 默认中等难度
    theme: "",
    knowledgePoints: "",
    totalScore: 100,
    questionTypes: {
      listening: { count: 5, score: 6 },
      multipleChoice: { count: 10, score: 2 },
      fillInBlank: { count: 10, score: 2 },
      reading: { count: 5, score: 4 },
      writing: { count: 1, score: 10 },
    },
  })

  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [openaiConfig, setOpenaiConfig] = useState<{
    apiKey: string
    baseUrl: string
    model: string
  } | null>(null)

  // 检查本地存储的配置
  useEffect(() => {
    const savedConfig = localStorage.getItem("openai-config")
    if (savedConfig) {
      try {
        setOpenaiConfig(JSON.parse(savedConfig))
      } catch (error) {
        console.error("Failed to parse saved config:", error)
      }
    }
  }, [])

  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("config")

  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleQuestionTypeChange = (
    type: keyof TestConfig["questionTypes"],
    field: "count" | "score",
    value: number,
  ) => {
    setConfig((prev) => ({
      ...prev,
      questionTypes: {
        ...prev.questionTypes,
        [type]: {
          ...prev.questionTypes[type],
          [field]: value,
        },
      },
    }))
  }

  const calculateTotalScore = () => {
    const { questionTypes } = config
    return Object.values(questionTypes).reduce((total, type) => total + type.count * type.score, 0)
  }

  const handleGenerate = async () => {
    if (!config.grade || !config.difficulty || !config.theme) {
      alert("请填写完整的基本信息")
      return
    }

    // 检查OpenAI配置
    if (!openaiConfig?.apiKey) {
      setShowConfigDialog(true)
      return
    }

    // 计算实际总分并更新配置
    const actualTotalScore = calculateTotalScore()
    const configWithCorrectScore = {
      ...config,
      totalScore: actualTotalScore,
    }

    setIsGenerating(true)
    try {
      const result = await generateTestPaper(configWithCorrectScore, openaiConfig)
      setGeneratedTest(result)
      setActiveTab("preview")
    } catch (error) {
      console.error("生成试卷失败:", error)
      alert("生成试卷失败，请重试")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = (type: "pdf" | "json") => {
    if (!generatedTest) {
      alert("请先生成试卷")
      return
    }

    switch (type) {
      case "pdf":
        // 使用浏览器的打印功能生成PDF，包含答案解析
        const printWindow = window.open("", "_blank")
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${generatedTest.title}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 20px; 
                  line-height: 1.6;
                }
                .header { 
                  text-align: center; 
                  margin-bottom: 30px; 
                  border-bottom: 2px solid #333;
                  padding-bottom: 20px;
                }
                .section { 
                  margin-bottom: 30px; 
                  page-break-inside: avoid;
                }
                .question { 
                  margin-bottom: 20px; 
                  padding: 10px;
                  border-left: 3px solid #007bff;
                  background-color: #f8f9fa;
                }
                .options { 
                  margin-left: 20px; 
                  margin-top: 10px;
                }
                .option-item {
                  margin-bottom: 5px;
                }
                .listening-material {
                  background-color: #e3f2fd;
                  padding: 15px;
                  border-radius: 5px;
                  margin-bottom: 20px;
                  border-left: 4px solid #2196f3;
                }
                .answer-section {
                  page-break-before: always;
                  margin-top: 40px;
                }
                .answer-item {
                  margin-bottom: 20px;
                  padding: 15px;
                  border-left: 4px solid #4caf50;
                  background-color: #f1f8e9;
                }
                .answer-header {
                  font-weight: bold;
                  color: #2e7d32;
                  margin-bottom: 8px;
                }
                .explanation {
                  color: #555;
                  font-size: 14px;
                  line-height: 1.5;
                }
                @media print { 
                  body { margin: 0; }
                  .page-break { page-break-before: always; }
                }
              </style>
            </head>
            <body>
              <!-- 试卷题目部分 -->
              <div class="header">
                <h1>${generatedTest.title}</h1>
                <p style="font-size: 18px; color: #666;">${generatedTest.subtitle}</p>
                <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 14px;">
                  <span>姓名：_______________</span>
                  <span>班级：_______________</span>
                  <span>学号：_______________</span>
                  <span style="font-weight: bold;">总分：${generatedTest.totalScore}分</span>
                </div>
                <div style="margin-top: 15px; text-align: left; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
                  <strong>考试说明：</strong>
                  <p style="margin-top: 8px;">${generatedTest.instructions}</p>
                </div>
              </div>

              ${
                generatedTest.listeningMaterial
                  ? `
                <div class="listening-material">
                  <h3 style="color: #1976d2; margin-bottom: 10px;">听力材料</h3>
                  <div style="white-space: pre-line;">${generatedTest.listeningMaterial}</div>
                </div>
              `
                  : ""
              }

              ${generatedTest.sections
                .map(
                  (section) => `
                <div class="section">
                  <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                    ${section.title} 
                    <span style="font-size: 14px; color: #666; font-weight: normal;">
                      (${section.questions.length}题，共${section.questions.reduce((sum, q) => sum + q.points, 0)}分)
                    </span>
                  </h2>
                  ${section.questions
                    .map(
                      (q, i) => `
                    <div class="question">
                      <p style="margin-bottom: 10px;">
                        <strong>${i + 1}. ${q.question}</strong> 
                        <span style="color: #007bff; font-size: 12px;">(${q.points}分)</span>
                      </p>
                      ${
                        q.options
                          ? `
                        <div class="options">
                          ${q.options
                            .map(
                              (opt, j) => `
                            <div class="option-item">
                              <strong>${String.fromCharCode(65 + j)}.</strong> ${opt}
                            </div>
                          `,
                            )
                            .join("")}
                        </div>
                      `
                          : `
                        <div style="margin-top: 10px;">
                          <span style="color: #666; font-size: 14px;">答案：</span>
                          <span style="border-bottom: 1px solid #333; display: inline-block; width: 200px; height: 20px;"></span>
                        </div>
                      `
                      }
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `,
                )
                .join("")}

              <!-- 答案解析部分 -->
              <div class="answer-section page-break">
                <div class="header">
                  <h1>答案与解析</h1>
                  <p style="font-size: 18px; color: #666;">${generatedTest.title}</p>
                </div>
                
                ${generatedTest.answerKey
                  .map(
                    (item, index) => `
                  <div class="answer-item">
                    <div class="answer-header">
                      第${index + 1}题 - 答案：${item.answer}
                    </div>
                    <div class="explanation">${item.explanation}</div>
                  </div>
                `,
                  )
                  .join("")}
              </div>
            </body>
            </html>
          `)
          printWindow.document.close()
          printWindow.print()
        }
        break
      case "json":
        // 下载完整的JSON文件，包含所有数据
        const completeData = {
          ...generatedTest,
          exportTime: new Date().toISOString(),
          config: {
            grade: config.grade,
            difficulty: config.difficulty,
            theme: config.theme,
            knowledgePoints: config.knowledgePoints,
            questionTypes: config.questionTypes,
          },
        }
        const dataStr = JSON.stringify(completeData, null, 2)
        const dataBlob = new Blob([dataStr], { type: "application/json" })
        const url = URL.createObjectURL(dataBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${generatedTest.title.replace(/[^\w\s]/gi, "")}_完整数据.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">小学英语试卷生成器</h1>
          <p className="text-lg text-gray-600 mb-4">基于AI大模型，智能生成个性化英语试卷</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfigDialog(true)}
            className="flex items-center gap-2"
          >
            <Settings2 className="w-4 h-4" />
            OpenAI 配置
            {openaiConfig?.apiKey && (
              <Badge variant="secondary" className="ml-1">
                已配置
              </Badge>
            )}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              试卷配置
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              试卷预览
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出下载
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 基本设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    基本设置
                  </CardTitle>
                  <CardDescription>设置试卷的基本参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="grade">年级</Label>
                      <Select value={config.grade} onValueChange={(value) => handleConfigChange("grade", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择年级" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">一年级</SelectItem>
                          <SelectItem value="2">二年级</SelectItem>
                          <SelectItem value="3">三年级</SelectItem>
                          <SelectItem value="4">四年级</SelectItem>
                          <SelectItem value="5">五年级</SelectItem>
                          <SelectItem value="6">六年级</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="difficulty">难度等级</Label>
                      <Select
                        value={config.difficulty}
                        onValueChange={(value) => handleConfigChange("difficulty", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择难度" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低难度</SelectItem>
                          <SelectItem value="medium">中等难度</SelectItem>
                          <SelectItem value="high">高难度</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="theme">试卷主题</Label>
                    <Input
                      id="theme"
                      placeholder="例如：动物、家庭、学校生活等"
                      value={config.theme}
                      onChange={(e) => handleConfigChange("theme", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="knowledgePoints">重点知识点</Label>
                    <Textarea
                      id="knowledgePoints"
                      placeholder="描述需要重点考核的知识点，如：现在进行时、一般过去时、词汇量等"
                      value={config.knowledgePoints}
                      onChange={(e) => handleConfigChange("knowledgePoints", e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 题型配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>题型配置</CardTitle>
                  <CardDescription>设置各题型的数量和分值（按出题顺序排列）</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 按照题目顺序重新排列 */}
                  {[
                    { key: "listening", name: "听力题（第一部分）" },
                    { key: "multipleChoice", name: "选择题（4个选项）" },
                    { key: "fillInBlank", name: "填空题" },
                    { key: "reading", name: "阅读理解" },
                    { key: "writing", name: "写作题（最后部分）" },
                  ].map(({ key, name }) => {
                    const settings = config.questionTypes[key as keyof TestConfig["questionTypes"]]
                    return (
                      <div key={key} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{name}</Label>
                          <Badge variant="outline">
                            {settings.count}题 × {settings.score}分 = {settings.count * settings.score}分
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-gray-500">题目数量</Label>
                            <Slider
                              value={[settings.count]}
                              onValueChange={([value]) =>
                                handleQuestionTypeChange(key as keyof TestConfig["questionTypes"], "count", value)
                              }
                              max={key === "writing" ? 3 : 20}
                              min={0}
                              step={1}
                              className="mt-2"
                            />
                            <div className="text-xs text-gray-500 mt-1">{settings.count}题</div>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">每题分值</Label>
                            <Slider
                              value={[settings.score]}
                              onValueChange={([value]) =>
                                handleQuestionTypeChange(key as keyof TestConfig["questionTypes"], "score", value)
                              }
                              max={key === "writing" ? 30 : 20}
                              min={1}
                              step={1}
                              className="mt-2"
                            />
                            <div className="text-xs text-gray-500 mt-1">{settings.score}分/题</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">总分</span>
                      <Badge className="text-lg px-3 py-1">{calculateTotalScore()}分</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleGenerate} disabled={isGenerating} size="lg" className="px-8">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在生成试卷...
                  </>
                ) : (
                  "生成试卷"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview">
            {generatedTest ? (
              <TestPaper test={generatedTest} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-500">请先配置并生成试卷</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>导出选项</CardTitle>
                <CardDescription>选择导出格式和选项</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!generatedTest ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
                    <p className="text-gray-500">请先生成试卷后再导出</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2 bg-transparent"
                        onClick={() => handleExport("pdf")}
                      >
                        <Download className="w-8 h-8" />
                        <div className="text-center">
                          <div className="font-medium">下载PDF</div>
                          <div className="text-xs text-gray-500">包含题目和答案解析</div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2 bg-transparent"
                        onClick={() => handleExport("json")}
                      >
                        <FileText className="w-8 h-8" />
                        <div className="text-center">
                          <div className="font-medium">导出数据</div>
                          <div className="text-xs text-gray-500">包含题目和答案解析的试卷JSON数据</div>
                        </div>
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500 space-y-2">
                      <p>
                        <strong>下载PDF：</strong>生成包含试卷题目和答案解析的完整PDF文件，适合打印和分发
                      </p>
                      <p>
                        <strong>导出数据：</strong>
                        下载包含试卷配置、题目、答案和解析的完整JSON数据文件，可用于备份或二次开发
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <OpenAIConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        config={openaiConfig}
        onConfigSave={(newConfig) => {
          setOpenaiConfig(newConfig)
          localStorage.setItem("openai-config", JSON.stringify(newConfig))
          setShowConfigDialog(false)
        }}
      />
    </div>
  )
}
