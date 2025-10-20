/**
 * LlmTranslate 专用状态管理
 * 使用Pinia创建独立的store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockBatchList, mockTaskList } from './mock'
import type { Batch, Task, TranslateConfig, TaskFilter } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const useLlmTranslateStore = defineStore('llmTranslate', () => {
  // ⭐ 单一开关：改这里切换 Mock ↔ 真实后端
  const useMock = ref(import.meta.env.MODE === 'development')

  // ==================== 状态定义 ====================
  
  /** 配置状态 */
  const config = ref<TranslateConfig>({
    inputSource: 'file',
    content: '',
    filePath: '',
    systemPrompt: '你是一个专业的翻译助手，请将以下内容翻译成英文。',
    chunkStrategy: 'line',
    chunkSize: 50,
    concurrency: 3,
    replyMode: 'predicted',
    predictedTokens: 2000,
    modelId: 'gpt-4',
    outputDir: 'D:\\output\\translate\\'
  })

  /** 批次列表 */
  const batchList = ref<Batch[]>([])

  /** 当前批次 */
  const currentBatch = ref<Batch | null>(null)

  /** 任务列表 */
  const taskList = ref<Task[]>([])

  /** 选中的任务ID列表 */
  const selectedTasks = ref<string[]>([])

  /** 任务过滤器 */
  const taskFilters = ref<TaskFilter>({
    status: ['waiting', 'throttled', 'error', 'unsent'],
    searchText: ''
  })

  /** 线程详情抽屉 */
  const threadDrawer = ref({
    isOpen: false,
    currentTaskId: null as string | null
  })

  /** 加载状态 */
  const loading = ref(false)

  /** 错误信息 */
  const error = ref<string | null>(null)

  // ==================== 计算属性 ====================

  /** 批次统计 */
  const batchStats = computed(() => {
    if (!currentBatch.value) return null
    
    const batch = currentBatch.value
    return {
      totalTasks: batch.totalTasks,
      completedTasks: batch.completedTasks,
      failedTasks: batch.failedTasks,
      successRate: batch.totalTasks > 0 
        ? Math.round((batch.completedTasks / batch.totalTasks) * 100)
        : 0
    }
  })

  /** 过滤后的任务列表 */
  const filteredTaskList = computed(() => {
    return taskList.value.filter(task => {
      const statusMatch = taskFilters.value.status.includes(task.status)
      const searchMatch = !taskFilters.value.searchText ||
        task.id.includes(taskFilters.value.searchText) ||
        task.content.includes(taskFilters.value.searchText)
      return statusMatch && searchMatch
    })
  })

  /** Token 估算 */
  const tokenEstimate = computed(() => {
    const inputTokens = estimateTokens(config.value.content)
    const systemPromptTokens = estimateTokens(config.value.systemPrompt)
    const totalTokens = inputTokens + systemPromptTokens
    const estimatedCost = calculateCost(totalTokens, config.value.modelId)

    return {
      inputTokens,
      systemPromptTokens,
      totalTokens,
      estimatedCost
    }
  })

  // ==================== 数据获取方法 ====================

  /**
   * 获取批次列表
   * 支持 Mock/真实后端切换
   */
  const fetchBatchList = async () => {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        batchList.value = mockBatchList
      } else {
        const response = await fetch(`${API_BASE_URL}/batches`)
        batchList.value = await response.json()
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取批次列表失败'
      console.error('Failed to fetch batch list:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取任务列表
   * 支持 Mock/真实后端切换
   */
  const fetchTaskList = async (batchId: string) => {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        taskList.value = mockTaskList.filter(t => t.batchId === batchId)
      } else {
        const response = await fetch(`${API_BASE_URL}/batches/${batchId}/tasks`)
        taskList.value = await response.json()
      }

      // 计算进度
      taskList.value.forEach(task => {
        task.progress = calculateProgress(task.replyTokens, task.predictedTokens)
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取任务列表失败'
      console.error('Failed to fetch task list:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建新批次
   */
  const createBatch = async (configData: TranslateConfig) => {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        // Mock 模式：模拟创建批次
        const newBatch: Batch = {
          id: `#${Date.now().toString().slice(-8)}`,
          status: 'running',
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          throttledTasks: 0,
          waitingTasks: 0,
          unsentTasks: 0,
          createdAt: new Date().toISOString(),
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          avgTimePerTask: 0
        }
        currentBatch.value = newBatch
        batchList.value.unshift(newBatch)
        return newBatch
      } else {
        // 真实后端调用
        const response = await fetch(`${API_BASE_URL}/batches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: configData })
        })
        const newBatch = await response.json()
        currentBatch.value = newBatch
        await fetchBatchList()
        return newBatch
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建批次失败'
      console.error('Failed to create batch:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 重试失败的任务
   */
  const retryFailedTasks = async (batchId: string) => {
    try {
      if (useMock.value) {
        // Mock 模式：模拟重试
        const failedTasks = taskList.value.filter(t => t.status === 'error' || t.status === 'throttled')
        failedTasks.forEach(task => {
          task.status = 'waiting'
          task.retryCount++
        })
      } else {
        await fetch(`${API_BASE_URL}/batches/${batchId}/retry`, { method: 'POST' })
        await fetchTaskList(batchId)
      }
    } catch (err) {
      console.error('Failed to retry tasks:', err)
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 计算进度百分比
   */
  const calculateProgress = (replyTokens: number, predictedTokens: number): number => {
    if (predictedTokens === 0) return 0
    return Math.min(Math.round((replyTokens / predictedTokens) * 100), 100)
  }

  /**
   * 估算Token数量
   * 简单估算：中文约0.5个字符/token，英文约4个字符/token
   */
  const estimateTokens = (text: string): number => {
    if (!text) return 0
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
    const englishWords = text.split(/\s+/).filter(w => /[a-zA-Z]/.test(w)).length
    return Math.ceil(chineseChars * 0.5 + englishWords * 0.25)
  }

  /**
   * 计算费用
   */
  const calculateCost = (tokens: number, modelId: string): number => {
    // 简单定价表（实际应该从配置读取）
    const pricePerMillion = modelId === 'gpt-4' ? 30 : 2
    return (tokens / 1000000) * pricePerMillion
  }

  /**
   * 计算预计完成时间（秒）
   */
  const calculateEstimatedTime = (
    completedTasks: number,
    totalTasks: number,
    avgTimePerTask: number
  ): number => {
    const remainingTasks = totalTasks - completedTasks
    return remainingTasks * avgTimePerTask
  }

  // ==================== Actions ====================

  /** 初始化数据 */
  const initialize = async () => {
    await fetchBatchList()
    if (batchList.value.length > 0) {
      currentBatch.value = batchList.value[0]
      await fetchTaskList(currentBatch.value.id)
    }
  }

  /** 切换当前批次 */
  const switchBatch = async (batchId: string) => {
    const batch = batchList.value.find(b => b.id === batchId)
    if (batch) {
      currentBatch.value = batch
      await fetchTaskList(batchId)
    }
  }

  /** 打开线程详情 */
  const openThreadDrawer = (taskId: string) => {
    threadDrawer.value = {
      isOpen: true,
      currentTaskId: taskId
    }
  }

  /** 关闭线程详情 */
  const closeThreadDrawer = () => {
    threadDrawer.value = {
      isOpen: false,
      currentTaskId: null
    }
  }

  return {
    // 状态
    config,
    batchList,
    currentBatch,
    taskList,
    selectedTasks,
    taskFilters,
    threadDrawer,
    loading,
    error,
    useMock,

    // 计算属性
    batchStats,
    filteredTaskList,
    tokenEstimate,

    // 方法
    fetchBatchList,
    fetchTaskList,
    createBatch,
    retryFailedTasks,
    calculateProgress,
    estimateTokens,
    calculateCost,
    calculateEstimatedTime,
    initialize,
    switchBatch,
    openThreadDrawer,
    closeThreadDrawer
  }
})

