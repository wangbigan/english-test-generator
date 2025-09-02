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
import { BookOpen, Settings, FileText, Download, Loader2, Settings2, Upload, Wand2 } from "lucide-react"
import { TestPaper } from "./components/test-paper"
import { generateTestPaperParallel } from "./actions/generate-test"
import { OpenAIConfigDialog } from "./components/openai-config-dialog"
import { PromptConfigDialog } from "./components/prompt-config-dialog"
import { FileUpload } from "./components/file-upload"
import { ThemeAllocationPreview } from "./components/theme-allocation-preview"
import { HistoryRecords } from "./components/history-records"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
// import { DEFAULT_TEMPLATES } from "./components/prompt-config-dialog"
import { generateThemeAndAllocation, ThemeAndAllocationResult } from "./actions/generate-theme-and-allocation"

import { TestConfig, GeneratedTest, PromptConfig, OpenAIConfig } from "./types/shared"
import { historyManager } from "./utils/history-manager"

export default function HomePage() {
  const [config, setConfig] = useState<TestConfig>({
    grade: "1", // 默认1年级
    difficulty: "medium", // 默认中等难度
    theme: "",
    knowledgePoints: "",
    totalScore: 100,
    questionTypes: {
      listening: { count: 10, score: 2 },
      multipleChoice: { count: 10, score: 2 },
      fillInBlank: { count: 10, score: 2 },
      trueFalse: { count: 5, score: 2 },
      reading: { count: 10, score: 2 },
      writing: { count: 1, score: 10 },
    },
  })

  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [showPromptDialog, setShowPromptDialog] = useState(false)
  const [openaiConfig, setOpenaiConfig] = useState<OpenAIConfig | null>(null)
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>({
    selectedTemplate: "standard",
    customTemplate: "",
    variables: {},
  })

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

    const savedPromptConfig = localStorage.getItem("prompt-config")
    if (savedPromptConfig) {
      try {
        setPromptConfig(JSON.parse(savedPromptConfig))
      } catch (error) {
        console.error("Failed to parse saved prompt config:", error)
      }
    }
  }, [])

  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState("config")
  // 历史试卷相关状态
  const [historyTest, setHistoryTest] = useState<GeneratedTest | null>(null)
  const [isViewingHistory, setIsViewingHistory] = useState(false)
  const [promptText, setPromptText] = useState<string>("");
  const [rawResponseText, setRawResponseText] = useState<string>("");
  const [promptOpen, setPromptOpen] = useState<boolean>(false);
  // 新增：存储每个题型的prompt和响应
  const [questionTypePrompts, setQuestionTypePrompts] = useState<Record<string, {prompt: string, response: string}>>({});
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [, setGenerationError] = useState<string | null>(null);
  // 主题场景相关状态
  const [themeAndAllocation, setThemeAndAllocation] = useState<ThemeAndAllocationResult | null>(null);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  const [showThemePreview, setShowThemePreview] = useState(false);

  const handleConfigChange = (key: string, value: string | number) => {
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

  const calculateTotalQuestions = () => {
    const { questionTypes } = config
    return Object.values(questionTypes).reduce((total, type) => total + type.count, 0)
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

    // 清空之前的数据
    setPromptText("")
    setRawResponseText("") 
    setQuestionTypePrompts({}) // 清空题型prompt数据
    setShowPromptPanel(true) // 生成试卷时显示折叠面板
    setGenerationError(null) // 清空之前的错误状态
    setIsGenerating(true)
    try {
      // 使用并行生成功能
      const result = await generateTestPaperParallel(
        configWithCorrectScore, 
        openaiConfig, 
        promptConfig || undefined,
        themeAndAllocation || undefined // 传入已生成的主题场景（如果有）
      )
      
      // 检查是否有返回内容
      if (!result.rawResponse && !result.test) {
        setGenerationError("no_content")
        setGeneratedTest(null)
      } else if (!result.test || !(result.test as Record<string, unknown>).sections || ((result.test as Record<string, unknown>).sections as unknown[])?.length === 0) {
        // 检查返回的试卷结构是否异常
        setGenerationError("invalid_structure")
        setGeneratedTest(null)
      } else {
        // 成功生成试卷
        setGeneratedTest(result.test as GeneratedTest)
        setGenerationError(null)
        
        // 如果生成过程中创建了新的主题场景，保存它
        if (result.themeAndAllocation && !themeAndAllocation) {
          setThemeAndAllocation(result.themeAndAllocation)
        }
        
        // 保存试卷生成历史记录
        try {
          const baseInfo = {
            grade: config.grade,
            difficulty: config.difficulty,
            theme: config.theme,
            knowledgePoints: config.knowledgePoints
          }
          historyManager.addRecord('test', baseInfo, result.test as GeneratedTest)
        } catch (error) {
          console.error('保存试卷历史记录失败:', error)
        }
      }
      
      // 设置题型prompt和响应数据
      if (result.questionTypePrompts) {
        setQuestionTypePrompts(result.questionTypePrompts)
      }
      
      // 设置整体prompt和响应（用于兼容旧的显示方式）
      setPromptText(result.prompt || "")
      setRawResponseText(result.rawResponse || "")
      setActiveTab("preview")
    } catch (error) {
      console.error("生成试卷失败:", error)
      
      // 根据错误类型设置不同的错误状态
      let errorType = "generation_failed"
      let errorMessage = "生成试卷失败，请重试"
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        if (error.message.includes("API密钥") || error.message.includes("API Key")) {
          errorType = "api_key_missing"
        } else if (error.message.includes("Failed to fetch") || error.message.includes("Network")) {
          errorType = "network_error"
        } else if (error.message.includes("No content received") || error.message.includes("未接收到")) {
          errorType = "no_content"
        } else if (error.message.includes("Failed to parse") || error.message.includes("JSON")) {
          errorType = "parse_error"
        } else if (error.message.includes("所有题型生成失败")) {
          errorType = "all_types_failed"
        }
      }
      
      // 设置错误状态，让试卷预览界面显示错误信息
      setGeneratedTest({
        error: true,
        errorType,
        errorMessage
      } as GeneratedTest & { error: boolean; errorType: string; errorMessage: string })
      setGenerationError(errorType)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * 处理知识点提取成功
   * @param points 提取的知识点
   */
  const handleKnowledgePointsExtracted = (points: string) => {
    setConfig((prev) => ({
      ...prev,
      knowledgePoints: points,
    }))
    
    // 保存知识点提取历史记录
    try {
      const baseInfo = {
        grade: config.grade,
        difficulty: config.difficulty,
        theme: config.theme,
        knowledgePoints: points
      }
      const extractResult = {
        extractedPoints: points,
        extractedAt: new Date().toISOString()
      }
      historyManager.addRecord('extract', baseInfo, extractResult)
    } catch (error) {
      console.error('保存知识点提取历史记录失败:', error)
    }
  }

  // 生成主题场景和知识点分配
  const handleGenerateTheme = async () => {
    if (!config.grade || !config.difficulty || !config.theme) {
      alert("请填写完整的基本信息")
      return
    }

    // 检查OpenAI配置
    if (!openaiConfig?.apiKey) {
      setShowConfigDialog(true)
      return
    }

    setIsGeneratingTheme(true)
    setThemeAndAllocation(null) // 清空之前的结果
    try {
      const result = await generateThemeAndAllocation(
        config.theme,
        config.grade,
        config.knowledgePoints,
        config.questionTypes,
        openaiConfig
      )
      setThemeAndAllocation(result)
      setShowThemePreview(true)
      
      // 保存主题场景生成历史记录
      try {
        const baseInfo = {
          grade: config.grade,
          difficulty: config.difficulty,
          theme: config.theme,
          knowledgePoints: config.knowledgePoints
        }
        historyManager.addRecord('theme', baseInfo, result)
      } catch (error) {
        console.error('保存主题场景历史记录失败:', error)
      }
    } catch (error) {
      console.error("生成主题场景失败:", error)
      // 设置错误状态，让ThemeAllocationPreview组件显示错误信息
       setThemeAndAllocation({
         error: true,
         errorMessage: error instanceof Error ? error.message : "生成主题场景失败，请重试",
         errorType: error instanceof Error && error.message.includes("API") ? "api_error" : "generation_error"
       } as ThemeAndAllocationResult & { error: boolean; errorMessage: string; errorType: string })
      setShowThemePreview(true)
    } finally {
      setIsGeneratingTheme(false)
    }
  }

  // 更新主题场景和知识点分配
  const handleThemeUpdate = (updated: ThemeAndAllocationResult) => {
    setThemeAndAllocation(updated)
  }

  /**
   * 应用历史记录中的知识点到当前配置
   * @param record 历史记录
   */
  const handleApplyKnowledgePoints = (record: Record<string, unknown>) => {
    const baseInfo = record.baseInfo as { grade: string; difficulty: string; theme: string; knowledgePoints: string }
    setConfig((prev) => ({
      ...prev,
      grade: baseInfo.grade,
      difficulty: baseInfo.difficulty,
      theme: baseInfo.theme,
      knowledgePoints: baseInfo.knowledgePoints
    }))
    setActiveTab('config')
  }

  /**
   * 应用历史记录中的主题场景到当前配置
   * @param record 历史记录
   */
  const handleApplyThemeScenario = (record: Record<string, unknown>) => {
    // 应用基础配置
    const baseInfo = record.baseInfo as { grade: string; difficulty: string; theme: string; knowledgePoints: string }
    setConfig((prev) => ({
      ...prev,
      grade: baseInfo.grade,
      difficulty: baseInfo.difficulty,
      theme: baseInfo.theme,
      knowledgePoints: baseInfo.knowledgePoints
    }))
    
    // 设置主题场景数据
    setThemeAndAllocation(record.result as ThemeAndAllocationResult)
    
    // 切换到配置页面
    setActiveTab('config')
  }

  /**
   * 基于历史试卷重新生成
   * @param record 历史记录
   */
  const handleRegenerateFromHistory = (record: Record<string, unknown>) => {
    // 应用基础配置
    const baseInfo = record.baseInfo as { grade: string; difficulty: string; theme: string; knowledgePoints: string }
    setConfig((prev) => ({
      ...prev,
      grade: baseInfo.grade,
      difficulty: baseInfo.difficulty,
      theme: baseInfo.theme,
      knowledgePoints: baseInfo.knowledgePoints
    }))
    
    // 切换到配置页面
    setActiveTab('config')
  }

  /**
   * 预览历史试卷
   * @param record 历史记录
   */
  const handlePreviewHistoryTest = (record: Record<string, unknown>) => {
    console.log('预览历史试卷 - 原始记录数据:', record)
    
    // 验证历史记录数据的完整性
    const result = record.result as GeneratedTest
    
    if (!result) {
      alert('历史记录数据异常：缺少试卷内容')
      return
    }
    
    // 验证必要的属性
    if (!result.title) {
      console.warn('历史记录缺少标题，使用默认值')
      result.title = '历史试卷'
    }
    
    if (!Array.isArray(result.sections)) {
      console.warn('历史记录缺少sections数组，使用空数组')
      result.sections = []
    }
    
    // 验证每个section的完整性
    result.sections = result.sections.map((section, index) => {
      if (!section.title) {
        section.title = `第${index + 1}部分`
      }
      if (!Array.isArray(section.questions)) {
        section.questions = []
      }
      // 验证每个问题的完整性
      section.questions = section.questions.map((q, qIndex) => {
        if (!q.question) {
          q.question = `题目 ${qIndex + 1}`
        }
        if (typeof q.points !== 'number') {
          q.points = 5
        }
        return q
      })
      return section
    })
    
    // 确保totalScore存在
    if (typeof result.totalScore !== 'number') {
      result.totalScore = result.sections.reduce((total, section) => {
        return total + (Array.isArray(section.questions) ? 
          section.questions.reduce((sum, q) => sum + (q.points || 0), 0) : 0)
      }, 0) || 100
    }
    
    console.log('验证后的历史试卷数据:', result)
    
    // 设置历史试卷数据
    setHistoryTest(result)
    setIsViewingHistory(true)
    
    // 切换到预览标签页
    setActiveTab('preview')
  }

  /**
   * 处理导出功能
   * @param type - 导出类型：pdf、json、word
   */
  const handleExport = (type: "pdf" | "json" | "word") => {
    const currentTest = isViewingHistory ? historyTest : generatedTest
    
    console.log('导出功能调用:', {
      type,
      isViewingHistory,
      hasHistoryTest: !!historyTest,
      hasGeneratedTest: !!generatedTest,
      currentTest: currentTest
    })
    
    if (!currentTest) {
      const message = isViewingHistory ? "历史试卷数据异常，无法导出" : "请先生成试卷"
      alert(message)
      return
    }
    
    // 对历史记录数据进行额外验证
    if (isViewingHistory) {
      if (!currentTest.title || !Array.isArray(currentTest.sections)) {
        alert('历史试卷数据不完整，无法导出。请返回重新生成试卷。')
        return
      }
      console.log('历史试卷验证通过，开始导出')
    }

    switch (type) {
      case "pdf":
        try {
          console.log('开始PDF导出流程')
          
          // 检测浏览器是否支持window.open
          let printWindow: Window | null = null
          try {
            printWindow = window.open("", "_blank", "width=800,height=600")
          } catch (error) {
            console.error('window.open失败:', error)
          }
          
          // 检查弹窗是否被阻止
          if (!printWindow || printWindow.closed || typeof printWindow.closed === 'undefined') {
            console.warn('弹窗被阻止，尝试备用方案')
            alert('浏览器阻止了弹窗，请允许弹窗后重试，或者使用下载Word功能作为替代方案。')
            return
          }
          
          // 生成完整的HTML内容
          const safeTitle = (currentTest.title || '英语试卷').replace(/["'<>&]/g, (char) => {
            const entities = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }
            return entities[char] || char
          })
          const safeSubtitle = (currentTest.subtitle || '').replace(/["'<>&]/g, (char) => {
            const entities = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }
            return entities[char] || char
          })
          
          // 生成主题信息HTML
          const generateThemeInfoHTML = (test: typeof currentTest) => {
            if (!test.mainTheme && !test.backgroundDescription) return ""
            return `
              <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4a90e2; text-align: left;">
                <h3 style="color: #4a90e2; margin-bottom: 10px; font-size: 16px;">📚 主题背景</h3>
                ${test.mainTheme ? `<p style="margin-bottom: 8px;"><strong>主题：</strong>${test.mainTheme}</p>` : ""}
                ${test.backgroundDescription ? `<p style="margin: 0; color: #555;">${test.backgroundDescription}</p>` : ""}
              </div>
            `
          }
          
          // 生成场景信息HTML
          const generateScenarioInfoHTML = (section: typeof currentTest.sections[0]) => {
            if (!section.scenarioTitle && !section.scenarioDescription) return ""
            return `
              <div style="background-color: #fff5f5; padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 3px solid #e53e3e; font-size: 14px;">
                <h4 style="color: #e53e3e; margin-bottom: 8px; font-size: 14px;">🎭 主题场景</h4>
                ${section.scenarioTitle ? `<p style="margin-bottom: 6px;"><strong>场景：</strong>${section.scenarioTitle}</p>` : ""}
                ${section.scenarioDescription ? `<p style="margin-bottom: 6px; color: #555;">${section.scenarioDescription}</p>` : ""}
                ${section.scenarioKnowledgePoints && section.scenarioKnowledgePoints.length > 0 ? 
                  `<p style="margin: 0; font-size: 12px;"><strong>涉及知识点：</strong>${section.scenarioKnowledgePoints.join('、')}</p>` : ""}
              </div>
            `
          }
          
          const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${safeTitle}</title>
  <style>
    body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin: 15px 0; font-size: 14px; }
    .section { margin-bottom: 30px; page-break-inside: avoid; }
    .section-title { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; }
    .question { margin-bottom: 20px; padding: 10px; border-left: 3px solid #007bff; background-color: #f8f9fa; }
    .options { margin-left: 20px; margin-top: 10px; }
    .option { margin-bottom: 5px; }
    .listening-material { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196f3; }
    @media print { body { margin: 0; } .header { page-break-after: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${safeTitle}</h1>
    ${safeSubtitle ? `<p style="font-size: 18px; color: #666;">${safeSubtitle}</p>` : ''}
    ${generateThemeInfoHTML(currentTest)}
    <div class="info-row">
      <span>姓名：_______________</span>
      <span>班级：_______________</span>
      <span>学号：_______________</span>
      <span style="font-weight: bold;">总分：${currentTest.totalScore || 100}分</span>
    </div>
    ${currentTest.instructions ? `<div style="text-align: left; background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 15px;"><strong>考试说明：</strong><p style="margin-top: 8px;">${currentTest.instructions}</p></div>` : ''}
  </div>
  
  ${currentTest.listeningMaterial ? `<div class="listening-material"><h3 style="color: #1976d2; margin-bottom: 10px;">听力材料</h3><div style="white-space: pre-line;">${currentTest.listeningMaterial}</div></div>` : ''}
  
  ${currentTest.sections.map((section) => {
    const sectionQuestions = Array.isArray(section.questions) ? section.questions : []
    const sectionScore = sectionQuestions.reduce((sum, q) => sum + (q.points || 0), 0)
    return `<div class="section">
      <h2 class="section-title">${section.title} <span style="font-size: 14px; color: #666; font-weight: normal;">(${sectionQuestions.length}题，共${sectionScore}分)</span></h2>
      ${generateScenarioInfoHTML(section)}
      ${sectionQuestions.map((q, qIndex) => {
        const questionText = (q.question || '').replace(/["'<>&]/g, (char) => {
          const entities = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }
          return entities[char] || char
        })
        return `<div class="question">
          <p style="margin-bottom: 10px;"><strong>${qIndex + 1}. ${questionText}</strong> <span style="color: #007bff; font-size: 12px;">(${q.points || 0}分)</span></p>
          ${q.options ? `<div class="options">${q.options.map((opt, optIndex) => {
            const safeOpt = (opt || '').replace(/["'<>&]/g, (char) => {
              const entities = { '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }
              return entities[char] || char
            })
            return `<div class="option"><strong>${String.fromCharCode(65 + optIndex)}.</strong> ${safeOpt}</div>`
          }).join('')}</div>` : '<div style="margin-top: 10px;"><span style="color: #666; font-size: 14px;">答案：</span><span style="border-bottom: 1px solid #333; display: inline-block; width: 200px; height: 20px;"></span></div>'}
        </div>`
      }).join('')}
    </div>`
  }).join('')}
</body>
</html>`
          
          // 写入HTML内容
          try {
            printWindow.document.open()
            printWindow.document.write(htmlContent)
            printWindow.document.close()
            
            // 延迟打印
            setTimeout(() => {
              if (printWindow && !printWindow.closed) {
                printWindow.print()
              }
            }, 1000)
            
          } catch (writeError) {
            console.error('HTML写入失败:', writeError)
            alert('PDF生成失败，请尝试使用Word导出功能作为替代方案。')
            if (printWindow && !printWindow.closed) {
              printWindow.close()
            }
          }
        } catch (error) {
          console.error('PDF导出失败:', error)
          alert("PDF导出失败，请重试")
        }
        break
      case "word":
        // 生成Word格式的主题信息
        const generateWordThemeInfo = (test: typeof currentTest) => {
          if (!test.mainTheme && !test.backgroundDescription) return ""
          return `
            <div style="background-color: #f0f8ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4a90e2; text-align: left;">
              <h3 style="color: #4a90e2; margin-bottom: 10px; font-size: 16px;">📚 主题背景</h3>
              ${test.mainTheme ? `<p style="margin-bottom: 8px;"><strong>主题：</strong>${test.mainTheme}</p>` : ""}
              ${test.backgroundDescription ? `<p style="margin: 0; color: #555;">${test.backgroundDescription}</p>` : ""}
            </div>
          `
        }
        
        // 生成Word格式的场景信息
        const generateWordScenarioInfo = (section: typeof currentTest.sections[0]) => {
          if (!section.scenarioTitle && !section.scenarioDescription) return ""
          return `
            <div style="background-color: #fff5f5; padding: 12px; border-radius: 4px; margin: 10px 0; border-left: 3px solid #e53e3e; font-size: 14px;">
              <h4 style="color: #e53e3e; margin-bottom: 8px; font-size: 14px;">🎭 场景设定</h4>
              ${section.scenarioTitle ? `<p style="margin-bottom: 6px;"><strong>场景：</strong>${section.scenarioTitle}</p>` : ""}
              ${section.scenarioDescription ? `<p style="margin-bottom: 6px; color: #555;">${section.scenarioDescription}</p>` : ""}
              ${section.scenarioKnowledgePoints && section.scenarioKnowledgePoints.length > 0 ? 
                `<p style="margin: 0; font-size: 12px;"><strong>涉及知识点：</strong>${section.scenarioKnowledgePoints.join('、')}</p>` : ""}
            </div>
          `
        }
        
        // 导出Word文档（简单版：用HTML转Blob，后续可升级为真正的docx）
        const wordHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>${currentTest.title}</title>
          </head>
          <body>
            <div style="background: #fffbe6; border-left: 4px solid #ffe58f; color: #ad8b00; padding: 10px 16px; border-radius: 4px; margin-bottom: 18px; font-size: 15px;">
              本试卷内容由AI大模型自动生成，仅供参考。
            </div>
            <h1 style="text-align:center;">${currentTest.title}</h1>
            <p style="text-align:center; font-size: 18px; color: #666;">${currentTest.subtitle}</p>
            ${generateWordThemeInfo(currentTest)}
            <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 14px;">
              <span>姓名：_______________</span>
              <span>班级：_______________</span>
              <span>学号：_______________</span>
              <span style="font-weight: bold;">总分：${currentTest.totalScore}分</span>
            </div>
            <div style="margin-top: 15px; text-align: left; background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
              <strong>考试说明：</strong>
              <p style="margin-top: 8px;">${currentTest.instructions}</p>
            </div>
            ${
              currentTest.listeningMaterial
                ? `<div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #2196f3;">
                    <h3 style="color: #1976d2; margin-bottom: 10px;">听力材料</h3>
                    <div style="white-space: pre-line;">${currentTest.listeningMaterial}</div>
                  </div>`
                : ""
            }
            ${currentTest.sections
              .map(
                (section) => `
                  <div style="margin-bottom: 30px;">
                    <h2 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">
                      ${section.title}
                      <span style="font-size: 14px; color: #666; font-weight: normal;">
                        (${Array.isArray(section.questions) ? section.questions.length : 0}题，共${Array.isArray(section.questions) ? section.questions.reduce((sum, q) => sum + q.points, 0) : 0}分)
                      </span>
                    </h2>
                    ${generateWordScenarioInfo(section)}
                    ${Array.isArray(section.questions)
                      ? section.questions
                          .map(
                            (q, i) => `
                      <div style="margin-bottom: 20px; padding: 10px; border-left: 3px solid #007bff; background-color: #f8f9fa;">
                        <p style="margin-bottom: 10px;"><strong>${i + 1}. ${q.question}</strong> <span style="color: #007bff; font-size: 12px;">(${q.points}分)</span></p>
                        ${
                          q.options
                            ? `<div style="margin-left: 20px; margin-top: 10px;">
                                ${q.options
                                  .map(
                                    (opt, j) => `<div style="margin-bottom: 5px;"><strong>${String.fromCharCode(65 + j)}.</strong> ${opt}</div>`
                                  )
                                  .join("")}
                              </div>`
                            : `<div style="margin-top: 10px;"><span style="color: #666; font-size: 14px;">答案：</span><span style="border-bottom: 1px solid #333; display: inline-block; width: 200px; height: 20px;"></span></div>`
                        }
                      </div>
                    `
                          )
                          .join("")
                      : ""
                    }
                  </div>
                `
              )
              .join("")}
            <div style="page-break-before: always; margin-top: 40px;"></div>
            <div style="background: #fffbe6; border-left: 4px solid #ffe58f; color: #ad8b00; padding: 10px 16px; border-radius: 4px; margin-bottom: 18px; font-size: 15px;">
              本试卷内容由AI大模型自动生成，仅供参考。
            </div>
            <h1>答案与解析</h1>
            <p style="font-size: 18px; color: #666;">${currentTest.title}</p>
            ${(() => {
              let qNum = 1;
              let html = "";
              currentTest.sections.forEach(section => {
                if (Array.isArray(section.questions)) {
                  section.questions.forEach(q => {
                    html += `
                      <div style="margin-bottom: 20px; padding: 15px; border-left: 4px solid #4caf50; background-color: #f1f8e9;">
                        <div style="font-weight: bold; color: #2e7d32; margin-bottom: 8px;">第${qNum++}题 - 答案：${q.answer ?? "-"}</div>
                        <div style="color: #555; font-size: 14px; line-height: 1.5;">${q.explanation ?? "-"}</div>
                      </div>
                    `;
                  });
                }
              });
              return html;
            })()}
          </body>
          </html>
        `;
        const wordBlob = new Blob([wordHtml], { type: "application/msword" });
        const wordUrl = URL.createObjectURL(wordBlob);
        const wordLink = document.createElement("a");
        wordLink.href = wordUrl;
        // 生成安全的文件名，只过滤文件系统不允许的字符
        const safeTitle = (currentTest.title || "英语试卷").replace(/[/\\:*?"<>|]/g, "").trim() || "英语试卷";
        wordLink.download = `${safeTitle}_试卷.doc`;
        document.body.appendChild(wordLink);
        wordLink.click();
        document.body.removeChild(wordLink);
        URL.revokeObjectURL(wordUrl);
        break
      case "json":
        // 下载完整的JSON文件，包含所有数据
        const completeData = {
          ...currentTest,
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
        // 生成安全的文件名，只过滤文件系统不允许的字符
        const safeTitleForJson = (currentTest.title || "英语试卷").replace(/[/\\:*?"<>|]/g, "").trim() || "英语试卷";
        link.download = `${safeTitleForJson}_完整数据.json`
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
          <div className="flex justify-center gap-3">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPromptDialog(true)}
              className="flex items-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Prompt 配置
              {promptConfig && (
                <Badge variant="secondary" className="ml-1">
                  {promptConfig.selectedTemplate}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              试卷配置
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              试卷预览
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              历史记录
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              导出下载
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    <div className="mt-2">
                      <Label className="text-sm text-gray-600 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        或上传文档自动提取知识点
                      </Label>
                      <div className="mt-1">
                        <FileUpload
                          onKnowledgePointsExtracted={handleKnowledgePointsExtracted}
                          openaiConfig={openaiConfig}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* 主题场景生成按钮 */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">主题场景设计</Label>
                      {themeAndAllocation && (
                        <Badge variant="secondary" className="text-xs">
                          已生成
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateTheme}
                        disabled={isGeneratingTheme || !config.theme}
                        className="flex-1"
                      >
                        {isGeneratingTheme ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            生成主题场景
                          </>
                        )}
                      </Button>
                      {themeAndAllocation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowThemePreview(true)}
                        >
                          预览
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      为每种题型设计具体场景并分配知识点（可选，生成试卷时会自动创建）
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 题型配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>题型配置</CardTitle>
                  <CardDescription>设置各题型的数量和分值（总数建议不超过50题，否则可能会超出大模型输出长度限制）</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 按照题目顺序重新排列 */}
                  {[
                    { key: "listening", name: "听力题" },
                    { key: "multipleChoice", name: "选择题" },
                    { key: "fillInBlank", name: "填空题" },
                    { key: "trueFalse", name: "判断题" },
                    { key: "reading", name: "阅读理解" },
                    { key: "writing", name: "写作题" },
                  ].map(({ key, name }) => {
                    const settings = config.questionTypes[key as keyof TestConfig["questionTypes"]]
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{name}</Label>
                          <Badge variant="outline">
                            {settings.count}题 × {settings.score}分 = {settings.count * settings.score}分
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            {/* <Label className="text-xs text-gray-500">题目数量</Label> */}
                            <Slider
                              value={[settings.count]}
                              onValueChange={([value]) =>
                                handleQuestionTypeChange(key as keyof TestConfig["questionTypes"], "count", value)
                              }
                              max={key === "writing" ? 3 : 20}
                              min={0}
                              step={1}
                              className="mt-1"
                            />
                            <div className="text-xs text-gray-500 mt-1">{settings.count}题</div>
                          </div>
                          <div>
                            {/* <Label className="text-xs text-gray-500">每题分值</Label> */}
                            <Slider
                              value={[settings.score]}
                              onValueChange={([value]) =>
                                handleQuestionTypeChange(key as keyof TestConfig["questionTypes"], "score", value)
                              }
                              max={key === "writing" ? 20 : 10}
                              min={1}
                              step={1}
                              className="mt-1"
                            />
                            <div className="text-xs text-gray-500 mt-1">{settings.score}分/题</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-medium">题目总数</span>
                      <Badge variant="outline" className="text-lg px-3 py-1">{calculateTotalQuestions()}题</Badge>
                    </div>
                    <div className="flex justify-between items-center mt-1">
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
            {/* 历史试卷查看提示 */}
            {isViewingHistory && historyTest && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-800 font-medium">正在查看历史试卷</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsViewingHistory(false)
                      setHistoryTest(null)
                    }}
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                  >
                    返回当前试卷
                  </Button>
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  您可以使用下方的导出功能下载此历史试卷，或点击&quot;返回当前试卷&quot;查看最新生成的试卷。
                </p>
              </div>
            )}
            
            {/* 显示试卷内容 */}
            {(isViewingHistory ? historyTest : generatedTest) && !((isViewingHistory ? historyTest : generatedTest) && 'error' in (isViewingHistory ? historyTest! : generatedTest!)) ? (
              <TestPaper test={isViewingHistory ? historyTest! : generatedTest!} />
            ) : (isViewingHistory ? historyTest : generatedTest) && 'error' in (isViewingHistory ? historyTest! : generatedTest!) ? (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-12">
                  <div className="text-center mb-6">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-red-700 mb-2">试卷生成失败</h2>
                    <p className="text-red-600">生成过程中出现了问题</p>
                  </div>
                  
                  <div className="max-w-4xl mx-auto space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-red-200">
                      <h4 className="font-medium text-red-800 mb-2">错误详情：</h4>
                      <p className="text-red-700">{(generatedTest as unknown as GeneratedTest & { errorMessage: string }).errorMessage}</p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">建议解决方案：</h4>
                      <ul className="text-blue-700 space-y-1 text-sm">
                        {(generatedTest as unknown as GeneratedTest & { errorType: string }).errorType === 'api_key_missing' ? (
                          <>
                            <li>• 点击右上角的&quot;设置&quot;按钮配置API密钥</li>
                            <li>• 确保API密钥格式正确且有效</li>
                            <li>• 检查API密钥是否有足够的额度</li>
                          </>
                        ) : (generatedTest as unknown as GeneratedTest & { errorType: string }).errorType === 'network_error' ? (
                          <>
                            <li>• 检查网络连接是否正常</li>
                            <li>• 确认API服务地址配置正确</li>
                            <li>• 检查防火墙或代理设置</li>
                            <li>• 稍后重试</li>
                          </>
                        ) : (generatedTest as unknown as GeneratedTest & { errorType: string }).errorType === 'no_content' ? (
                          <>
                            <li>• 大模型未返回任何内容，可能是服务暂时不可用</li>
                            <li>• 尝试简化试卷配置（减少题目数量）</li>
                            <li>• 更换其他大模型尝试</li>
                            <li>• 稍后重试</li>
                          </>
                        ) : (generatedTest as unknown as GeneratedTest & { errorType: string }).errorType === 'parse_error' ? (
                          <>
                            <li>• 大模型返回的格式不正确</li>
                            <li>• 尝试重新生成</li>
                            <li>• 简化主题描述和知识点</li>
                            <li>• 更换其他大模型尝试</li>
                          </>
                        ) : (generatedTest as unknown as GeneratedTest & { errorType: string }).errorType === 'all_types_failed' ? (
                          <>
                            <li>• 所有题型都生成失败，可能是配置问题</li>
                            <li>• 检查题型配置是否合理</li>
                            <li>• 简化主题和知识点描述</li>
                            <li>• 减少题目数量后重试</li>
                          </>
                        ) : (
                          <>
                            <li>• 检查网络连接和API配置</li>
                            <li>• 尝试简化试卷配置</li>
                            <li>• 更换其他大模型尝试</li>
                            <li>• 稍后重试</li>
                          </>
                        )}
                      </ul>
                    </div>
                    
                    <div className="text-center">
                      <Button 
                        onClick={() => {
                          setActiveTab("config")
                          setIsViewingHistory(false)
                          setHistoryTest(null)
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        返回配置页面重新生成
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {isViewingHistory ? "历史试卷数据异常" : "请先配置并生成试卷"}
                  </p>
                  {isViewingHistory && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setIsViewingHistory(false)
                        setHistoryTest(null)
                      }}
                    >
                      返回当前试卷
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history">
            <HistoryRecords
              onApplyKnowledgePoints={handleApplyKnowledgePoints}
              onApplyThemeScenario={handleApplyThemeScenario}
              onRegenerateFromHistory={handleRegenerateFromHistory}
              onPreviewHistoryTest={handlePreviewHistoryTest}
            />
          </TabsContent>

          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>导出选项</CardTitle>
                <CardDescription>选择导出格式和选项</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 历史试卷导出提示 */}
                {isViewingHistory && historyTest && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-blue-800 text-sm font-medium">正在导出历史试卷</span>
                    </div>
                    <p className="text-blue-700 text-xs mt-1">
                      当前导出的是历史试卷内容，如需导出最新生成的试卷，请先返回当前试卷。
                    </p>
                  </div>
                )}
                
                {!(isViewingHistory ? historyTest : generatedTest) ? (
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
                    <p className="text-gray-500">
                      {isViewingHistory ? "历史试卷数据异常，无法导出" : "请先生成试卷后再导出"}
                    </p>
                    {isViewingHistory && (
                      <Button
                        className="mt-4"
                        onClick={() => {
                          setIsViewingHistory(false)
                          setHistoryTest(null)
                        }}
                      >
                        返回当前试卷
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-4 mt-4 w-full">
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2 bg-transparent flex-1"
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
                        className="h-24 flex flex-col gap-2 bg-transparent flex-1"
                        onClick={() => handleExport("word")}
                      >
                        <FileText className="w-8 h-8" />
                        <div className="text-center">
                          <div className="font-medium">下载Word</div>
                          <div className="text-xs text-gray-500">包含题目和答案解析</div>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 flex flex-col gap-2 bg-transparent flex-1"
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
                        <strong>下载Word：</strong>生成包含试卷题目和答案解析的Word文档，适合编辑和二次排版
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

      <PromptConfigDialog
        open={showPromptDialog}
        onOpenChange={setShowPromptDialog}
        config={promptConfig}
        onConfigSave={(newConfig) => {
          setPromptConfig(newConfig)
          localStorage.setItem("prompt-config", JSON.stringify(newConfig))
          setShowPromptDialog(false)
        }}
      />

      {/* 主题场景预览对话框 */}
      {showThemePreview && themeAndAllocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ThemeAllocationPreview
                themeAndAllocation={themeAndAllocation}
                onUpdate={handleThemeUpdate}
                onClose={() => setShowThemePreview(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Prompt 折叠面板 */}
      {showPromptPanel && (
        <div className="max-w-6xl mx-auto my-6">
          <Accordion type="single" collapsible value={promptOpen ? "prompt" : undefined} onValueChange={(v: string | undefined) => setPromptOpen(!!v)}>
            <AccordionItem value="prompt">
              <AccordionTrigger>大模型的输入输出</AccordionTrigger>
              <AccordionContent>
                {questionTypePrompts && Object.keys(questionTypePrompts).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(questionTypePrompts).map(([questionType, data]) => (
                      <div key={questionType} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-4 text-lg">
                          {questionType === 'listening' && '听力理解'}
                          {questionType === 'multipleChoice' && '选择题'}
                          {questionType === 'fillInBlank' && '填空题'}
                          {questionType === 'trueFalse' && '判断题'}
                          {questionType === 'reading' && '阅读理解'}
                          {questionType === 'writing' && '写作题'}
                        </h3>
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium mb-2 text-blue-600">输入：提交给大模型的Prompt</div>
                            <pre className="whitespace-pre-wrap text-sm bg-blue-50 p-4 rounded border overflow-x-auto max-h-96">{data.prompt}</pre>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium mb-2 text-green-600">输出：大模型返回的内容</div>
                            <pre className="whitespace-pre-wrap text-sm bg-green-50 p-4 rounded border overflow-x-auto max-h-96">{data.response}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 min-w-0 max-w-full md:max-w-[48%]">
                      <div className="font-semibold mb-2">输入：提交给大模型的Prompt原文</div>
                      {promptText ? (
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border overflow-x-auto">{promptText}</pre>
                      ) : (
                        <div className="text-gray-400 text-center py-8">请先生成试卷后查看Prompt原文</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 max-w-full md:max-w-[48%]">
                      <div className="font-semibold mb-2">输出：大模型返回的原始内容</div>
                      {rawResponseText ? (
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border overflow-x-auto">{rawResponseText}</pre>
                      ) : (
                        <div className="text-gray-400 text-center py-8">暂无AI返回内容（本地样卷或尚未生成）</div>
                      )}
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  )
}
