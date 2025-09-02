import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2, Save, X, Settings } from "lucide-react"
import { GeneratedTest } from "@/app/types/shared"
import { 
  MaterialSection, 
  ScenarioSection, 
  OptionsSection, 
  AnswerArea, 
  SectionHeader, 
  WarningBanner 
} from "./test-paper-utils"

/**
 * TestPaper组件的属性接口
 * 扩展支持历史记录功能
 */
interface TestPaperProps {
  /** 试卷数据 */
  test: GeneratedTest
  /** 是否为历史记录查看模式 */
  isHistoryView?: boolean
  /** 是否显示标题编辑功能 */
  showTitle?: boolean
  /** 标题编辑回调 */
  onTitleEdit?: (newTitle: string) => void
  /** 基于此试卷重新生成的回调 */
  onRegenerate?: (testConfig: Record<string, unknown>) => void
  /** 关闭回调 */
  onClose?: () => void
}

export function TestPaper({ 
  test, 
  isHistoryView = false, 
  showTitle = false, 
  onTitleEdit, 
  onRegenerate, 
  onClose 
}: TestPaperProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(test.title)

  /**
   * 处理标题保存
   */
  const handleTitleSave = () => {
    if (onTitleEdit && editedTitle.trim()) {
      onTitleEdit(editedTitle.trim())
    }
    setIsEditingTitle(false)
  }

  /**
   * 处理标题取消编辑
   */
  const handleTitleCancel = () => {
    setEditedTitle(test.title)
    setIsEditingTitle(false)
  }

  /**
   * 处理基于此试卷重新生成
   */
  const handleRegenerate = () => {
    if (onRegenerate) {
      // 从试卷数据中提取配置信息
      const testConfig = {
        // 这里需要根据试卷数据推断原始配置
        // 实际实现时可能需要在试卷数据中保存原始配置
        title: test.title,
        subtitle: test.subtitle,
        totalScore: test.totalScore
      }
      onRegenerate(testConfig)
    }
  }

  return (
    <div className="w-full">
      {/* 历史记录模式的头部操作栏 */}
      {isHistoryView && (
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            {showTitle && (
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="flex-1 max-w-md"
                      placeholder="输入试卷标题"
                    />
                    <Button size="sm" onClick={handleTitleSave}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleTitleCancel}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{test.title}</h3>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(true)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* 基于此试卷重新生成按钮 */}
            <Button onClick={handleRegenerate} className="bg-green-600 hover:bg-green-700">
              <Settings className="w-4 h-4 mr-2" />
              基于此试卷重新生成
            </Button>
            {/* 关闭按钮 */}
            {onClose && (
              <Button onClick={onClose} variant="outline">
                <X className="w-4 h-4 mr-2" />
                关闭
              </Button>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="questions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions">试卷题目</TabsTrigger>
          <TabsTrigger value="answers">答案解析</TabsTrigger>
        </TabsList>

      <TabsContent value="questions">
        <Card className="max-w-4xl mx-auto">
          <WarningBanner />
          <CardHeader className="text-center space-y-4">
            <div>
              <h1 className="text-2xl font-bold">{test.title}</h1>
              <p className="text-lg text-gray-600 mt-2">{test.subtitle}</p>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span>姓名：_______________</span>
              <span>班级：_______________</span>
              <span>学号：_______________</span>
              <Badge className="ml-4">总分：{test.totalScore}分</Badge>
            </div>
            <Separator />
            <div className="text-left text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
              <strong>考试说明：</strong>
              <p className="mt-2">{test.instructions}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* 主题信息展示 */}
            {test.mainTheme && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h2 className="text-lg font-semibold text-blue-800">
                  主题：{test.mainTheme}
                </h2>
                {test.backgroundDescription && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {test.backgroundDescription}
                  </p>
                )}
              </div>
            )}
            
            {/* 听力材料 */}
            {test.listeningMaterial && (
              <MaterialSection 
                material={test.listeningMaterial}
                title="听力材料"
                bgColor="bg-blue-50"
                borderColor="border-blue-400"
                textColor="text-blue-800"
              />
            )}

            {test.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <SectionHeader 
                  title={section.title}
                  questionsLength={section.questions.length}
                  totalScore={section.totalScore}
                  questions={section.questions}
                />
                
                {/* 显示题型的主题场景信息 */}
                {section.scenarioDescription && (
                  <ScenarioSection 
                    scenarioTitle={section.scenarioTitle}
                    scenarioDescription={section.scenarioDescription}
                    scenarioKnowledgePoints={section.scenarioKnowledgePoints}
                  />
                )}

                {/* 渲染听力材料 */}
                {section.listeningMaterial && (
                  <MaterialSection 
                    material={section.listeningMaterial}
                    title="听力材料"
                    bgColor="bg-blue-50"
                    borderColor="border-blue-400"
                    textColor="text-blue-800"
                  />
                )}

                {/* 渲染阅读材料 */}
                {section.readingMaterial && (
                  <MaterialSection 
                    material={section.readingMaterial}
                    title="阅读材料"
                    bgColor="bg-green-50"
                    borderColor="border-green-400"
                    textColor="text-green-800"
                  />
                )}

                <div className="space-y-6">
                  {section.questions.map((question, questionIndex) => (
                    <div key={question.id} className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-blue-600 min-w-[2rem]">{questionIndex + 1}.</span>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <p className="text-gray-800 leading-relaxed">{question.question}</p>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {question.points}分
                            </Badge>
                          </div>

                          {/* 选择题选项 */}
                          {question.options && (
                            <OptionsSection options={question.options} />
                          )}

                          {/* 答题区域 */}
                          {!question.options && (
                            <AnswerArea sectionType={section.type} />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="answers">
        <Card className="max-w-4xl mx-auto">
          <WarningBanner />
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold">答案与解析</h2>
            <p className="text-gray-600">{test.title}</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {test.sections.map((section, sectionIndex) => {
              if (!section.questions || section.questions.length === 0) return null;
              
              return (
                <div key={sectionIndex} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">{section.title}</h3>
                    <Badge variant="outline" className="text-gray-600">
                      {section.questions.length}题，共{section.totalScore || section.questions.reduce((sum, q) => sum + q.points, 0)}分
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {section.questions.map((question, questionIndex) => (
                      <div key={`${sectionIndex}-${questionIndex}`} className="border-l-4 border-green-400 pl-4 py-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-600">第{questionIndex + 1}题</span>
                          <Badge variant="outline" className="text-green-600 border-green-300">
                            答案：{question.answer ?? "-"}
                          </Badge>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed">{question.explanation ?? "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  )
}
