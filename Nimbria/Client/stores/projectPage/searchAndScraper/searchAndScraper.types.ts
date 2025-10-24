/**
 * SearchAndScraper Store 类型定义
 */

import type { SearchEngine, SearchHistoryItem } from '@service/SearchAndScraper/types'

/**
 * Store 内部状态类型
 * 每个 tabId 对应一个实例状态
 */
export interface SearchInstanceState {
  tabId: string
  initialized: boolean
  currentEngine: SearchEngine
  searchHistory: SearchHistoryItem[]
}

