/**
 * 前端类型转发
 * 通过别名导入前端类型，转发给后端使用
 */

// 从前端 Service 模块导入类型（使用别名路径）
export type {
  SearchEngine,
  SearchEngineConfig,
  SearchHistoryItem,
  CookieData,
  SearchScraperInitResponse,
  SearchScraperCookiesResponse,
  BrowserViewBounds,
  NavigationState,
  NavigationChangedEvent,
  LoadingChangedEvent,
  LoadFailedEvent
} from '@service/SearchAndScraper/types'

/**
 * 注意：这些类型来自前端 Service 层
 * 路径：Nimbria/Client/Service/SearchAndScraper/types/
 * 
 * 在后端使用时，请使用这个中转模块：
 * import type { CookieData } from '../../types/SearchAndScraper'
 */

