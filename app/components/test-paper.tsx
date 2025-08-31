import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeneratedTest } from "@/app/types/shared"
import { 
  MaterialSection, 
  ScenarioSection, 
  OptionsSection, 
  AnswerArea, 
  SectionHeader, 
  WarningBanner 
} from "./test-paper-utils"

interface TestPaperProps {
  test: GeneratedTest
}

export function TestPaper({ test }: TestPaperProps) {
  return (
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
  )
}
