/**
 * Translate 模块数据源抽象层
 * 负责统一 Mock 和 Electron IPC 的数据访问接口
 */

import type { Batch, Task, TranslateConfig } from '../types'
import type { TranslateDatasource, DatasourceContext } from './translate.types'
import { MockTranslateDatasource } from './translate.mock'

// ==================== 工具函数 ====================

/**
 * 去除对象中的 Proxy，转换为纯对象
 * 用于 Electron IPC 传递时避免 structured clone 错误
 */
function toPlainObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ==================== Electron Datasource 实现 ====================

class ElectronTranslateDatasource implements TranslateDatasource {
  private electronAPI: any

  constructor(electronAPI: any) {
    this.electronAPI = electronAPI
  }

  async fetchBatchList(): Promise<Batch[]> {
    const result = await this.electronAPI.getBatches()
    if (result.success && result.data) {
      return result.data.batches
    } else {
      throw new Error(result.error || '获取批次列表失败')
    }
  }

  async fetchTaskList(batchId: string): Promise<Task[]> {
    const result = await this.electronAPI.getTasks({ batchId })
    if (result.success && result.data) {
      return result.data.tasks
    } else {
      throw new Error(result.error || '获取任务列表失败')
    }
  }

  async createBatch(config: TranslateConfig): Promise<Batch> {
    const plainConfig = toPlainObject(config)
    const result = await this.electronAPI.createBatch({ config: plainConfig })
    if (result.success && result.data) {
      return result.data.batch
    } else {
      throw new Error(result.error || '创建批次失败')
    }
  }

  async updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch> {
    const plainUpdates = toPlainObject(updates)
    const result = await this.electronAPI.updateBatch({ batchId, updates: plainUpdates })
    if (result.success && result.data) {
      return result.data.batch
    } else {
      throw new Error(result.error || '更新批次失败')
    }
  }

  async deleteBatch(batchId: string): Promise<void> {
    const result = await this.electronAPI.deleteBatch({ batchId })
    if (!result.success) {
      throw new Error(result.error || '删除批次失败')
    }
  }

  async retryFailedTasks(batchId: string): Promise<void> {
    const result = await this.electronAPI.retryFailedTasks({ batchId })
    if (!result.success) {
      throw new Error(result.error || '重试失败任务失败')
    }
  }

  async resumeBatch(batchId: string): Promise<void> {
    const result = await this.electronAPI.resumeBatch({ batchId })
    if (!result.success) {
      throw new Error(result.error || '恢复批次失败')
    }
  }

  async sendTasks(batchId: string, taskIds: string[], config: TranslateConfig): Promise<void> {
    const plainTaskIds = toPlainObject(taskIds)
    const plainConfig = toPlainObject(config)
    const result = await this.electronAPI.submitTasks({ batchId, taskIds: plainTaskIds, config: plainConfig })
    if (!result.success) {
      throw new Error(result.error || '发送任务失败')
    }
  }

  async deleteTasks(taskIds: string[]): Promise<void> {
    const plainTaskIds = toPlainObject(taskIds)
    const result = await this.electronAPI.deleteTasks({ taskIds: plainTaskIds })
    if (!result.success) {
      throw new Error(result.error || '删除任务失败')
    }
  }

  async retryTask(taskId: string): Promise<void> {
    const result = await this.electronAPI.retryTask({ taskId })
    if (!result.success) {
      throw new Error(result.error || '重试任务失败')
    }
  }

  async retryTaskWithPrompt(taskId: string, modifiedSystemPrompt?: string): Promise<void> {
    const result = await this.electronAPI.retryTaskWithPrompt({ 
      taskId, 
      modifiedSystemPrompt 
    })
    if (!result.success) {
      throw new Error(result.error || '重发任务失败')
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const result = await this.electronAPI.cancelTask({ taskId })
    if (!result.success) {
      throw new Error(result.error || '取消任务失败')
    }
  }

  async updateBatchConfig(batchId: string, updates: Partial<TranslateConfig>): Promise<void> {
    const plainUpdates = toPlainObject(updates)
    console.log(`📡 [Datasource] 调用后端更新批次配置:`, { batchId, updates: plainUpdates })
    
    const result = await this.electronAPI.updateBatchConfig({ batchId, updates: plainUpdates })
    if (!result.success) {
      throw new Error(result.error || '更新批次配置失败')
    }
    
    console.log(`✅ [Datasource] 批次配置已成功更新`)
  }

  // ===== Token换算配置管理 =====

  async createTokenConfig(config: { name: string; chineseRatio: number; asciiRatio: number; description?: string }): Promise<any> {
    const result = await this.electronAPI.createTokenConfig({ config })
    if (!result.success) {
      throw new Error(result.error || '创建配置失败')
    }
    return result.data
  }

  async getTokenConfigs(): Promise<any[]> {
    const result = await this.electronAPI.getTokenConfigs()
    if (!result.success) {
      throw new Error(result.error || '获取配置失败')
    }
    return result.data
  }

  async deleteTokenConfig(id: string): Promise<void> {
    const result = await this.electronAPI.deleteTokenConfig({ id })
    if (!result.success) {
      throw new Error(result.error || '删除配置失败')
    }
  }

  // ========== 系统提示词模板管理 ==========

  async getPromptTemplates(): Promise<any[]> {
    const result = await this.electronAPI.getPromptTemplates()
    if (!result.success) {
      throw new Error(result.error || '获取系统提示词模板失败')
    }
    return result.data
  }

  async getPromptTemplate(id: string): Promise<any> {
    const result = await this.electronAPI.getPromptTemplate({ id })
    if (!result.success) {
      throw new Error(result.error || '获取系统提示词模板失败')
    }
    return result.data
  }

  async createPromptTemplate(template: { name: string; content: string; category?: string; description?: string }): Promise<any> {
    const result = await this.electronAPI.createPromptTemplate({ template })
    if (!result.success) {
      throw new Error(result.error || '创建系统提示词模板失败')
    }
    return result.data
  }

  async updatePromptTemplate(id: string, updates: { name?: string; content?: string; category?: string; description?: string }): Promise<void> {
    const result = await this.electronAPI.updatePromptTemplate({ id, updates })
    if (!result.success) {
      throw new Error(result.error || '更新系统提示词模板失败')
    }
  }

  async deletePromptTemplate(id: string): Promise<void> {
    const result = await this.electronAPI.deletePromptTemplate({ id })
    if (!result.success) {
      throw new Error(result.error || '删除系统提示词模板失败')
    }
  }
}

// ==================== Datasource 工厂 ====================

export function createTranslateDatasource(context: DatasourceContext): TranslateDatasource {
  if (context.useMock) {
    return new MockTranslateDatasource()
  } else {
    if (!context.electronAPI) {
      throw new Error('Electron API not available')
    }
    return new ElectronTranslateDatasource(context.electronAPI)
  }
}

// ==================== 工具方法 ====================

/**
 * 计算任务进度百分比
 */
export function calculateProgress(replyTokens: number, predictedTokens: number): number {
  if (predictedTokens <= 0) return 0
  return Math.min(100, Math.round((replyTokens / predictedTokens) * 100))
}

/**
 * 估算文本的 Token 数量
 */
export function estimateTokens(text: string): number {
  // 简单估算：中文按字符数，英文按单词数 * 1.3
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
  const englishWords = text.replace(/[\u4e00-\u9fff]/g, '').split(/\s+/).filter(w => w.length > 0).length
  
  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3)
}

/**
 * 计算预估成本
 */
export function calculateCost(tokens: number, modelId: string): number {
  // 简化的成本计算，实际应该根据模型定价
  const costPerToken: Record<string, number> = {
    'gpt-4': 0.00003,
    'gpt-3.5-turbo': 0.000002,
    'claude-3': 0.000015
  }
  
  const rate = costPerToken[modelId] ?? 0.00001 // 默认费率
  return Math.round(tokens * rate * 100) / 100 // 保留两位小数
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp?: string | null): string {
  if (!timestamp) return ''
  
  try {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return timestamp
  }
}

/**
 * 生成批次ID
 */
export function generateBatchId(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = now.getTime().toString().slice(-6)
  return `#${dateStr}-${timeStr}`
}
