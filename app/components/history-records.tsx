'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  History, 
  FileText, 
  Wand2, 
  TestTube, 
  Eye, 
  Trash2, 
  Search,
  Calendar,
  Settings
} from 'lucide-react'
import { historyManager } from '../utils/history-manager'
import { HistoryRecord, HistoryRecordType } from '../types/shared'
import { ThemeAllocationPreview } from './theme-allocation-preview'
import { TestPaper } from './test-paper'
import type { ThemeAndAllocationResult } from '../actions/generate-theme-and-allocation'
import type { GeneratedTest } from '../types/shared'

/**
 * 历史记录组件的属性接口
 */
interface HistoryRecordsProps {
  /** 应用知识点回调 */
  onApplyKnowledgePoints?: (record: HistoryRecord) => void
  /** 应用主题场景回调 */
  onApplyThemeScenario?: (record: HistoryRecord) => void
  /** 基于历史试卷重新生成回调 */
  onRegenerateFromHistory?: (record: HistoryRecord) => void
  /** 预览历史试卷回调 */
  onPreviewHistoryTest?: (record: HistoryRecord) => void
}

/**
 * 历史记录主组件
 * 提供历史记录的查看、管理和应用功能
 */
export function HistoryRecords({
  onApplyKnowledgePoints,
  onApplyThemeScenario,
  onRegenerateFromHistory,
  onPreviewHistoryTest
}: HistoryRecordsProps) {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<HistoryRecord[]>([])
  const [activeTab, setActiveTab] = useState<HistoryRecordType>('extract')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<HistoryRecord | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * 加载历史记录数据
   */
  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    try {
      const allRecords = historyManager.getRecords({ type: activeTab })
      setRecords(allRecords)
      setFilteredRecords(allRecords)
    } catch (error) {
      console.error('加载历史记录失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [activeTab])

  /**
   * 搜索和筛选记录
   */
  const filterRecords = useCallback(() => {
    let filtered = records
    
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase()
      filtered = records.filter(record => 
        record.title.toLowerCase().includes(keyword) ||
        record.baseInfo.theme.toLowerCase().includes(keyword) ||
        record.baseInfo.knowledgePoints.toLowerCase().includes(keyword)
      )
    }
    
    setFilteredRecords(filtered)
  }, [records, searchKeyword])

  /**
   * 删除记录
   */
  const handleDeleteRecord = (recordId: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      try {
        historyManager.deleteRecord(recordId)
        loadRecords()
      } catch (error) {
        console.error('删除记录失败:', error)
        alert('删除失败，请重试')
      }
    }
  }

  /**
   * 预览记录
   */
  const handlePreviewRecord = (record: HistoryRecord) => {
    if (record.type === 'test' && onPreviewHistoryTest) {
      // 试卷类型：切换到主界面预览
      onPreviewHistoryTest(record)
    } else {
      // 其他类型：显示弹窗预览
      setSelectedRecord(record)
      setShowPreview(true)
    }
  }

  /**
   * 应用记录
   */
  const handleApplyRecord = (record: HistoryRecord) => {
    switch (record.type) {
      case 'extract':
        onApplyKnowledgePoints?.(record)
        break
      case 'theme':
        onApplyThemeScenario?.(record)
        break
      case 'test':
        onRegenerateFromHistory?.(record)
        break
    }
  }

  /**
   * 获取记录类型的显示信息
   */
  const getTypeInfo = (type: HistoryRecordType) => {
    switch (type) {
      case 'extract':
        return { icon: FileText, label: '知识点提取', color: 'bg-blue-100 text-blue-800' }
      case 'theme':
        return { icon: Wand2, label: '主题场景', color: 'bg-purple-100 text-purple-800' }
      case 'test':
        return { icon: TestTube, label: '试卷生成', color: 'bg-green-100 text-green-800' }
    }
  }

  /**
   * 格式化时间显示
   */
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN')
  }

  // 监听标签页切换和搜索关键词变化
  useEffect(() => {
    loadRecords()
  }, [activeTab, loadRecords])

  useEffect(() => {
    filterRecords()
  }, [searchKeyword, records, filterRecords])

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            历史记录
          </h2>
          <p className="text-gray-600">查看和管理您的操作历史，快速复用之前的配置</p>
        </div>
        
        {/* 搜索框 */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="搜索记录..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* 记录分类标签页 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as HistoryRecordType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="extract" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            知识点提取
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            主题场景
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            试卷生成
          </TabsTrigger>
        </TabsList>

        {/* 记录列表 */}
        {(['extract', 'theme', 'test'] as HistoryRecordType[]).map((type) => {
          const typeInfo = getTypeInfo(type)
          const Icon = typeInfo.icon
          
          return (
            <TabsContent key={type} value={type} className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">加载中...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <Icon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchKeyword ? '未找到匹配的记录' : `暂无${typeInfo.label}记录`}
                  </h3>
                  <p className="text-gray-600">
                    {searchKeyword ? '尝试使用其他关键词搜索' : `开始使用${typeInfo.label}功能后，记录将显示在这里`}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={typeInfo.color}>
                                <Icon className="w-3 h-3 mr-1" />
                                {typeInfo.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {record.baseInfo.grade}年级 · {record.baseInfo.difficulty === 'low' ? '低难度' : record.baseInfo.difficulty === 'medium' ? '中等难度' : '高难度'}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg">{record.title}</CardTitle>
                            <CardDescription className="mt-1">
                              主题：{record.baseInfo.theme || '未设置'}
                            </CardDescription>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatTime(record.timestamp)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            {record.baseInfo.knowledgePoints ? (
                              <span>知识点：{record.baseInfo.knowledgePoints.slice(0, 50)}{record.baseInfo.knowledgePoints.length > 50 ? '...' : ''}</span>
                            ) : (
                              <span>暂无知识点信息</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewRecord(record)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              预览
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApplyRecord(record)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Settings className="w-4 h-4 mr-1" />
                              应用
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteRecord(record.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      {/* 预览弹窗 */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>记录预览</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div>
              {selectedRecord.type === 'theme' && (
                <ThemeAllocationPreview
                  themeAndAllocation={selectedRecord.result as ThemeAndAllocationResult}
                  isHistoryView={true}
                  showApplyButton={true}
                  onApply={() => {
                    handleApplyRecord(selectedRecord)
                    setShowPreview(false)
                  }}
                  onClose={() => setShowPreview(false)}
                />
              )}
              {selectedRecord.type === 'test' && (
                <TestPaper
                  test={selectedRecord.result as GeneratedTest}
                  isHistoryView={true}
                  showTitle={true}
                  onTitleEdit={(newTitle) => {
                    // 更新记录标题
                    try {
                      historyManager.updateRecord(selectedRecord.id, { title: newTitle })
                      loadRecords()
                    } catch (error) {
                      console.error('更新标题失败:', error)
                    }
                  }}
                  onRegenerate={() => {
                    handleApplyRecord(selectedRecord)
                    setShowPreview(false)
                  }}
                  onClose={() => setShowPreview(false)}
                />
              )}
              {selectedRecord.type === 'extract' && (
                <Card>
                  <CardHeader>
                    <CardTitle>知识点提取记录</CardTitle>
                    <CardDescription>查看提取的知识点内容</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">基础信息</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>年级：{selectedRecord.baseInfo.grade}年级</div>
                          <div>难度：{selectedRecord.baseInfo.difficulty === 'low' ? '低难度' : selectedRecord.baseInfo.difficulty === 'medium' ? '中等难度' : '高难度'}</div>
                          <div>主题：{selectedRecord.baseInfo.theme}</div>
                          <div>创建时间：{formatTime(selectedRecord.timestamp)}</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">提取的知识点</h4>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <pre className="whitespace-pre-wrap text-sm">{selectedRecord.baseInfo.knowledgePoints}</pre>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => {
                            handleApplyRecord(selectedRecord)
                            setShowPreview(false)
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          应用到当前配置
                        </Button>
                        <Button variant="outline" onClick={() => setShowPreview(false)}>
                          关闭
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}