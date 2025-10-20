/**
 * Translate 模块状态管理
 * 精简版 Store，主要负责状态管理和业务逻辑协调
 */

import { defineStore } from 'pinia'
import { ref, computed, toRaw } from 'vue'
import type { Batch, Task, TranslateConfig, TaskFilter } from '../types'
import type { 
  TranslateState, 
  TranslateDatasource, 
  BatchStats, 
  TokenEstimate 
} from './translate.types'
import { 
  createTranslateDatasource, 
  calculateProgress, 
  estimateTokens, 
  calculateCost 
} from './translate.datasource'

export const useLlmTranslateStore = defineStore('llmTranslate', () => {
  // ==================== 状态定义 ====================
  
  /** 配置状态 */
  const config = ref<TranslateConfig>({
    inputSource: 'file',
    content: '',
    filePath: '',
    systemPrompt: '你是一个专业的翻译助手，请将以下内容翻译成英文。',
    chunkStrategy: 'line',
    chunkSizeByLine: 50,
    chunkSizeByToken: 2000,
    concurrency: 3,
    replyMode: 'predicted',
    predictedTokens: 2000,
    modelId: 'gpt-4'
  })

  /** 批次列表 */
  const batchList = ref<Batch[]>([])

  /** 当前批次 */
  const currentBatch = ref<Batch | null>(null)

  /** 任务列表 */
  const taskList = ref<Task[]>([])

  /** 选中的任务ID列表 */
  const selectedTasks = ref<string[]>([])
  
  /** 选中的任务ID集合 */
  const selectedTaskIds = ref<Set<string>>(new Set())

  /** 任务过滤器 */
  const taskFilters = ref<TaskFilter>({
    status: ['queued', 'waiting', 'throttled', 'error', 'unsent'],
    searchText: '',
    selectMode: false
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

  /** Mock 模式开关 */
  const useMock = ref(false) // 使用真实数据

  // ==================== Datasource 实例 ====================
  
  const datasource = computed<TranslateDatasource>(() => {
    return createTranslateDatasource({
      useMock: useMock.value,
      electronAPI: typeof window !== 'undefined' ? (window as any).nimbria?.llmTranslate : undefined
    })
  })

  // ==================== 计算属性 ====================

  /** 批次统计 */
  const batchStats = computed<BatchStats | null>(() => {
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
  const tokenEstimate = computed<TokenEstimate>(() => {
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

  // ==================== 数据操作方法 ====================

  /**
   * 获取批次列表
   */
  const fetchBatchList = async () => {
    loading.value = true
    error.value = null

    try {
      const batches = await datasource.value.fetchBatchList()
      batchList.value = batches
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取批次列表失败'
      console.error('Failed to fetch batch list:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取任务列表
   */
  const fetchTaskList = async (batchId: string) => {
    loading.value = true
    error.value = null

    try {
      const tasks = await datasource.value.fetchTaskList(batchId)
      
      // 计算进度并解析元数据
      tasks.forEach(task => {
        task.progress = calculateProgress(task.replyTokens, task.predictedTokens)
        
        // 解析 metadataJson 为 metadata 对象
        if (task.metadataJson && !task.metadata) {
          try {
            task.metadata = JSON.parse(task.metadataJson)
          } catch (e) {
            console.error('Failed to parse task metadata:', e)
            task.metadata = undefined
          }
        }
      })
      
      taskList.value = tasks
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
      // 去除 Proxy，确保能通过 Electron IPC
      const plainConfig = JSON.parse(JSON.stringify(toRaw(configData)))
      const newBatch = await datasource.value.createBatch(plainConfig)
      batchList.value.unshift(newBatch)
      return newBatch
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建批次失败'
      console.error('Failed to create batch:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 切换到指定批次
   */
  const switchToBatch = async (batchId: string) => {
    const batch = batchList.value.find(b => b.id === batchId)
    if (!batch) {
      throw new Error(`批次 ${batchId} 不存在`)
    }

    currentBatch.value = batch
    await fetchTaskList(batchId)
    
    // 清空选择状态
    selectedTaskIds.value.clear()
    taskFilters.value.selectMode = false
  }

  /**
   * 重试失败任务
   */
  const retryFailedTasks = async () => {
    if (!currentBatch.value) return

    loading.value = true
    error.value = null

    try {
      await datasource.value.retryFailedTasks(currentBatch.value.id)
      // 重新加载任务列表
      await fetchTaskList(currentBatch.value.id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重试失败任务失败'
      console.error('Failed to retry failed tasks:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 暂停批次
   */
  const pauseBatch = async (batchId: string) => {
    loading.value = true
    error.value = null

    try {
      await datasource.value.pauseBatch(batchId)
      // 更新本地状态
      const batch = batchList.value.find(b => b.id === batchId)
      if (batch) {
        batch.status = 'paused'
      }
      if (currentBatch.value?.id === batchId) {
        currentBatch.value.status = 'paused'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '暂停批次失败'
      console.error('Failed to pause batch:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 恢复批次
   */
  const resumeBatch = async (batchId: string) => {
    loading.value = true
    error.value = null

    try {
      await datasource.value.resumeBatch(batchId)
      // 更新本地状态
      const batch = batchList.value.find(b => b.id === batchId)
      if (batch) {
        batch.status = 'running'
      }
      if (currentBatch.value?.id === batchId) {
        currentBatch.value.status = 'running'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '恢复批次失败'
      console.error('Failed to resume batch:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 发送选中任务
   */
  const sendSelectedTasks = async () => {
    if (selectedTaskIds.value.size === 0) {
      throw new Error('没有选中任务')
    }

    loading.value = true
    error.value = null

    try {
      const taskIds = Array.from(selectedTaskIds.value)
      await datasource.value.sendTasks(taskIds)
      
      // 重新加载任务列表
      if (currentBatch.value) {
        await fetchTaskList(currentBatch.value.id)
      }
      
      // 清空选择
      selectedTaskIds.value.clear()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '发送任务失败'
      console.error('Failed to send tasks:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除选中任务
   */
  const deleteSelectedTasks = async () => {
    if (selectedTaskIds.value.size === 0) {
      throw new Error('没有选中任务')
    }

    loading.value = true
    error.value = null

    try {
      const taskIds = Array.from(selectedTaskIds.value)
      await datasource.value.deleteTasks(taskIds)
      
      // 重新加载任务列表
      if (currentBatch.value) {
        await fetchTaskList(currentBatch.value.id)
      }
      
      // 清空选择
      selectedTaskIds.value.clear()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除任务失败'
      console.error('Failed to delete tasks:', err)
    } finally {
      loading.value = false
    }
  }

  // ==================== 初始化 ====================

  /**
   * 初始化 Store
   */
  const initialize = async () => {
    await fetchBatchList()
  }

  // ==================== 返回 Store 接口 ====================

  return {
    // 状态
    config,
    batchList,
    currentBatch,
    taskList,
    selectedTasks,
    selectedTaskIds,
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
    switchToBatch,
    retryFailedTasks,
    pauseBatch,
    resumeBatch,
    sendSelectedTasks,
    deleteSelectedTasks,
    initialize
  }
})
