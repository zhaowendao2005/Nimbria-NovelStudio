/**
 * BrowserView 相关类型定义
 */

/**
 * BrowserView 位置和大小
 */
export interface BrowserViewBounds {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 导航状态
 */
export interface NavigationState {
  canGoBack: boolean
  canGoForward: boolean
  currentUrl: string
}

/**
 * 导航变化事件
 */
export interface NavigationChangedEvent {
  tabId: string
  url: string
  canGoBack: boolean
  canGoForward: boolean
}

/**
 * 加载状态变化事件
 */
export interface LoadingChangedEvent {
  tabId: string
  isLoading: boolean
}

/**
 * 加载失败事件
 */
export interface LoadFailedEvent {
  tabId: string
  url: string
  errorCode: number
  errorDescription: string
}

