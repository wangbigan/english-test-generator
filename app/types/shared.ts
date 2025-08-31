// 共享类型定义文件
// 用于消除项目中重复的接口定义

/**
 * 测试配置接口
 * 定义试卷生成的基本配置参数
 */
export interface TestConfig {
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
    trueFalse: { count: number; score: number }
  }
}

/**
 * OpenAI配置接口
 * 定义AI模型的连接配置参数
 */
export interface OpenAIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

/**
 * 生成的试卷结构接口
 */
export interface GeneratedTest {
  title: string
  subtitle: string
  instructions: string
  sections: Array<{
    type: string
    title: string
    totalScore?: number
    pointsPerQuestion?: number
    // 主题场景信息
    scenarioTitle?: string
    scenarioDescription?: string
    scenarioKnowledgePoints?: string[]
    questions: Array<{
      id: number
      question: string
      options?: string[]
      answer?: string
      points: number
      explanation?: string
    }>
    listeningMaterial?: string
    readingMaterial?: string
  }>
  totalScore: number
  listeningMaterial?: string
  themeBackground?: string
  answerKey: Array<{
    id: number
    answer: string
    explanation: string
  }>
}

/**
 * 提示词配置接口
 */
export interface PromptConfig {
  selectedTemplate: string
  customTemplate: string
  variables: Record<string, string>
}

import { GRADE_NAMES, DIFFICULTY_NAMES, QUESTION_TYPE_NAMES } from "../constants"

// 共享工具函数

/**
 * 获取年级中文名称
 */
export function getGradeName(grade: string): string {
  return GRADE_NAMES[grade] || "小学"
}

/**
 * 获取难度中文名称
 */
export function getDifficultyName(difficulty: string): string {
  return DIFFICULTY_NAMES[difficulty] || "标准"
}

/**
 * 获取题型中文名称
 */
export function getQuestionTypeName(questionType: string): string {
  return QUESTION_TYPE_NAMES[questionType] || questionType
}