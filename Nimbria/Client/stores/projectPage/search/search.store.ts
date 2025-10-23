/**
 * Search Panel Store
 * 支持多实例（每个标签页一个独立状态）
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchInstanceState } from './search.types'

export const useSearchStore = defineStore('projectPage-search', () => {
  // ==================== 状态 ====================
  
  // 使用 Map 存储每个标签页的独立状态
  const instances = ref<Map<string, SearchInstanceState>>(new Map())
  
  // ==================== 方法 ====================
  
  /**
   * 获取指定标签页的状态
   */
  const getInstance = (tabId: string): SearchInstanceState | undefined => {
    return instances.value.get(tabId)
  }
  
  /**
   * 初始化标签页状态
   */
  const initInstance = (tabId: string): SearchInstanceState => {
    if (instances.value.has(tabId)) {
      return instances.value.get(tabId)!
    }
    
    const newInstance: SearchInstanceState = {
      tabId,
      initialized: true
    }
    
    instances.value.set(tabId, newInstance)
    console.log('[Search Store] Instance initialized:', tabId)
    return newInstance
  }
  
  /**
   * 移除标签页状态
   */
  const removeInstance = (tabId: string) => {
    instances.value.delete(tabId)
    console.log('[Search Store] Instance removed:', tabId)
  }
  
  /**
   * 重置所有状态
   */
  const reset = () => {
    instances.value.clear()
    console.log('[Search Store] All instances cleared')
  }
  
  // ==================== 返回 ====================
  
  return {
    instances,
    getInstance,
    initInstance,
    removeInstance,
    reset
  }
})

