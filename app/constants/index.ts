/**
 * 项目常量定义文件
 * 统一管理项目中使用的常量，避免魔法数字和重复定义
 */

// 年级映射
export const GRADE_NAMES: Record<string, string> = {
  "1": "一年级",
  "2": "二年级",
  "3": "三年级",
  "4": "四年级",
  "5": "五年级",
  "6": "六年级",
}

// 难度映射
export const DIFFICULTY_NAMES: Record<string, string> = {
  low: "基础",
  medium: "中等",
  high: "提高",
}

// 题型映射
export const QUESTION_TYPE_NAMES: Record<string, string> = {
  listening: "听力题",
  multipleChoice: "选择题",
  fillInBlank: "填空题",
  reading: "阅读理解",
  writing: "写作题",
  trueFalse: "判断题"
}

// 题型标题映射
export const QUESTION_TYPE_TITLES: Record<string, string> = {
  listening: '听力理解',
  multipleChoice: '选择题',
  fillInBlank: '填空题',
  trueFalse: '判断题',
  reading: '阅读理解',
  writing: '写作题'
}

// 题型顺序
export const QUESTION_TYPE_ORDER = [
  'listening', 
  'multipleChoice', 
  'fillInBlank', 
  'trueFalse', 
  'reading', 
  'writing'
]

// AI模型配置
export const AI_MODEL_CONFIG = {
  // DeepSeek模型配置
  DEEPSEEK: {
    BASE_URL: "https://api.deepseek.com/v1",
    PREFIX: "deepseek"
  },
  // OpenAI兼容模型配置
  OPENAI_COMPATIBLE: {
    BASE_URL: "https://api.openai.com/v1",
    KIMI_BASE_URL: "https://api.moonshot.cn/v1",
    DOUBAO_BASE_URL: "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
  },
  // Token限制
  TOKEN_LIMITS: {
    DEFAULT: 8000,
    SINGLE_QUESTION_TYPE: 4000
  },
  // 特殊模型前缀
  SPECIAL_MODELS: {
    KIMI: ["kimi", "moonshot"],
    DOUBAO: ["Doubao"]
  }
}

// 试卷配置
export const TEST_PAPER_CONFIG = {
  // 默认配置
  DEFAULT_TIME_LIMIT: "60分钟",
  DEFAULT_INSTRUCTIONS: "请仔细阅读题目要求，在规定时间内完成答题。",
  
  // 题目数量限制
  MAX_QUESTIONS_TOTAL: 50,
  MAX_WRITING_QUESTIONS: 3,
  MAX_OTHER_QUESTIONS: 20,
  
  // 分值限制
  MAX_WRITING_SCORE: 20,
  MAX_OTHER_SCORE: 10,
  MIN_SCORE: 1,
  
  // 写作题答题行数
  WRITING_ANSWER_LINES: 10
}

// 材料样式配置
export const MATERIAL_STYLES = {
  LISTENING: {
    bgColor: "bg-blue-50",
    borderColor: "border-blue-400",
    textColor: "text-blue-800",
    title: "听力材料"
  },
  READING: {
    bgColor: "bg-green-50",
    borderColor: "border-green-400",
    textColor: "text-green-800",
    title: "阅读材料"
  }
}

// 系统消息模板
export const SYSTEM_MESSAGES = {
  MAIN_TEACHER: `你是一名资深的小学英语老师，擅长按照配置和要求生成高质量的英语试卷或题目。请严格遵循以下要求：

## 输出格式要求
- 必须严格按照JSON示例格式输出，不要包含任何其他内容
- 务必确保在token长度限制内输出完整JSON结构，且语法正确。
- 在满足上述要求的前提下，尽可能保证生成的题目数量最大化满足各题型要求，如实在不能满足，在json的questionNumber字段附加注视说明

## 内容要求：
- 题目设计必须确保正确答案只有一个，且不能出现二义性
- 材料、题干和选项中涉及数字部分都尽可能用英文单词，避免用数字表示

## 内容安全要求
- 生成的内容必须适合小学生，积极健康
- 不得包含任何政治敏感、宗教争议、暴力、色情等不当内容
- 避免涉及种族、性别、地域等歧视性内容
- 确保所有题目内容符合教育规范和社会主义核心价值观`,

  QUESTION_TYPE_TEACHER: (questionType: string) => `你是一名资深的小学英语老师，专门负责生成${questionType}题型。请严格按照要求生成高质量的题目。

## 输出格式要求
- 必须严格按照JSON示例格式输出，不要包含任何其他内容
- 务必确保JSON结构完整且语法正确

## 内容安全要求
- 生成的内容必须适合小学生，积极健康
- 不得包含任何不当内容`
}

// 错误消息
export const ERROR_MESSAGES = {
  NO_API_KEY: "API Key missing – falling back to local sample paper",
  NO_CONTENT: "No content received from API.",
  JSON_PARSE_FAILED: "Failed to parse JSON from API response.",
  GENERATION_FAILED: "生成试卷失败，请重试",
  NETWORK_ERROR: "Network error detected",
  NO_ACTIVE_QUESTION_TYPES: "No active question types found"
}

// 本地存储键名
export const STORAGE_KEYS = {
  OPENAI_CONFIG: "openai-config",
  PROMPT_CONFIG: "prompt-config"
}

// 导出文件名模板
export const EXPORT_TEMPLATES = {
  PDF_FILENAME: (title: string) => `${title.replace(/[^ -\u4e00-\u9fa5]/g, "")}_试卷.pdf`,
  WORD_FILENAME: (title: string) => `${title.replace(/[^ -\u4e00-\u9fa5]/g, "")}_试卷.doc`,
  JSON_FILENAME: (title: string) => `${title.replace(/[^\w\s]/gi, "")}_完整数据.json`
}