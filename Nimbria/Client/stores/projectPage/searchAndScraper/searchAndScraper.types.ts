/**
 * SearchAndScraper Store 类型定义
 */

import type { SearchEngine, SearchHistoryItem } from '@service/SearchAndScraper/types'

/**
 * 选取的DOM元素信息
 */
export interface SelectedElement {
  /** CSS选择器路径 */
  selector: string
  /** 元素标签名 */
  tagName: string
  /** 元素ID */
  id?: string
  /** 元素class列表 */
  classList?: string[]
  /** 元素文本内容（截取前100字符） */
  textContent?: string
  /** 元素的XPath */
  xpath?: string
  /** 选取时间 */
  timestamp: number
}

/**
 * 章节信息
 */
export interface Chapter {
  title: string
  url: string
}

/**
 * 爬取的章节内容
 */
export interface ScrapedChapter {
  title: string
  content: string
  summary: string
  url: string
}

/**
 * 浏览历史记录项
 */
export interface BrowseHistoryItem {
  /** URL */
  url: string
  /** 页面标题 */
  title: string
  /** 访问时间戳 */
  timestamp: number
  /** 网站图标（可选） */
  favicon?: string
}

/**
 * Store 内部状态类型
 * 每个 tabId 对应一个实例状态
 */
export interface SearchInstanceState {
  tabId: string
  initialized: boolean
  currentEngine: SearchEngine
  searchHistory: SearchHistoryItem[]
  // 🔥 添加运行时状态
  isViewCreated: boolean
  isBrowserViewVisible: boolean
  currentUrl: string
  searchQuery: string
  // 🎯 元素选取状态
  isSelectingElement: boolean
  selectedElements: SelectedElement[]
  // 📚 小说爬取状态
  urlPrefix: string
  urlPrefixEnabled: boolean
  matchedChapters: Chapter[]
  scrapedChapters: ScrapedChapter[]
  isScrapingInProgress: boolean
  scrapingProgress: {
    current: number
    total: number
    currentChapter: string
  } | null
  // 🕒 浏览历史
  browseHistory: BrowseHistoryItem[]
}

