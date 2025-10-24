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
  
  // 🌐 全局浏览历史记录（所有标签页共享）
  const browseHistory = ref<BrowseHistoryItem[]>([])
  
  // ==================== 常量 ====================
  const HISTORY_STORAGE_KEY = 'search-scraper-browse-history-global'
  const MAX_HISTORY_ITEMS = 100
  
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
      // 📚 章节选择状态
      chapterSelectMode: false,
      selectedChapterIndexes: new Set(),
      chapterSearchQuery: ''
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
  
  // ==================== 🌐 全局浏览历史管理 ====================
  
  /**
   * 从localStorage加载全局历史记录
   */
  const loadHistoryFromStorage = (): void => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (stored) {
        browseHistory.value = JSON.parse(stored)
        console.log(`[SearchAndScraper Store] Loaded ${browseHistory.value.length} history items`)
      }
    } catch (error) {
      console.error('[SearchAndScraper Store] Failed to load history:', error)
      browseHistory.value = []
    }
  }
  
  /**
   * 保存全局历史记录到localStorage
   */
  const saveHistoryToStorage = (): void => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(browseHistory.value))
      console.log(`[SearchAndScraper Store] Saved ${browseHistory.value.length} history items`)
    } catch (error) {
      console.error('[SearchAndScraper Store] Failed to save history:', error)
    }
  }
  
  /**
   * 添加历史记录
   */
  const addHistoryItem = (item: Omit<BrowseHistoryItem, 'timestamp'>): void => {
    const newItem: BrowseHistoryItem = {
      ...item,
      timestamp: Date.now()
    }
    
    // 检查是否已存在相同URL的记录，如果存在则移除旧记录
    const existingIndex = browseHistory.value.findIndex(h => h.url === item.url)
    if (existingIndex !== -1) {
      browseHistory.value.splice(existingIndex, 1)
    }
    
    // 添加到最前面
    browseHistory.value.unshift(newItem)
    
    // 限制最大数量
    if (browseHistory.value.length > MAX_HISTORY_ITEMS) {
      browseHistory.value = browseHistory.value.slice(0, MAX_HISTORY_ITEMS)
    }
    
    // 保存到localStorage
    saveHistoryToStorage()
    
    console.log(`[SearchAndScraper Store] Added history: ${item.title}`)
  }
  
  /**
   * 清空全局历史记录
   */
  const clearHistory = (): void => {
    browseHistory.value = []
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY)
      console.log('[SearchAndScraper Store] Cleared history')
    } catch (error) {
      console.error('[SearchAndScraper Store] Failed to clear history:', error)
    }
  }
  
  // 🔥 初始化时加载历史记录
  loadHistoryFromStorage()
  
  // ==================== 返回 ====================
  
  return {
    instances,
    getInstance,
    initInstance,
    updateInstance,
    removeInstance,
    reset,
    // 🌐 全局历史记录
    browseHistory,
    loadHistoryFromStorage,
    saveHistoryToStorage,
    addHistoryItem,
    clearHistory
  }
})

