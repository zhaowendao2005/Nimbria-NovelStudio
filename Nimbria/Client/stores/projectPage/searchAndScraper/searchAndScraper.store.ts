/**
 * SearchAndScraper Store
 * 支持多实例（每个标签页一个独立状态）
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SearchInstanceState, BrowseHistoryItem, ScrapeMode, LightModeConfig } from './searchAndScraper.types'

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
      chapterSearchQuery: '',
      // 🚀 爬取模式配置
      scrapeMode: 'browser',
      lightModeConfig: {
        parallelCount: 3,
        requestTimeout: 30,
        contentSelector: undefined,
        selectorLearned: false
      }
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
  
  // ==================== 🚀 爬取模式管理 ====================
  
  /**
   * 更新爬取模式
   */
  const updateScrapeMode = (tabId: string, mode: ScrapeMode): void => {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn('[SearchAndScraper Store] Cannot update scrape mode for non-existent instance:', tabId)
      return
    }
    
    instance.scrapeMode = mode
    console.log(`[SearchAndScraper Store] Tab ${tabId} 爬取模式更新为: ${mode}`)
  }
  
  /**
   * 更新轻量模式配置
   */
  const updateLightModeConfig = (tabId: string, config: Partial<LightModeConfig>): void => {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn('[SearchAndScraper Store] Cannot update light mode config for non-existent instance:', tabId)
      return
    }
    
    instance.lightModeConfig = {
      ...instance.lightModeConfig,
      ...config
    }
    console.log(`[SearchAndScraper Store] Tab ${tabId} 轻量模式配置已更新:`, config)
  }
  
  /**
   * 设置内容选择器（学习完成）
   */
  const setContentSelector = (tabId: string, selector: string): void => {
    updateLightModeConfig(tabId, {
      contentSelector: selector,
      selectorLearned: true
    })
    console.log(`[SearchAndScraper Store] Tab ${tabId} 已学习选择器: ${selector}`)
  }
  
  /**
   * 重置轻量模式状态（清除选择器）
   */
  const resetLightModeSelector = (tabId: string): void => {
    updateLightModeConfig(tabId, {
      contentSelector: undefined,
      selectorLearned: false
    })
    console.log(`[SearchAndScraper Store] Tab ${tabId} 轻量模式选择器已重置`)
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
    clearHistory,
    // 🚀 爬取模式管理
    updateScrapeMode,
    updateLightModeConfig,
    setContentSelector,
    resetLightModeSelector
  }
})

