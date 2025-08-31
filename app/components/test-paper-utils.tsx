import { Badge } from "@/components/ui/badge"

/**
 * 渲染材料组件（听力材料、阅读材料等）
 */
interface MaterialProps {
  material: string
  title: string
  bgColor: string
  borderColor: string
  textColor: string
}

export function MaterialSection({ material, title, bgColor, borderColor, textColor }: MaterialProps) {
  return (
    <div className={`${bgColor} p-4 rounded-lg border-l-4 ${borderColor} mb-2`}>
      <h3 className={`font-semibold ${textColor} mb-2`}>{title}</h3>
      <div className={`text-sm ${textColor} whitespace-pre-line`}>{material}</div>
    </div>
  )
}

/**
 * 渲染主题场景信息组件
 */
interface ScenarioProps {
  scenarioTitle?: string
  scenarioDescription: string
  scenarioKnowledgePoints?: string[]
}

export function ScenarioSection({ scenarioTitle, scenarioDescription, scenarioKnowledgePoints }: ScenarioProps) {
  return (
    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-400">
      <div className="flex items-start gap-2">
        <h4 className="font-semibold text-purple-800 text-sm">主题场景：</h4>
        <div className="flex-1">
          {scenarioTitle && (
            <p className="font-medium text-purple-700 text-sm mb-1">{scenarioTitle}</p>
          )}
          <p className="text-purple-700 text-sm leading-relaxed">{scenarioDescription}</p>
          {scenarioKnowledgePoints && scenarioKnowledgePoints.length > 0 && (
            <div className="mt-2">
              <span className="text-purple-600 text-xs font-medium">涉及知识点：</span>
              <span className="text-purple-600 text-xs ml-1">{scenarioKnowledgePoints.join('、')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 渲染选择题选项组件
 */
interface OptionsProps {
  options: string[]
}

export function OptionsSection({ options }: OptionsProps) {
  return (
    <div className="mt-3 space-y-2">
      {options.map((option, optionIndex) => {
        // 清理选项内容，移除可能的重复标签
        const cleanOption = option
          .replace(/^[A-D][.\s]+/, "") // 移除开头的 A. B. C. D. 标签
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
  )
}

/**
 * 渲染答题区域组件
 */
interface AnswerAreaProps {
  sectionType: string
}

export function AnswerArea({ sectionType }: AnswerAreaProps) {
  switch (sectionType) {
    case "fillInBlank":
      return (
        <div className="mt-3">
          <div className="border-b border-gray-300 w-32 h-6"></div>
        </div>
      )
    
    case "writing":
      return (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="border-b border-gray-200 h-6"></div>
          ))}
        </div>
      )
    
    case "listening":
      return (
        <div className="mt-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">答案：</span>
            <div className="border-b border-gray-300 w-24 h-6"></div>
          </div>
        </div>
      )
    
    case "reading":
      return (
        <div className="mt-3">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">答案：</span>
            <div className="border-b border-gray-300 w-32 h-6"></div>
          </div>
        </div>
      )
    
    case "trueFalse":
      return (
        <div className="mt-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-300 rounded"></div>
                <span className="text-sm">True</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-gray-300 rounded"></div>
                <span className="text-sm">False</span>
              </div>
            </div>
          </div>
        </div>
      )
    
    default:
      return null
  }
}

/**
 * 渲染题目标题和分数信息
 */
interface SectionHeaderProps {
  title: string
  questionsLength: number
  totalScore?: number
  questions: Array<{ points: number }>
}

export function SectionHeader({ title, questionsLength, totalScore, questions }: SectionHeaderProps) {
  const calculatedScore = totalScore || questions.reduce((sum, q) => sum + q.points, 0)
  
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-xl font-semibold">{title}</h2>
      <Badge variant="outline">
        {questionsLength}题，共{calculatedScore}分
      </Badge>
    </div>
  )
}

/**
 * 渲染警告提示组件
 */
export function WarningBanner() {
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-3 mb-4 rounded">
      本试卷内容由AI大模型自动生成，仅供参考。
    </div>
  )
}