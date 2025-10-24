/**
 * SearchAndScraper Store
 * 支持多实例（每个标签页一个独立状态）
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchInstanceState } from './searchAndScraper.types'

export const useSearchAndScraperStore = defineStore('projectPage-searchAndScraper', () => {
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
      initialized: true,
      currentEngine: 'google',
      searchHistory: [],
      isViewCreated: false,
      isBrowserViewVisible: false,
      currentUrl: '',
      searchQuery: '',
      isSelectingElement: false,
      selectedElements: [],
      // 小说爬取状态
      urlPrefix: '',
      urlPrefixEnabled: false,
      matchedChapters: [],
      scrapedChapters: [],
      isScrapingInProgress: false,
      scrapingProgress: null
    }
    
    instances.value.set(tabId, newInstance)
    console.log('[SearchAndScraper Store] Instance initialized:', tabId)
    return newInstance
  }
  
  /**
   * 更新标签页状态
   */
  const updateInstance = (tabId: string, updates: Partial<Omit<SearchInstanceState, 'tabId'>>): void => {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn('[SearchAndScraper Store] Cannot update non-existent instance:', tabId)
      return
    }
    
    Object.assign(instance, updates)
  }
  
  /**
   * 移除标签页状态
   */
  const removeInstance = (tabId: string): void => {
    instances.value.delete(tabId)
    console.log('[SearchAndScraper Store] Instance removed:', tabId)
  }
  
  /**
   * 重置所有状态
   */
  const reset = (): void => {
    instances.value.clear()
    console.log('[SearchAndScraper Store] All instances cleared')
  }
  
  // ==================== 返回 ====================
  
  return {
    instances,
    getInstance,
    initInstance,
    updateInstance,
    removeInstance,
    reset
  }
})

