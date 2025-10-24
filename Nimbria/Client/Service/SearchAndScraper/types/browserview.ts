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

/**
 * 选取的元素信息（与Store中的SelectedElement保持一致）
 */
export interface SelectedElementInfo {
  selector: string
  tagName: string
  id?: string
  classList?: string[]
  textContent?: string
  xpath?: string
  timestamp: number
}

/**
 * 元素选取事件
 */
export interface ElementSelectedEvent {
  tabId: string
  element: SelectedElementInfo
}

