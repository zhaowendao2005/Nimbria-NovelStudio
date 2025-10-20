/**
 * LlmTranslate 专用状态管理
 * 使用Pinia创建独立的store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockBatchList, mockTaskList } from './mock'
import type { Batch, Task, TranslateConfig, TaskFilter } from '../types'

// ⭐ 无后端服务器，所有操作通过 IPC 在本地进行
// 渲染进程 ←→ IPC Bridge ←→ 主进程 (LlmTranslateService)

export const useLlmTranslateStore = defineStore('llmTranslate', () => {
  // ⭐ 单一开关：改这里切换 Mock ↔ Electron 本地服务
  const useMock = ref(true) // 默认true便于开发测试

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
   * 支持 Mock/IPC 切换
   */
  const fetchBatchList = async () => {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        batchList.value = mockBatchList
      } else {
        // 通过 IPC 调用主进程的 getBatches()
        const result = await window.nimbria.llmTranslate.getBatches()
        if (result.success && result.data) {
          batchList.value = result.data.batches
        } else {
          throw new Error(result.error || '获取批次列表失败')
        }
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
   * 支持 Mock/IPC 切换
   */
  const fetchTaskList = async (batchId: string) => {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        taskList.value = mockTaskList.filter(t => t.batchId === batchId)
      } else {
        // 通过 IPC 调用主进程的 getTasks()
        const result = await window.nimbria.llmTranslate.getTasks({ batchId })
        if (result.success && result.data) {
          taskList.value = result.data.tasks
        } else {
          throw new Error(result.error || '获取任务列表失败')
        }
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
          configJson: JSON.stringify(configData),
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
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
          updatedAt: new Date().toISOString()
        }
        currentBatch.value = newBatch
        batchList.value.unshift(newBatch)
        return newBatch
      } else {
        // 通过 IPC 调用主进程创建批次
        const result = await window.nimbria.llmTranslate.createBatch({
          config: configData,
          content: configData.content
        })
        
        if (!result.success || !result.data?.batchId) {
          throw new Error(result.error || '创建批次失败')
        }

        // 等待批次创建完成事件（通过 Promise + 事件监听）
        return await new Promise<Batch>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('创建超时')), 30000)
          
          const handler = (data: any) => {
            if (data.batchId === result.data?.batchId) {
              clearTimeout(timeout)
              resolve(data.batch)
            }
          }
          
          window.nimbria.llmTranslate.onBatchCreated(handler)
        })
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
        // 通过 IPC 调用主进程重试
        const result = await window.nimbria.llmTranslate.retryFailedTasks({ batchId })
        if (result.success) {
          await fetchTaskList(batchId)
        } else {
          throw new Error(result.error || '重试失败')
        }
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
      const firstBatch = batchList.value[0]
      if (firstBatch) {
        currentBatch.value = firstBatch
        await fetchTaskList(firstBatch.id)
      }
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

  // ==================== 事件监听器设置 ====================

  /**
   * 设置 IPC 事件监听器
   * 在非Mock模式下调用，监听主进程发来的事件
   */
  const setupListeners = () => {
    if (useMock.value) return  // Mock 模式不需要监听

    // 批次创建事件
    window.nimbria.llmTranslate.onBatchCreateStart((data: any) => {
      console.log('📦 [Store] 批次创建开始:', data.batchId)
    })

    window.nimbria.llmTranslate.onBatchCreated((data: any) => {
      console.log('✅ [Store] 批次创建完成:', data.batchId)
      
      // 更新批次列表
      batchList.value.unshift(data.batch)
      currentBatch.value = data.batch
      taskList.value = data.tasks
    })

    window.nimbria.llmTranslate.onBatchCreateError((data: any) => {
      console.error('❌ [Store] 批次创建失败:', data.error)
      error.value = data.error
    })

    // 任务进度事件
    window.nimbria.llmTranslate.onTaskProgress((data: any) => {
      const task = taskList.value.find(t => t.id === data.taskId)
      if (task) {
        task.replyTokens = data.replyTokens
        task.progress = data.progress
        task.translation = (task.translation || '') + data.chunk
      }
    })

    // 任务完成事件
    window.nimbria.llmTranslate.onTaskComplete((data: any) => {
      const task = taskList.value.find(t => t.id === data.taskId)
      if (task) {
        task.status = 'completed'
        task.translation = data.translation
        task.progress = 100
        task.replyTokens = data.totalTokens
      }
      
      // 更新批次统计
      if (currentBatch.value && currentBatch.value.id === data.batchId) {
        currentBatch.value.completedTasks++
      }
    })

    // 任务错误事件
    window.nimbria.llmTranslate.onTaskError((data: any) => {
      const task = taskList.value.find(t => t.id === data.taskId)
      if (task) {
        if (data.errorType === 'rate_limit') {
          task.status = 'throttled'
        } else {
          task.status = 'error'
        }
        task.errorMessage = data.errorMessage
        task.errorType = data.errorType
      }
      
      // 更新批次统计
      if (currentBatch.value && currentBatch.value.id === data.batchId) {
        if (data.errorType === 'rate_limit') {
          currentBatch.value.throttledTasks++
        } else {
          currentBatch.value.failedTasks++
        }
      }
    })

    // 导出事件
    window.nimbria.llmTranslate.onExportComplete((data: any) => {
      console.log('✅ [Store] 导出完成:', data.filePath)
    })

    window.nimbria.llmTranslate.onExportError((data: any) => {
      console.error('❌ [Store] 导出失败:', data.error)
      error.value = data.error
    })
  }

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
    retryFailedTasks,
    calculateProgress,
    estimateTokens,
    calculateCost,
    calculateEstimatedTime,
    initialize,
    switchBatch,
    openThreadDrawer,
    closeThreadDrawer,
    setupListeners
  }
})

