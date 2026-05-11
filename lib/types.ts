/**
 * 全局类型定义
 * 集中管理跨模块共享的类型，消除重复定义
 */

// ===== 题型配置 =====

export interface QuestionTypeConfig {
  count: number
  score: number
}

// ===== 试卷配置 =====

export interface TestConfig {
  grade: string
  difficulty: string
  theme: string
  knowledgePoints: string
  totalScore: number
  questionTypes: {
    listening: QuestionTypeConfig
    multipleChoice: QuestionTypeConfig
    fillInBlank: QuestionTypeConfig
    reading: QuestionTypeConfig
    writing: QuestionTypeConfig
    trueFalse: QuestionTypeConfig
  }
}

// ===== AI Provider 配置 =====

export interface AIProviderConfig {
  apiKey: string
  baseUrl: string
  model: string
}

// ===== Prompt 配置 =====

export interface PromptConfig {
  selectedTemplate: string
  customTemplate: string
  variables: Record<string, string>
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  template: string
  variables: string[]
}

// ===== 试卷数据结构 =====

export interface Question {
  id: number
  question: string
  options?: string[]
  answer?: string
  points: number
  explanation?: string
  knowledgePoint?: string
}

export interface TestSection {
  type: string
  title: string
  listeningMaterial?: string
  readingMaterial?: string
  questionNumber?: number
  questions: Question[]
}

export interface AnswerKeyItem {
  id: number
  answer: string
  explanation: string
}

export interface TestPaperData {
  title: string
  subtitle: string
  instructions: string
  sections: TestSection[]
  totalScore: number
  listeningMaterial?: string
  answerKey: AnswerKeyItem[]
}

// ===== 生成结果 =====

export interface GenerateTestResult {
  test: TestPaperData
  prompt: string
  rawResponse?: string
}
