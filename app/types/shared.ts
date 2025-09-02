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
  // 主题信息
  mainTheme?: string
  backgroundDescription?: string
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

// 导入主题场景分配相关类型
import type { ThemeAndAllocationResult } from "../actions/generate-theme-and-allocation"

/**
 * 历史记录类型枚举
 * 定义支持的三种历史记录类型
 */
export type HistoryRecordType = 'extract' | 'theme' | 'test'

/**
 * 历史记录基础信息接口
 * 包含生成记录时的基本配置信息
 */
export interface HistoryBaseInfo {
  grade: string           // 年级
  difficulty: string      // 难度等级
  theme: string          // 主题
  knowledgePoints: string // 知识点内容
}

/**
 * 知识点提取记录结果接口
 * 存储知识点提取操作的结果数据
 */
export interface ExtractResult {
  originalText: string    // 原始文档文本
  extractedPoints: string // 提取的知识点
  fileName?: string       // 上传的文件名
  fileSize?: number      // 文件大小
}

/**
 * 历史记录项接口
 * 定义单个历史记录的完整数据结构
 */
export interface HistoryRecord {
  id: string                    // 唯一标识符
  timestamp: number             // 创建时间戳
  type: HistoryRecordType       // 操作类型
  title: string                 // 记录标题（用户可编辑）
  baseInfo: HistoryBaseInfo     // 基础配置信息
  result?: ExtractResult | ThemeAndAllocationResult | GeneratedTest  // 操作结果数据
  status: 'success' | 'failed'  // 操作状态
  errorMessage?: string         // 错误信息（失败时）
}

/**
 * 历史记录存储配置接口
 * 定义历史记录的存储和管理配置
 */
export interface HistoryStorageConfig {
  maxRecords: number        // 每种类型的最大记录数
  enableCompression: boolean // 是否启用数据压缩
  autoCleanup: boolean      // 是否自动清理过期记录
  maxAge: number           // 记录最大保存天数
}

/**
 * 历史记录查询条件接口
 * 用于筛选和搜索历史记录
 */
export interface HistoryQueryOptions {
  type?: HistoryRecordType   // 按类型筛选
  keyword?: string          // 关键词搜索（标题、主题）
  startDate?: number        // 开始时间戳
  endDate?: number          // 结束时间戳
  status?: 'success' | 'failed' // 按状态筛选
  limit?: number            // 返回记录数限制
  offset?: number           // 分页偏移量
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