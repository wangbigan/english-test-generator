'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Edit2, Save, X, Plus, Trash2, Settings } from 'lucide-react'
import { ThemeAndAllocationResult, ThemeScenarioWithAllocation } from '../actions/generate-theme-and-allocation'

/**
 * ThemeAllocationPreview组件的属性接口
 * 扩展支持历史记录功能
 */
interface ThemeAllocationPreviewProps {
  /** 主题场景数据或错误信息 */
  themeAndAllocation: ThemeAndAllocationResult | { error: boolean; errorMessage: string; errorType: string }
  /** 数据更新回调 */
  onUpdate?: (updated: ThemeAndAllocationResult) => void
  /** 关闭回调 */
  onClose?: () => void
  /** 是否支持编辑模式 */
  editable?: boolean
  /** 是否显示应用按钮 */
  showApplyButton?: boolean
  /** 保存为新场景的回调 */
  onSave?: (data: ThemeAndAllocationResult) => void
  /** 应用到当前配置的回调 */
  onApply?: (data: ThemeAndAllocationResult) => void
  /** 是否为历史记录查看模式 */
  isHistoryView?: boolean
}

export function ThemeAllocationPreview({ 
  themeAndAllocation, 
  onUpdate, 
  onClose,
  editable = true,
  showApplyButton = false,
  onSave,
  onApply,
  isHistoryView = false
}: ThemeAllocationPreviewProps) {
  // 检查是否为错误状态
  const isError = 'error' in themeAndAllocation && themeAndAllocation.error
  
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<ThemeAndAllocationResult>(
    isError ? {} as ThemeAndAllocationResult : themeAndAllocation as ThemeAndAllocationResult
  )

  /**
   * 处理保存操作
   * 根据是否为历史记录模式选择不同的保存方式
   */
  const handleSave = () => {
    if (isHistoryView && onSave) {
      // 历史记录模式：保存为新场景
      onSave(editedData)
    } else {
      // 普通模式：更新当前数据
      onUpdate?.(editedData)
    }
    setIsEditing(false)
  }

  /**
   * 处理取消编辑操作
   */
  const handleCancel = () => {
    if (!isError) {
      setEditedData(themeAndAllocation as ThemeAndAllocationResult)
      setIsEditing(false)
    }
  }

  /**
   * 处理应用到当前配置操作
   */
  const handleApply = () => {
    if (onApply) {
      onApply(editedData)
    }
  }

  const updateScenario = (index: number, field: keyof ThemeScenarioWithAllocation, value: string | string[]) => {
    const newScenarios = [...editedData.scenarios]
    newScenarios[index] = { ...newScenarios[index], [field]: value }
    setEditedData({ ...editedData, scenarios: newScenarios })
  }

  const addKnowledgePoint = (scenarioIndex: number, point: string) => {
    if (!point.trim()) return
    const newScenarios = [...editedData.scenarios]
    newScenarios[scenarioIndex].knowledgePoints.push(point.trim())
    setEditedData({ ...editedData, scenarios: newScenarios })
  }

  const removeKnowledgePoint = (scenarioIndex: number, pointIndex: number) => {
    const newScenarios = [...editedData.scenarios]
    newScenarios[scenarioIndex].knowledgePoints.splice(pointIndex, 1)
    setEditedData({ ...editedData, scenarios: newScenarios })
  }

  const getQuestionTypeTitle = (questionType: string): string => {
    const titles: Record<string, string> = {
      listening: '听力题',
      multipleChoice: '选择题',
      fillInBlank: '填空题',
      trueFalse: '判断题',
      reading: '阅读理解',
      writing: '写作题'
    }
    return titles[questionType] || questionType
  }



  // 如果是错误状态，显示错误信息
  if (isError) {
    const errorData = themeAndAllocation as { error: boolean; errorMessage: string; errorType: string }
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">主题场景生成失败</h2>
            <p className="text-gray-600">生成过程中出现了问题</p>
          </div>
          <Button onClick={onClose} variant="outline">
            <X className="w-4 h-4 mr-2" />
            关闭
          </Button>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              {errorData.errorType === 'api_error' ? 'API调用失败' : '生成失败'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-red-200">
                <h4 className="font-medium text-red-800 mb-2">错误详情：</h4>
                <p className="text-red-700">{errorData.errorMessage}</p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">建议解决方案：</h4>
                <ul className="text-blue-700 space-y-1 text-sm">
                  {errorData.errorType === 'api_error' ? (
                    <>
                      <li>• 检查网络连接是否正常</li>
                      <li>• 确认API密钥配置正确</li>
                      <li>• 检查API服务是否可用</li>
                      <li>• 稍后重试</li>
                    </>
                  ) : (
                    <>
                      <li>• 检查输入的主题和配置是否合理</li>
                      <li>• 尝试简化主题描述</li>
                      <li>• 减少选择的题型数量</li>
                      <li>• 稍后重试</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {isHistoryView ? '历史主题场景' : '主题场景预览'}
          </h2>
          <p className="text-gray-600">
            {isHistoryView ? '查看和编辑历史主题场景，可应用到当前配置' : '查看和编辑生成的主题场景和知识点分配'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              {/* 应用到当前配置按钮 */}
              {showApplyButton && (
                <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700">
                  <Settings className="w-4 h-4 mr-2" />
                  应用到当前配置
                </Button>
              )}
              {/* 编辑按钮 */}
              {editable && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑
                </Button>
              )}
              {/* 关闭按钮 */}
              <Button onClick={onClose} variant="outline">
                <X className="w-4 h-4 mr-2" />
                关闭
              </Button>
            </>
          ) : (
            <>
              {/* 保存按钮 */}
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                {isHistoryView ? '保存为新场景' : '保存'}
              </Button>
              {/* 取消按钮 */}
              <Button onClick={handleCancel} variant="outline">
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 主题背景 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>主题背景</span>
            <Badge variant="secondary">{editedData.mainTheme}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="mainTheme">主题名称</Label>
                <Input
                  id="mainTheme"
                  value={editedData.mainTheme}
                  onChange={(e) => setEditedData({ ...editedData, mainTheme: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="backgroundDescription">背景描述</Label>
                <Textarea
                  id="backgroundDescription"
                  value={editedData.backgroundDescription}
                  onChange={(e) => setEditedData({ ...editedData, backgroundDescription: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{editedData.backgroundDescription}</p>
          )}
        </CardContent>
      </Card>

      {/* 题型场景分配 */}
      <Card>
        <CardHeader>
          <CardTitle>题型场景分配</CardTitle>
          <CardDescription>
            为每种题型设计的具体场景和知识点分配
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {editedData.scenarios.map((scenario, index) => (
              <div key={`${scenario.questionType}-${index}`} className="border rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <Badge variant="outline">{getQuestionTypeTitle(scenario.questionType)}</Badge>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <Label>场景标题</Label>
                      <Input
                        value={scenario.scenarioTitle}
                        onChange={(e) => updateScenario(index, 'scenarioTitle', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>场景描述</Label>
                      <Textarea
                        value={scenario.scenarioDescription}
                        onChange={(e) => updateScenario(index, 'scenarioDescription', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="font-medium">{scenario.scenarioTitle}</h4>
                    <p className="text-gray-600 text-sm">{scenario.scenarioDescription}</p>
                  </div>
                )}

                <Separator className="my-3" />

                <div>
                  <Label className="text-sm font-medium">重点知识点</Label>
                  <div className="mt-2">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {scenario.knowledgePoints.map((point, pointIndex) => (
                            <div key={`edit-scenario-${index}-point-${pointIndex}`} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                              <span className="text-sm">{point}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeKnowledgePoint(index, pointIndex)}
                                className="h-4 w-4 p-0 hover:bg-red-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="添加知识点"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addKnowledgePoint(index, e.currentTarget.value)
                                e.currentTarget.value = ''
                              }
                            }}
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement
                              addKnowledgePoint(index, input.value)
                              input.value = ''
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {scenario.knowledgePoints.map((point, pointIndex) => (
                          <Badge key={`scenario-${index}-point-${pointIndex}`} variant="secondary" className="text-xs">
                            {point}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 知识点覆盖情况 */}
      <Card>
        <CardHeader>
          <CardTitle>知识点覆盖情况</CardTitle>
          <CardDescription>
            检查知识点的分配和覆盖情况
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2 text-green-700">已覆盖知识点</h4>
              <div className="space-y-1">
                {editedData.knowledgePointsCoverage.covered.map((point, index) => (
                  <Badge key={`covered-${index}`} variant="secondary" className="mr-1 mb-1 bg-green-100 text-green-800">
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
            
            {editedData.knowledgePointsCoverage.uncovered.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 text-orange-700">未覆盖知识点</h4>
                <div className="space-y-1">
                  {editedData.knowledgePointsCoverage.uncovered.map((point, index) => (
                    <Badge key={`uncovered-${index}`} variant="secondary" className="mr-1 mb-1 bg-orange-100 text-orange-800">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <h4 className="font-medium mb-2 text-blue-700">覆盖率统计</h4>
              <div className="text-sm text-gray-600">
                <p>总知识点: {editedData.knowledgePointsCoverage.total.length}</p>
                <p>已覆盖: {editedData.knowledgePointsCoverage.covered.length}</p>
                <p>覆盖率: {Math.round((editedData.knowledgePointsCoverage.covered.length / editedData.knowledgePointsCoverage.total.length) * 100)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}