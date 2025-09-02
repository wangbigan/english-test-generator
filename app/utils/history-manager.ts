import { 
  HistoryRecord, 
  HistoryRecordType, 
  HistoryBaseInfo, 
  HistoryStorageConfig, 
  HistoryQueryOptions,
  ExtractResult,
  GeneratedTest
} from '../types/shared'
import type { ThemeAndAllocationResult } from '../actions/generate-theme-and-allocation'

/**
 * 历史记录管理器类
 * 负责历史记录的存储、读取、管理和维护
 */
export class HistoryManager {
  private static instance: HistoryManager
  private config: HistoryStorageConfig
  
  // localStorage键名常量
  private static readonly STORAGE_KEYS = {
    extract: 'english-test-history-extract',
    theme: 'english-test-history-theme', 
    test: 'english-test-history-test',
    config: 'english-test-history-config'
  } as const

  /**
   * 构造函数 - 私有化实现单例模式
   */
  private constructor() {
    // 默认配置
    this.config = {
      maxRecords: 50,        // 每种类型最多保存50条记录
      enableCompression: true, // 启用数据压缩
      autoCleanup: true,     // 自动清理过期记录
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30天过期
    }
    
    // 从localStorage加载配置
    this.loadConfig()
    
    // 执行自动清理
    if (this.config.autoCleanup) {
      this.performAutoCleanup()
    }
  }

  /**
   * 获取历史记录管理器单例实例
   * @returns HistoryManager实例
   */
  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager()
    }
    return HistoryManager.instance
  }

  /**
   * 生成唯一ID
   * @returns 基于时间戳和随机数的唯一标识符
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 数据压缩函数
   * @param data 要压缩的数据
   * @returns 压缩后的字符串
   */
  private compressData(data: unknown): string {
    if (!this.config.enableCompression) {
      return JSON.stringify(data)
    }
    
    try {
      // 简单的压缩：移除不必要的空格和换行
      const jsonStr = JSON.stringify(data)
      return jsonStr
    } catch (error) {
      console.error('数据压缩失败:', error)
      return JSON.stringify(data)
    }
  }

  /**
   * 数据解压缩函数
   * @param compressedData 压缩的数据字符串
   * @returns 解压缩后的数据
   */
  private decompressData(compressedData: string): unknown {
    try {
      return JSON.parse(compressedData)
    } catch (error) {
      console.error('数据解压缩失败:', error)
      return null
    }
  }

  /**
   * 从localStorage加载配置
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem(HistoryManager.STORAGE_KEYS.config)
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig)
        this.config = { ...this.config, ...parsedConfig }
      }
    } catch (error) {
      console.error('加载历史记录配置失败:', error)
    }
  }

  /**
   * 保存配置到localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem(
        HistoryManager.STORAGE_KEYS.config, 
        JSON.stringify(this.config)
      )
    } catch (error) {
      console.error('保存历史记录配置失败:', error)
    }
  }

  /**
   * 从localStorage读取指定类型的历史记录
   * @param type 记录类型
   * @returns 历史记录数组
   */
  private loadRecords(type: HistoryRecordType): HistoryRecord[] {
    try {
      // 检查是否在客户端环境
      if (typeof window === 'undefined' || !window.localStorage) {
        return []
      }
      
      const key = HistoryManager.STORAGE_KEYS[type]
      const data = localStorage.getItem(key)
      if (!data) return []
      
      const decompressed = this.decompressData(data)
      return Array.isArray(decompressed) ? decompressed : []
    } catch (error) {
      console.error(`加载${type}类型历史记录失败:`, error)
      return []
    }
  }

  /**
   * 保存指定类型的历史记录到localStorage
   * @param type 记录类型
   * @param records 记录数组
   */
  private saveRecords(type: HistoryRecordType, records: HistoryRecord[]): void {
    try {
      // 检查是否在客户端环境
      if (typeof window === 'undefined' || !window.localStorage) {
        return
      }
      
      const key = HistoryManager.STORAGE_KEYS[type]
      const compressed = this.compressData(records)
      localStorage.setItem(key, compressed)
    } catch (error) {
      console.error(`保存${type}类型历史记录失败:`, error)
      
      // 如果存储失败，可能是空间不足，尝试清理旧记录
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        this.performEmergencyCleanup(type)
        // 重试保存
        try {
          const compressed = this.compressData(records)
          localStorage.setItem(key, compressed)
        } catch (retryError) {
          console.error(`重试保存${type}类型历史记录仍然失败:`, retryError)
        }
      }
    }
  }

  /**
   * 执行自动清理过期记录
   */
  private performAutoCleanup(): void {
    const now = Date.now()
    const types: HistoryRecordType[] = ['extract', 'theme', 'test']
    
    types.forEach(type => {
      const records = this.loadRecords(type)
      const validRecords = records.filter(record => {
        const age = now - record.timestamp
        return age < this.config.maxAge
      })
      
      // 如果清理了记录，保存更新后的数组
      if (validRecords.length < records.length) {
        this.saveRecords(type, validRecords)
        console.log(`自动清理${type}类型过期记录: ${records.length - validRecords.length}条`)
      }
    })
  }

  /**
   * 紧急清理 - 当存储空间不足时执行
   * @param type 记录类型
   */
  private performEmergencyCleanup(type: HistoryRecordType): void {
    const records = this.loadRecords(type)
    // 只保留最新的一半记录
    const keepCount = Math.floor(this.config.maxRecords / 2)
    const sortedRecords = records
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, keepCount)
    
    this.saveRecords(type, sortedRecords)
    console.log(`紧急清理${type}类型记录: 保留${keepCount}条最新记录`)
  }

  /**
   * 生成记录标题
   * @param type 记录类型
   * @param baseInfo 基础信息
   * @param result 结果数据
   * @returns 生成的标题
   */
  private generateTitle(
    type: HistoryRecordType, 
    baseInfo: HistoryBaseInfo, 
    result?: ExtractResult | ThemeAndAllocationResult | GeneratedTest
  ): string {
    const date = new Date().toLocaleDateString('zh-CN')
    
    switch (type) {
      case 'extract':
        return `知识点提取 - ${baseInfo.theme || '未命名主题'} (${date})`
      case 'theme':
        return `主题场景 - ${baseInfo.theme || '未命名主题'} (${date})`
      case 'test':
        const testResult = result as GeneratedTest
        return testResult?.title || `试卷生成 - ${baseInfo.theme || '未命名主题'} (${date})`
      default:
        return `历史记录 - ${baseInfo.theme || '未命名'} (${date})`
    }
  }

  /**
   * 添加新的历史记录
   * @param type 记录类型
   * @param baseInfo 基础配置信息
   * @param result 操作结果数据
   * @param customTitle 自定义标题（可选）
   * @returns 创建的历史记录
   */
  public addRecord(
    type: HistoryRecordType,
    baseInfo: HistoryBaseInfo,
    result: ExtractResult | ThemeAndAllocationResult | GeneratedTest,
    customTitle?: string
  ): HistoryRecord {
    const record: HistoryRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      title: customTitle || this.generateTitle(type, baseInfo, result),
      baseInfo,
      result,
      status: 'success'
    }

    // 加载现有记录
    const records = this.loadRecords(type)
    
    // 添加新记录到开头
    records.unshift(record)
    
    // 限制记录数量
    if (records.length > this.config.maxRecords) {
      records.splice(this.config.maxRecords)
    }
    
    // 保存更新后的记录
    this.saveRecords(type, records)
    
    console.log(`添加${type}类型历史记录:`, record.title)
    return record
  }

  /**
   * 添加失败记录
   * @param type 记录类型
   * @param baseInfo 基础配置信息
   * @param errorMessage 错误信息
   * @param customTitle 自定义标题（可选）
   * @returns 创建的历史记录
   */
  public addFailedRecord(
    type: HistoryRecordType,
    baseInfo: HistoryBaseInfo,
    errorMessage: string,
    customTitle?: string
  ): HistoryRecord {
    const record: HistoryRecord = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      title: customTitle || this.generateTitle(type, baseInfo),
      baseInfo,
      status: 'failed',
      errorMessage
    }

    const records = this.loadRecords(type)
    records.unshift(record)
    
    if (records.length > this.config.maxRecords) {
      records.splice(this.config.maxRecords)
    }
    
    this.saveRecords(type, records)
    
    console.log(`添加失败${type}类型历史记录:`, record.title)
    return record
  }

  /**
   * 获取历史记录列表
   * @param options 查询选项
   * @returns 符合条件的历史记录数组
   */
  public getRecords(options: HistoryQueryOptions = {}): HistoryRecord[] {
    const { type, keyword, startDate, endDate, status, limit, offset = 0 } = options
    
    let allRecords: HistoryRecord[] = []
    
    if (type) {
      // 查询指定类型
      allRecords = this.loadRecords(type)
    } else {
      // 查询所有类型
      const types: HistoryRecordType[] = ['extract', 'theme', 'test']
      types.forEach(t => {
        allRecords.push(...this.loadRecords(t))
      })
      // 按时间戳降序排序
      allRecords.sort((a, b) => b.timestamp - a.timestamp)
    }
    
    // 应用筛选条件
    let filteredRecords = allRecords
    
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase()
      filteredRecords = filteredRecords.filter(record => 
        record.title.toLowerCase().includes(lowerKeyword) ||
        record.baseInfo.theme.toLowerCase().includes(lowerKeyword) ||
        record.baseInfo.knowledgePoints.toLowerCase().includes(lowerKeyword)
      )
    }
    
    if (startDate) {
      filteredRecords = filteredRecords.filter(record => record.timestamp >= startDate)
    }
    
    if (endDate) {
      filteredRecords = filteredRecords.filter(record => record.timestamp <= endDate)
    }
    
    if (status) {
      filteredRecords = filteredRecords.filter(record => record.status === status)
    }
    
    // 应用分页
    const startIndex = offset
    const endIndex = limit ? startIndex + limit : undefined
    
    return filteredRecords.slice(startIndex, endIndex)
  }

  /**
   * 根据ID获取单个历史记录
   * @param id 记录ID
   * @returns 历史记录或null
   */
  public getRecordById(id: string): HistoryRecord | null {
    const types: HistoryRecordType[] = ['extract', 'theme', 'test']
    
    for (const type of types) {
      const records = this.loadRecords(type)
      const record = records.find(r => r.id === id)
      if (record) {
        return record
      }
    }
    
    return null
  }

  /**
   * 更新历史记录
   * @param id 记录ID
   * @param updates 要更新的字段
   * @returns 是否更新成功
   */
  public updateRecord(id: string, updates: Partial<HistoryRecord>): boolean {
    const types: HistoryRecordType[] = ['extract', 'theme', 'test']
    
    for (const type of types) {
      const records = this.loadRecords(type)
      const index = records.findIndex(r => r.id === id)
      
      if (index !== -1) {
        // 更新记录
        records[index] = { ...records[index], ...updates }
        this.saveRecords(type, records)
        console.log(`更新${type}类型历史记录:`, id)
        return true
      }
    }
    
    return false
  }

  /**
   * 删除历史记录
   * @param id 记录ID
   * @returns 是否删除成功
   */
  public deleteRecord(id: string): boolean {
    const types: HistoryRecordType[] = ['extract', 'theme', 'test']
    
    for (const type of types) {
      const records = this.loadRecords(type)
      const index = records.findIndex(r => r.id === id)
      
      if (index !== -1) {
        records.splice(index, 1)
        this.saveRecords(type, records)
        console.log(`删除${type}类型历史记录:`, id)
        return true
      }
    }
    
    return false
  }

  /**
   * 批量删除历史记录
   * @param ids 记录ID数组
   * @returns 成功删除的记录数量
   */
  public deleteRecords(ids: string[]): number {
    let deletedCount = 0
    
    ids.forEach(id => {
      if (this.deleteRecord(id)) {
        deletedCount++
      }
    })
    
    return deletedCount
  }

  /**
   * 清空指定类型的所有历史记录
   * @param type 记录类型
   * @returns 清空的记录数量
   */
  public clearRecords(type: HistoryRecordType): number {
    const records = this.loadRecords(type)
    const count = records.length
    
    this.saveRecords(type, [])
    console.log(`清空${type}类型所有历史记录: ${count}条`)
    
    return count
  }

  /**
   * 清空所有历史记录
   * @returns 清空的总记录数量
   */
  public clearAllRecords(): number {
    const types: HistoryRecordType[] = ['extract', 'theme', 'test']
    let totalCount = 0
    
    types.forEach(type => {
      totalCount += this.clearRecords(type)
    })
    
    return totalCount
  }

  /**
   * 获取存储统计信息
   * @returns 存储统计数据
   */
  public getStorageStats(): {
    extract: number
    theme: number
    test: number
    total: number
    storageSize: number
  } {
    const extractCount = this.loadRecords('extract').length
    const themeCount = this.loadRecords('theme').length
    const testCount = this.loadRecords('test').length
    
    // 计算存储大小（粗略估算）
    let storageSize = 0
    Object.values(HistoryManager.STORAGE_KEYS).forEach(key => {
      const data = localStorage.getItem(key)
      if (data) {
        storageSize += data.length * 2 // 每个字符大约2字节
      }
    })
    
    return {
      extract: extractCount,
      theme: themeCount,
      test: testCount,
      total: extractCount + themeCount + testCount,
      storageSize
    }
  }

  /**
   * 更新存储配置
   * @param newConfig 新的配置
   */
  public updateConfig(newConfig: Partial<HistoryStorageConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()
    console.log('历史记录配置已更新:', this.config)
  }

  /**
   * 获取当前配置
   * @returns 当前存储配置
   */
  public getConfig(): HistoryStorageConfig {
    return { ...this.config }
  }

  /**
   * 导出历史记录数据
   * @param type 记录类型（可选，不指定则导出所有）
   * @returns 导出的数据
   */
  public exportData(type?: HistoryRecordType): {
    exportTime: number
    config: HistoryStorageConfig
    data: Record<string, HistoryRecord[]>
  } {
    const exportData: Record<string, HistoryRecord[]> = {}
    
    if (type) {
      exportData[type] = this.loadRecords(type)
    } else {
      const types: HistoryRecordType[] = ['extract', 'theme', 'test']
      types.forEach(t => {
        exportData[t] = this.loadRecords(t)
      })
    }
    
    return {
      exportTime: Date.now(),
      config: this.config,
      data: exportData
    }
  }

  /**
   * 导入历史记录数据
   * @param importData 导入的数据
   * @param merge 是否与现有数据合并（默认false，即覆盖）
   * @returns 导入结果统计
   */
  public importData(
    importData: {
      config?: HistoryStorageConfig
      data: Record<string, HistoryRecord[]>
    },
    merge: boolean = false
  ): {
    imported: Record<string, number>
    errors: string[]
  } {
    const result = {
      imported: {} as Record<string, number>,
      errors: [] as string[]
    }
    
    try {
      // 导入配置
      if (importData.config) {
        this.updateConfig(importData.config)
      }
      
      // 导入数据
      Object.entries(importData.data).forEach(([type, records]) => {
        if (['extract', 'theme', 'test'].includes(type)) {
          const recordType = type as HistoryRecordType
          
          let finalRecords = records
          
          if (merge) {
            // 合并模式：与现有记录合并，去重
            const existingRecords = this.loadRecords(recordType)
            const existingIds = new Set(existingRecords.map(r => r.id))
            
            const newRecords = records.filter(r => !existingIds.has(r.id))
            finalRecords = [...existingRecords, ...newRecords]
            
            // 按时间戳排序并限制数量
            finalRecords.sort((a, b) => b.timestamp - a.timestamp)
            if (finalRecords.length > this.config.maxRecords) {
              finalRecords = finalRecords.slice(0, this.config.maxRecords)
            }
          }
          
          this.saveRecords(recordType, finalRecords)
          result.imported[type] = finalRecords.length
        } else {
          result.errors.push(`未知的记录类型: ${type}`)
        }
      })
      
    } catch (error) {
      result.errors.push(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
    
    return result
  }
}

// 导出单例实例
export const historyManager = HistoryManager.getInstance()

// 导出便捷函数
export const {
  addRecord,
  addFailedRecord,
  getRecords,
  getRecordById,
  updateRecord,
  deleteRecord,
  deleteRecords,
  clearRecords,
  clearAllRecords,
  getStorageStats,
  updateConfig,
  getConfig,
  exportData,
  importData
} = historyManager