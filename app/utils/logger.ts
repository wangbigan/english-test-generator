import { v4 as uuidv4 } from 'uuid'

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: Record<string, any>
  requestId?: string
  duration?: string
}

/**
 * API调用日志接口
 */
export interface APICallLog {
  requestId: string
  model: string
  baseUrl: string
  inputData: {
    promptLength: number
    temperature: number
    maxTokens?: number
    promptPreview: string
  }
  outputData?: {
    responseLength: number
    duration: string
    responsePreview: string
    fullResponse?: string
    isGarbledResponse?: boolean
  }
  error?: {
    message: string
    stack?: string
  }
}

/**
 * 检查是否在服务端环境
 */
function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * 日志记录器类
 */
class Logger {
  private logQueue: LogEntry[] = []
  private isWriting = false

  constructor() {
    // 构造函数保持简单，不进行异步操作
  }

  /**
   * 生成唯一的请求ID
   * @returns 请求ID
   */
  public generateRequestId(): string {
    return uuidv4()
  }

  /**
   * 格式化日志条目为字符串
   * @param entry - 日志条目
   * @returns 格式化后的日志字符串
   */
  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, module, message, data, requestId, duration } = entry
    
    let logLine = `[${timestamp}] [${level}] [${module}] ${message}`
    
    if (requestId) {
      logLine += ` | RequestID: ${requestId}`
    }
    
    if (duration) {
      logLine += ` | Duration: ${duration}`
    }
    
    if (data && Object.keys(data).length > 0) {
      logLine += ` | Data: ${JSON.stringify(data, null, 2)}`
    }
    
    return logLine
  }

  /**
   * 异步写入日志
   */
  private async flushLogs(): Promise<void> {
    if (this.isWriting || this.logQueue.length === 0) {
      return
    }

    this.isWriting = true
    const logsToWrite = [...this.logQueue]
    this.logQueue = []

    try {
      if (isServerSide()) {
        // 服务端：写入文件
        await this.writeToFile(logsToWrite)
      } else {
        // 客户端：输出到控制台
        logsToWrite.forEach(entry => {
          console.log(this.formatLogEntry(entry))
        })
      }
    } catch (error) {
      console.error('日志写入失败:', error)
      // 失败时输出到控制台作为备份
      logsToWrite.forEach(entry => {
        console.log(this.formatLogEntry(entry))
      })
    } finally {
      this.isWriting = false
      
      // 如果队列中还有日志，继续处理
      if (this.logQueue.length > 0) {
        setTimeout(() => this.flushLogs(), 100)
      }
    }
  }

  /**
   * 写入日志到文件（仅在服务端）
   */
  private async writeToFile(logs: LogEntry[]): Promise<void> {
    // 严格检查服务端环境
    if (typeof window !== 'undefined' || typeof process === 'undefined') {
      return
    }

    try {
      // 使用eval来避免webpack静态分析
      const fs = eval('require')('fs/promises')
      const path = eval('require')('path')
      
      const logsDir = path.join(process.cwd(), 'logs')
      const today = new Date().toISOString().split('T')[0]
      const logFilePath = path.join(logsDir, `${today}.log`)
      
      // 确保目录存在
      try {
        await fs.access(logsDir)
      } catch {
        await fs.mkdir(logsDir, { recursive: true })
      }
      
      // 写入日志
      const logContent = logs.map(entry => this.formatLogEntry(entry)).join('\n') + '\n'
      await fs.appendFile(logFilePath, logContent, 'utf8')
    } catch (error) {
      // 如果文件写入失败，抛出错误让上层处理
      throw error
    }
  }

  /**
   * 记录日志
   * @param level - 日志级别
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据
   * @param requestId - 请求ID
   * @param duration - 执行时长
   */
  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: Record<string, any>,
    requestId?: string,
    duration?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
      requestId,
      duration
    }

    this.logQueue.push(entry)
    
    // 立即刷新日志（异步）
    setTimeout(() => this.flushLogs(), 0)
  }

  /**
   * 记录DEBUG级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据
   * @param requestId - 请求ID
   */
  public debug(
    module: string,
    message: string,
    data?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.DEBUG, module, message, data, requestId)
  }

  /**
   * 记录INFO级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据
   * @param requestId - 请求ID
   */
  public info(
    module: string,
    message: string,
    data?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.INFO, module, message, data, requestId)
  }

  /**
   * 记录WARN级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据
   * @param requestId - 请求ID
   */
  public warn(
    module: string,
    message: string,
    data?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.WARN, module, message, data, requestId)
  }

  /**
   * 记录ERROR级别日志
   * @param module - 模块名称
   * @param message - 日志消息
   * @param data - 附加数据
   * @param requestId - 请求ID
   */
  public error(
    module: string,
    message: string,
    data?: Record<string, any>,
    requestId?: string
  ): void {
    this.log(LogLevel.ERROR, module, message, data, requestId)
  }

  /**
   * 记录API调用开始
   * @param module - 模块名称
   * @param apiCallLog - API调用日志信息
   */
  public logAPICallStart(
    module: string,
    apiCallLog: Pick<APICallLog, 'requestId' | 'model' | 'baseUrl' | 'inputData'>
  ): void {
    this.info(
      module,
      'API调用开始',
      {
        model: apiCallLog.model,
        baseUrl: apiCallLog.baseUrl,
        params: apiCallLog.inputData
      },
      apiCallLog.requestId
    )

    this.debug(
      module,
      'AI模型输入详情',
      {
        model: apiCallLog.model,
        baseUrl: apiCallLog.baseUrl,
        promptLength: apiCallLog.inputData.promptLength,
        temperature: apiCallLog.inputData.temperature,
        inputTextLength: apiCallLog.inputData.promptLength,
        promptPreview: apiCallLog.inputData.promptPreview
      },
      apiCallLog.requestId
    )
  }

  /**
   * 记录API调用成功
   * @param module - 模块名称
   * @param apiCallLog - API调用日志信息
   */
  public logAPICallSuccess(
    module: string,
    apiCallLog: Pick<APICallLog, 'requestId' | 'outputData'>
  ): void {
    if (!apiCallLog.outputData) return

    this.info(
      module,
      'API调用完成',
      {
        success: true
      },
      apiCallLog.requestId,
      apiCallLog.outputData.duration
    )

    this.debug(
      module,
      'AI模型输出详情',
      {
        responseLength: apiCallLog.outputData.responseLength,
        duration: apiCallLog.outputData.duration,
        responsePreview: apiCallLog.outputData.responsePreview,
        fullResponse: apiCallLog.outputData.fullResponse,
        isGarbledResponse: apiCallLog.outputData.isGarbledResponse
      },
      apiCallLog.requestId
    )
  }

  /**
   * 记录API调用失败
   * @param module - 模块名称
   * @param apiCallLog - API调用日志信息
   */
  public logAPICallError(
    module: string,
    apiCallLog: Pick<APICallLog, 'requestId' | 'error'>
  ): void {
    if (!apiCallLog.error) return

    this.error(
      module,
      'API调用失败',
      {
        error: apiCallLog.error.message,
        stack: apiCallLog.error.stack
      },
      apiCallLog.requestId
    )
  }

  /**
   * 强制刷新所有待写入的日志
   */
  public async flush(): Promise<void> {
    await this.flushLogs()
  }
}

// 导出单例实例
export const logger = new Logger()

// 导出默认实例
export default logger