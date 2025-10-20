/**
 * 任务管理组合式函数
 */

import { ref, watch } from 'vue'
import { useLlmTranslateStore } from '../stores'
import { ElMessage } from 'element-plus'
import type { TaskManagementOptions } from './types'

export function useTaskManagement(options: TaskManagementOptions = {}) {
  const store = useLlmTranslateStore()
  const isLoading = ref(false)
  const refreshTimer = ref<number | null>(null)

  /**
   * 加载任务列表
   */
  const loadTasks = async (batchId: string) => {
    isLoading.value = true
    try {
      await store.fetchTaskList(batchId)
    } catch (_error) {
      ElMessage({ message: '加载任务列表失败', type: 'error' })
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重试失败任务
   */
  const retryFailedTasks = async () => {
    if (!store.currentBatch) return

    try {
      await store.retryFailedTasks()
      ElMessage({ message: '已重新发送失败的任务', type: 'success' })
    } catch (_error) {
      ElMessage({ message: '重试任务失败', type: 'error' })
    }
  }

  /**
   * 暂停所有任务
   */
  const pauseAllTasks = () => {
    if (store.currentBatch) {
      store.currentBatch.status = 'paused'
      ElMessage({ message: '已暂停所有任务', type: 'info' })
    }
  }

  /**
   * 恢复所有任务
   */
  const resumeAllTasks = () => {
    if (store.currentBatch) {
      store.currentBatch.status = 'running'
      ElMessage({ message: '已恢复任务执行', type: 'success' })
    }
  }

  /**
   * 清空已完成任务
   */
  const clearCompletedTasks = () => {
    store.taskList = store.taskList.filter(t => t.status !== 'completed')
    ElMessage({ message: '已清空已完成的任务', type: 'success' })
  }

  /**
   * 选择/取消选择任务
   */
  const toggleTaskSelection = (taskId: string) => {
    const index = store.selectedTasks.indexOf(taskId)
    if (index > -1) {
      store.selectedTasks.splice(index, 1)
    } else {
      store.selectedTasks.push(taskId)
    }
  }

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (store.selectedTasks.length === store.filteredTaskList.length) {
      store.selectedTasks = []
    } else {
      store.selectedTasks = store.filteredTaskList.map(t => t.id)
    }
  }

  /**
   * 启动自动刷新
   */
  const startAutoRefresh = () => {
    if (!options.autoRefresh) return

    const interval = options.refreshInterval || 3000
    refreshTimer.value = window.setInterval(() => {
      if (store.currentBatch) {
        loadTasks(store.currentBatch.id)
      }
    }, interval)
  }

  /**
   * 停止自动刷新
   */
  const stopAutoRefresh = () => {
    if (refreshTimer.value) {
      clearInterval(refreshTimer.value)
      refreshTimer.value = null
    }
  }

  // 自动刷新监听
  if (options.autoRefresh) {
    watch(() => store.currentBatch, (newBatch) => {
      if (newBatch && newBatch.status === 'running') {
        startAutoRefresh()
      } else {
        stopAutoRefresh()
      }
    }, { immediate: true })
  }

  return {
    isLoading,
    loadTasks,
    retryFailedTasks,
    pauseAllTasks,
    resumeAllTasks,
    clearCompletedTasks,
    toggleTaskSelection,
    toggleSelectAll,
    startAutoRefresh,
    stopAutoRefresh
  }
}

