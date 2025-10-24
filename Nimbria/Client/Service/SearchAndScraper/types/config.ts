/**
 * SearchAndScraper 配置类型
 */

// 搜索引擎配置
export type SearchEngine = 'google' | 'bing' | 'baidu'

export interface SearchEngineConfig {
  engine: SearchEngine
  baseUrl: string
}

// 搜索历史
export interface SearchHistoryItem {
  query: string
  engine: SearchEngine
  timestamp: number
}

