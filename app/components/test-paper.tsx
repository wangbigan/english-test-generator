import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TestPaperProps {
  test: {
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
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                <h3 className="font-semibold text-blue-800 mb-2">听力材料</h3>
                <div className="text-sm text-blue-700 whitespace-pre-line">{test.listeningMaterial}</div>
              </div>
            )}

            {test.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <Badge variant="outline">
                    {section.questions.length}题，共{section.questions.reduce((sum, q) => sum + q.points, 0)}分
                  </Badge>
                </div>

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
                            <div className="mt-3 space-y-2">
                              {question.options.map((option, optionIndex) => {
                                // 清理选项内容，移除可能的重复标签
                                const cleanOption = option
                                  .replace(/^[A-D]\.?\s*/, "") // 移除开头的 A. B. C. D. 标签
                                  .replace(/^[A-D]\s+/, "") // 移除开头的 A B C D 标签（无点号）
                                  .trim()

                                return (
                                  <div key={optionIndex} className="flex items-center gap-2">
                                    <span className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center text-sm">
                                      {String.fromCharCode(65 + optionIndex)}
                                    </span>
                                    <span>{cleanOption}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* 填空题答题区域 */}
                          {section.type === "fillInBlank" && (
                            <div className="mt-3">
                              <div className="border-b border-gray-300 w-32 h-6"></div>
                            </div>
                          )}

                          {/* 写作题答题区域 */}
                          {section.type === "writing" && (
                            <div className="mt-4 space-y-2">
                              {Array.from({ length: 10 }, (_, i) => (
                                <div key={i} className="border-b border-gray-200 h-6"></div>
                              ))}
                            </div>
                          )}

                          {/* 听力题答题区域 */}
                          {section.type === "listening" && (
                            <div className="mt-3">
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">答案：</span>
                                <div className="border-b border-gray-300 w-24 h-6"></div>
                              </div>
                            </div>
                          )}

                          {/* 阅读理解答题区域 */}
                          {section.type === "reading" && (
                            <div className="mt-3">
                              <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-500">答案：</span>
                                <div className="border-b border-gray-300 w-32 h-6"></div>
                              </div>
                            </div>
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
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold">答案与解析</h2>
            <p className="text-gray-600">{test.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {test.answerKey.map((item, index) => (
              <div key={item.id} className="border-l-4 border-green-400 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-green-600">第{index + 1}题</span>
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    答案：{item.answer}
                  </Badge>
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{item.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
