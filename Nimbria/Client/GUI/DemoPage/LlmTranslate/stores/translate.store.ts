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

  /** 批次选择相关状态 */
  const selectedBatchIds = ref<Set<string>>(new Set())
  const batchSelectMode = ref(false)

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
            // metadata 是可选的，解析失败时不设置
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
      // 注意：不在这里添加到列表，等待 onBatchCreated 事件触发后通过 fetchBatchList() 更新
      // 这样可以确保数据与数据库完全同步，避免重复添加
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

  // ==================== 批次管理方法 ====================

  /**
   * 切换批次选择状态
   */
  const toggleBatchSelection = (batchId: string) => {
    if (selectedBatchIds.value.has(batchId)) {
      selectedBatchIds.value.delete(batchId)
    } else {
      selectedBatchIds.value.add(batchId)
    }
  }

  /**
   * 全选批次
   */
  const selectAllBatches = () => {
    batchList.value.forEach(batch => {
      selectedBatchIds.value.add(batch.id)
    })
  }

  /**
   * 清空批次选择
   */
  const clearBatchSelection = () => {
    selectedBatchIds.value.clear()
  }

  /**
   * 删除选中批次
   */
  const deleteSelectedBatches = async () => {
    if (selectedBatchIds.value.size === 0) {
      throw new Error('没有选中批次')
    }

    loading.value = true
    error.value = null

    try {
      const batchIds = Array.from(selectedBatchIds.value)
      
      // 并行删除所有选中的批次
      await Promise.all(
        batchIds.map(batchId => datasource.value.deleteBatch(batchId))
      )
      
      // 重新加载批次列表
      await fetchBatchList()
      
      // 清空选择
      selectedBatchIds.value.clear()
      batchSelectMode.value = false
      
      console.log(`✅ 成功删除 ${batchIds.length} 个批次`)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除批次失败'
      console.error('Failed to delete batches:', err)
    } finally {
      loading.value = false
    }
  }

  // ==================== 事件监听器 ====================

  /** 事件监听器设置状态 */
  const listenersSetup = ref(false)

  /** 获取 ElectronAPI 实例 */
  const electronAPI = computed(() => {
    return typeof window !== 'undefined' ? (window as any).nimbria?.llmTranslate : undefined
  })

  /**
   * 设置事件监听器
   */
  const setupEventListeners = () => {
    if (!electronAPI.value || listenersSetup.value) return

    // 批次删除事件监听器
    electronAPI.value.onBatchDeleted((data: any) => {
      console.log('批次删除完成:', data.batchId)
      // 从本地列表中移除
      const index = batchList.value.findIndex(b => b.id === data.batchId)
      if (index !== -1) {
        batchList.value.splice(index, 1)
      }
      // 如果删除的是当前批次，清空当前状态
      if (currentBatch.value?.id === data.batchId) {
        currentBatch.value = null
        taskList.value = []
        selectedTaskIds.value.clear()
      }
    })

    electronAPI.value.onBatchDeleteError((data: any) => {
      console.error('批次删除失败:', data.error)
      error.value = `删除批次失败: ${data.error}`
    })

    // 任务删除事件监听器
    electronAPI.value.onTaskDeleted((data: any) => {
      console.log('任务删除完成:', data.taskIds)
      // 从本地任务列表中移除
      data.taskIds.forEach((taskId: string) => {
        const index = taskList.value.findIndex(t => t.id === taskId)
        if (index !== -1) {
          taskList.value.splice(index, 1)
        }
        selectedTaskIds.value.delete(taskId)
      })
      // 重新加载批次信息以更新统计
      if (currentBatch.value) {
        void fetchTaskList(currentBatch.value.id)
      }
    })

    electronAPI.value.onTaskDeleteError((data: any) => {
      console.error('任务删除失败:', data.error)
      error.value = `删除任务失败: ${data.error}`
    })

    // 批次创建事件监听器
    electronAPI.value.onBatchCreated((data: any) => {
      console.log('批次创建完成:', data.batchId)
      // 更新本地批次列表
      void fetchBatchList()
    })

    electronAPI.value.onBatchCreateError((data: any) => {
      console.error('批次创建失败:', data.error)
      error.value = `创建批次失败: ${data.error}`
    })

    listenersSetup.value = true
    console.log('✅ [Store] LLM Translate 事件监听器已设置')
  }

  // ==================== 初始化 ====================

  /**
   * 初始化 Store
   */
  const initialize = async () => {
    await fetchBatchList()
    setupEventListeners()
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
    selectedBatchIds,
    batchSelectMode,

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
    toggleBatchSelection,
    selectAllBatches,
    clearBatchSelection,
    deleteSelectedBatches,
    initialize
  }
})
