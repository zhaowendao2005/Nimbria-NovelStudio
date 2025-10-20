/**
 * LlmTranslate Mock 数据
 */

import type { Batch, Task } from '../types'

export const mockBatchList: Batch[] = [
  {
    id: '#20250115-001',
    status: 'running',
    totalTasks: 1250,
    completedTasks: 1100,
    failedTasks: 10,
    throttledTasks: 5,
    waitingTasks: 45,
    unsentTasks: 90,
    createdAt: '2025-01-15 14:32:15',
    startedAt: '2025-01-15 14:32:20',
    totalCost: 12.50,
    totalInputTokens: 250000,
    totalOutputTokens: 200000,
    avgTimePerTask: 1.2
  },
  {
    id: '#20250114-005',
    status: 'completed',
    totalTasks: 800,
    completedTasks: 800,
    failedTasks: 0,
    throttledTasks: 0,
    waitingTasks: 0,
    unsentTasks: 0,
    createdAt: '2025-01-14 10:15:30',
    startedAt: '2025-01-14 10:15:35',
    completedAt: '2025-01-14 11:20:15',
    totalCost: 8.50,
    totalInputTokens: 180000,
    totalOutputTokens: 150000,
    avgTimePerTask: 0.95
  },
  {
    id: '#20250114-004',
    status: 'completed',
    totalTasks: 500,
    completedTasks: 500,
    failedTasks: 0,
    throttledTasks: 0,
    waitingTasks: 0,
    unsentTasks: 0,
    createdAt: '2025-01-14 08:30:00',
    startedAt: '2025-01-14 08:30:05',
    completedAt: '2025-01-14 09:15:30',
    totalCost: 5.20,
    totalInputTokens: 100000,
    totalOutputTokens: 95000,
    avgTimePerTask: 1.05
  }
]

export const mockTaskList: Task[] = [
  {
    id: '#1250',
    batchId: '#20250115-001',
    status: 'throttled',
    content: '这是一段需要翻译的文本，内容较长，用于测试翻译效果...',
    sentTime: '14:30:25',
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    errorMessage: 'Rate limit exceeded (429)',
    retryCount: 2
  },
  {
    id: '#1249',
    batchId: '#20250115-001',
    status: 'waiting',
    content: 'Another text that needs translation for testing purposes...',
    sentTime: '14:30:18',
    replyTokens: 500,
    predictedTokens: 2000,
    progress: 25,
    retryCount: 0
  },
  {
    id: '#1248',
    batchId: '#20250115-001',
    status: 'completed',
    content: 'Text completed successfully for translation demo.',
    translation: '文本翻译成功完成的演示。',
    sentTime: '14:28:45',
    replyTime: '14:28:47',
    replyTokens: 2000,
    predictedTokens: 2000,
    progress: 100,
    retryCount: 0
  },
  {
    id: '#1247',
    batchId: '#20250115-001',
    status: 'error',
    content: 'Error occurred during this translation task...',
    sentTime: '14:28:30',
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    errorMessage: 'Network error: Connection timeout',
    retryCount: 1
  },
  {
    id: '#1246',
    batchId: '#20250115-001',
    status: 'unsent',
    content: 'Waiting to be sent for translation...',
    replyTokens: 0,
    predictedTokens: 2000,
    progress: 0,
    retryCount: 0
  }
]

