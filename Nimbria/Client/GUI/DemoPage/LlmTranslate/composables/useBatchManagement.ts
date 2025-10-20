/**
 * 批次管理组合式函数
 */

import { ref, toRaw } from 'vue'
import { h } from 'vue'
import { useLlmTranslateStore } from '../stores'
import { ElMessage } from 'element-plus'
import type { BatchManagementOptions } from './types'
import type { Batch } from '../types/batch'

export function useBatchManagement(_options: BatchManagementOptions = {}) {
  const store = useLlmTranslateStore()
  const isCreating = ref(false)

  /**
   * 创建新批次
   */
  const createNewBatch = async () => {
    isCreating.value = true
    try {
      // 去除 Proxy，转换为纯对象以便 Electron IPC 传递
      const plainConfig = JSON.parse(JSON.stringify(toRaw(store.config)))
      const newBatch = await store.createBatch(plainConfig)
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', `批次 ${newBatch.id} 创建成功`),
        type: 'success'
      })
      return newBatch
    } catch (_error) {
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', '创建批次失败'),
        type: 'error'
      })
      return null
    } finally {
      isCreating.value = false
    }
  }

  /**
   * 切换批次
   */
  const switchToBatch = async (batchId: string) => {
    try {
      await store.switchToBatch(batchId)
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', `已切换到批次 ${batchId}`),
        type: 'success'
      })
    } catch (_error) {
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', '切换批次失败'),
        type: 'error'
      })
    }
  }

  /**
   * 删除批次
   */
  const deleteBatch = (_batchId: string) => {
    // TODO: 实现删除逻辑
    // @ts-ignore - Element Plus message type compatibility
    ElMessage({
      message: h('p', '删除批次功能待实现'),
      type: 'info'
    })
  }

  /**
   * 暂停批次
   */
  const pauseBatch = (batchId: string) => {
    const batch = store.batchList.find((b: Batch) => b.id === batchId)
    if (batch) {
      batch.status = 'paused'
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', `批次 ${batchId} 已暂停`),
        type: 'info'
      })
    }
  }

  /**
   * 恢复批次
   */
  const resumeBatch = (batchId: string) => {
    const batch = store.batchList.find((b: Batch) => b.id === batchId)
    if (batch) {
      batch.status = 'running'
      // @ts-ignore - Element Plus message type compatibility
      ElMessage({
        message: h('p', `批次 ${batchId} 已恢复`),
        type: 'success'
      })
    }
  }

  return {
    isCreating,
    createNewBatch,
    switchToBatch,
    deleteBatch,
    pauseBatch,
    resumeBatch
  }
}

