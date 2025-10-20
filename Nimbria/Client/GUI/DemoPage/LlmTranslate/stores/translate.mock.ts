/**
 * Translate 模块 Mock 数据和方法
 */

import type { Batch, Task, TranslateConfig } from '../types'
import type { TranslateDatasource } from './translate.types'

// ==================== Mock 数据 ====================

export const mockBatchList: Batch[] = [
  {
    id: '#20250115-001',
    status: 'running',
    configJson: '{}',
    totalTasks: 1250,
    completedTasks: 1100,
    failedTasks: 10,
    throttledTasks: 5,
    waitingTasks: 45,
    unsentTasks: 90,
    terminatedTasks: 0,
    totalCost: 12.50,
    totalInputTokens: 250000,
    totalOutputTokens: 200000,
    avgTimePerTask: 1.2,
    fastestTaskTime: 0.5,
    slowestTaskTime: 3.2,
    estimatedCompletionTime: null,
    createdAt: '2025-01-15 14:32:15',
    startedAt: '2025-01-15 14:32:20',
    completedAt: null,
    updatedAt: '2025-01-15 14:35:10'
  },
  {
    id: '#20250114-005',
    status: 'completed',
    configJson: '{}',
    totalTasks: 800,
    completedTasks: 800,
    failedTasks: 0,
    throttledTasks: 0,
    waitingTasks: 0,
    unsentTasks: 0,
    terminatedTasks: 0,
    totalCost: 8.50,
    totalInputTokens: 180000,
    totalOutputTokens: 150000,
    avgTimePerTask: 0.95,
    fastestTaskTime: 0.6,
    slowestTaskTime: 2.1,
    estimatedCompletionTime: null,
    createdAt: '2025-01-14 10:15:30',
    startedAt: '2025-01-14 10:15:35',
    completedAt: '2025-01-14 11:20:15',
    updatedAt: '2025-01-14 11:20:15'
  },
  {
    id: '#20250114-004',
    status: 'completed',
    configJson: '{}',
    totalTasks: 500,
    completedTasks: 500,
    failedTasks: 0,
    throttledTasks: 0,
    waitingTasks: 0,
    unsentTasks: 0,
    terminatedTasks: 0,
    totalCost: 5.20,
    totalInputTokens: 100000,
    totalOutputTokens: 95000,
    avgTimePerTask: 1.05,
    fastestTaskTime: 0.7,
    slowestTaskTime: 1.8,
    estimatedCompletionTime: null,
    createdAt: '2025-01-14 08:30:00',
    startedAt: '2025-01-14 08:30:05',
    completedAt: '2025-01-14 09:15:30',
    updatedAt: '2025-01-14 09:15:30'
  }
]

export const mockTaskList: Task[] = [
  {
    id: '#1250',
    batchId: '#20250115-001',
    status: 'throttled',
    content: '这是一段需要翻译的文本，内容较长，用于测试翻译效果...',
    translation: undefined,
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    sentTime: '2025-01-15 14:30:25',
    replyTime: undefined,
    errorMessage: 'Rate limit exceeded (429)',
    retryCount: 2,
    metadata: {
      systemPrompt: '你是一个专业的翻译助手，请将以下内容翻译成英文。',
      chunkStrategy: 'line',
      chunkSizeByLine: 50,
      chunkSizeByToken: 2000,
      concurrency: 3,
      replyMode: 'predicted',
      modelId: 'gpt-4',
      estimatedInputTokens: 1500,
      estimatedOutputTokens: 2000,
      estimatedCost: 0.15
    }
  },
  {
    id: '#1249',
    batchId: '#20250115-001',
    status: 'waiting',
    content: 'Another text that needs translation for testing purposes...',
    translation: undefined,
    replyTokens: 500,
    predictedTokens: 2000,
    progress: 25,
    sentTime: '2025-01-15 14:30:18',
    replyTime: undefined,
    errorMessage: undefined,
    retryCount: 0,
    metadata: {
      systemPrompt: '你是一个专业的翻译助手，请将以下内容翻译成英文。',
      chunkStrategy: 'line',
      chunkSizeByLine: 50,
      chunkSizeByToken: 2000,
      concurrency: 3,
      replyMode: 'predicted',
      modelId: 'gpt-4',
      estimatedInputTokens: 1200,
      estimatedOutputTokens: 2000,
      estimatedCost: 0.12
    }
  },
  {
    id: '#1248',
    batchId: '#20250115-001',
    status: 'completed',
    content: 'Text completed successfully for translation demo.',
    translation: '文本翻译成功完成的演示。',
    replyTokens: 2000,
    predictedTokens: 2000,
    progress: 100,
    sentTime: '2025-01-15 14:28:45',
    replyTime: '2025-01-15 14:28:47',
    errorMessage: undefined,
    retryCount: 0,
    metadata: {
      systemPrompt: '你是一个专业的翻译助手，请将以下内容翻译成英文。',
      chunkStrategy: 'line',
      chunkSizeByLine: 50,
      chunkSizeByToken: 2000,
      concurrency: 3,
      replyMode: 'predicted',
      modelId: 'gpt-4',
      estimatedInputTokens: 1000,
      estimatedOutputTokens: 2000,
      actualInputTokens: 1000,
      actualOutputTokens: 2000,
      estimatedCost: 0.10,
      actualCost: 0.15
    }
  },
  {
    id: '#1247',
    batchId: '#20250115-001',
    status: 'error',
    content: 'Error occurred during this translation task...',
    translation: null,
    inputTokens: 1100,
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    sentTime: '2025-01-15 14:28:30',
    replyTime: null,
    durationMs: null,
    errorMessage: 'Network error: Connection timeout',
    errorType: 'timeout',
    retryCount: 1,
    cost: 0,
    metadataJson: null,
    createdAt: '2025-01-15 14:28:25',
    updatedAt: '2025-01-15 14:28:30'
  },
  {
    id: '#1246',
    batchId: '#20250115-001',
    status: 'queued',
    content: 'Queued task waiting to be processed...',
    translation: null,
    inputTokens: 1300,
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    sentTime: null,
    replyTime: null,
    durationMs: null,
    errorMessage: null,
    errorType: null,
    retryCount: 0,
    cost: 0,
    metadataJson: null,
    createdAt: '2025-01-15 14:28:20',
    updatedAt: '2025-01-15 14:28:20'
  },
  {
    id: '#1245',
    batchId: '#20250115-001',
    status: 'unsent',
    content: 'Waiting to be sent for translation...',
    translation: null,
    inputTokens: 1300,
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    sentTime: null,
    replyTime: null,
    durationMs: null,
    errorMessage: null,
    errorType: null,
    retryCount: 0,
    cost: 0,
    metadataJson: null,
    createdAt: '2025-01-15 14:28:20',
    updatedAt: '2025-01-15 14:28:20'
  }
]

// ==================== Mock Datasource 实现 ====================

export class MockTranslateDatasource implements TranslateDatasource {
  private delay(ms: number = 300): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async fetchBatchList(): Promise<Batch[]> {
    await this.delay()
    return [...mockBatchList]
  }

  async fetchTaskList(batchId: string): Promise<Task[]> {
    await this.delay()
    return mockTaskList.filter(task => task.batchId === batchId)
  }

  async createBatch(config: TranslateConfig): Promise<Batch> {
    await this.delay(500)
    
    const newBatch: Batch = {
      id: `#${Date.now().toString().slice(-8)}`,
      status: 'running',
      configJson: JSON.stringify(config),
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      throttledTasks: 0,
      waitingTasks: 0,
      unsentTasks: 0,
      terminatedTasks: 0,
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      avgTimePerTask: 0,
      fastestTaskTime: 0,
      slowestTaskTime: 0,
      estimatedCompletionTime: null,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      startedAt: null,
      completedAt: null,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }

    // 模拟添加到列表
    mockBatchList.unshift(newBatch)
    return newBatch
  }

  async updateBatch(batchId: string, updates: Partial<Batch>): Promise<Batch> {
    await this.delay()
    
    const batchIndex = mockBatchList.findIndex(b => b.id === batchId)
    if (batchIndex === -1) {
      throw new Error(`Batch ${batchId} not found`)
    }

    mockBatchList[batchIndex] = {
      ...mockBatchList[batchIndex],
      ...updates,
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }

    return mockBatchList[batchIndex]
  }

  async deleteBatch(batchId: string): Promise<void> {
    await this.delay()
    
    const batchIndex = mockBatchList.findIndex(b => b.id === batchId)
    if (batchIndex === -1) {
      throw new Error(`Batch ${batchId} not found`)
    }

    mockBatchList.splice(batchIndex, 1)
  }

  async retryFailedTasks(batchId: string): Promise<void> {
    await this.delay()
    console.log(`Mock: Retrying failed tasks for batch ${batchId}`)
  }

  async pauseBatch(batchId: string): Promise<void> {
    await this.delay()
    await this.updateBatch(batchId, { status: 'paused' })
  }

  async resumeBatch(batchId: string): Promise<void> {
    await this.delay()
    await this.updateBatch(batchId, { status: 'running' })
  }

  async sendTasks(taskIds: string[]): Promise<void> {
    await this.delay()
    console.log(`Mock: Sending tasks`, taskIds)
  }

  async deleteTasks(taskIds: string[]): Promise<void> {
    await this.delay()
    console.log(`Mock: Deleting tasks`, taskIds)
  }
}
