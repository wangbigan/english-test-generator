import { z } from "zod"

/**
 * 题目 Schema
 */
export const questionSchema = z.object({
  id: z.number(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
  points: z.number(),
  explanation: z.string().optional(),
  knowledgePoint: z.string().optional(),
})

/**
 * 试卷部分 Schema
 */
export const testSectionSchema = z.object({
  type: z.string(),
  title: z.string(),
  listeningMaterial: z.string().optional(),
  readingMaterial: z.string().optional(),
  questionNumber: z.number().optional(),
  questions: z.array(questionSchema),
})

/**
 * 答案项 Schema
 */
export const answerKeyItemSchema = z.object({
  id: z.number(),
  answer: z.string(),
  explanation: z.string(),
})

/**
 * 完整试卷 Schema
 * 用于验证 AI 返回的 JSON 数据结构
 */
export const testPaperSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  instructions: z.string(),
  totalScore: z.number(),
  listeningMaterial: z.string().optional(),
  sections: z.array(testSectionSchema),
  answerKey: z.array(answerKeyItemSchema),
})

export type ValidatedTestPaper = z.infer<typeof testPaperSchema>
