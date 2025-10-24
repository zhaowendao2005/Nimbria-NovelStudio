/**
 * SearchAndScraper Store
 * 支持多实例（每个标签页一个独立状态）
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchInstanceState, BrowseHistoryItem } from './searchAndScraper.types'

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
      scrapingProgress: null,
      // 浏览历史
      browseHistory: []
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
  
  // ==================== 浏览历史管理 ====================
  
  const HISTORY_STORAGE_KEY = 'search-scraper-browse-history'
  const MAX_HISTORY_ITEMS = 100 // 最多保存100条历史记录
  
  /**
   * 从localStorage加载历史记录
   */
  const loadHistoryFromStorage = (tabId: string): void => {
    try {
      const stored = localStorage.getItem(`${HISTORY_STORAGE_KEY}-${tabId}`)
      if (stored) {
        const history: BrowseHistoryItem[] = JSON.parse(stored)
        updateInstance(tabId, { browseHistory: history })
        console.log(`[SearchAndScraper Store] Loaded ${history.length} history items for ${tabId}`)
      }
    } catch (error) {
      console.error('[SearchAndScraper Store] Failed to load history:', error)
    }
  }
  
  /**
   * 保存历史记录到localStorage
   */
  const saveHistoryToStorage = (tabId: string): void => {
    try {
      const instance = instances.value.get(tabId)
      if (instance) {
        localStorage.setItem(
          `${HISTORY_STORAGE_KEY}-${tabId}`,
          JSON.stringify(instance.browseHistory)
        )
      }
    } catch (error) {
      console.error('[SearchAndScraper Store] Failed to save history:', error)
    }
  }
  
  /**
   * 添加历史记录
   */
  const addHistoryItem = (tabId: string, item: Omit<BrowseHistoryItem, 'timestamp'>): void => {
    const instance = instances.value.get(tabId)
    if (!instance) {
      return
    }
    
    const newItem: BrowseHistoryItem = {
      ...item,
      timestamp: Date.now()
    }
    
    // 检查是否已存在相同URL的记录，如果存在则更新时间戳
    const existingIndex = instance.browseHistory.findIndex(h => h.url === item.url)
    if (existingIndex !== -1) {
      // 移除旧记录
      instance.browseHistory.splice(existingIndex, 1)
    }
    
    // 添加到最前面
    instance.browseHistory.unshift(newItem)
    
    // 限制最大数量
    if (instance.browseHistory.length > MAX_HISTORY_ITEMS) {
      instance.browseHistory = instance.browseHistory.slice(0, MAX_HISTORY_ITEMS)
    }
    
    // 保存到localStorage
    saveHistoryToStorage(tabId)
    
    console.log(`[SearchAndScraper Store] Added history: ${item.title}`)
  }
  
  /**
   * 清空历史记录
   */
  const clearHistory = (tabId: string): void => {
    updateInstance(tabId, { browseHistory: [] })
    try {
      localStorage.removeItem(`${HISTORY_STORAGE_KEY}-${tabId}`)
      console.log(`[SearchAndScraper Store] Cleared history for ${tabId}`)
    } catch (error) {
      console.error('[SearchAndScraper Store] Failed to clear history:', error)
    }
  }
  
  // ==================== 返回 ====================
  
  return {
    instances,
    getInstance,
    initInstance,
    updateInstance,
    removeInstance,
    reset,
    // 历史记录
    loadHistoryFromStorage,
    addHistoryItem,
    clearHistory
  }
})

