/**
 * SearchAndScraper 前端服务
 * 通过 IPC 调用后端 Session 管理功能
 */

import type { 
  SearchScraperInitResponse,
  SearchScraperCookiesResponse,
  BrowserViewBounds,
  NavigationState
} from './types'

export class SearchAndScraperService {
  // ==================== Session 管理 ====================
  
  static async initSession(): Promise<SearchScraperInitResponse> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.initSession()
  }
  
  static async getCookies(url: string): Promise<SearchScraperCookiesResponse> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.getCookies(url)
  }
  
  static async getAllCookies(): Promise<SearchScraperCookiesResponse> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.getAllCookies()
  }
  
  // ==================== BrowserView 控制 ====================
  
  /**
   * 创建 BrowserView
   */
  static async createView(tabId: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.createView(tabId)
  }
  
  /**
   * 显示 BrowserView
   */
  static async showView(tabId: string, bounds: BrowserViewBounds): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.showView(tabId, bounds)
  }
  
  /**
   * 隐藏 BrowserView
   */
  static async hideView(tabId: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.hideView(tabId)
  }
  
  /**
   * 销毁 BrowserView
   */
  static async destroyView(tabId: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.destroyView(tabId)
  }
  
  /**
   * 加载 URL
   */
  static async loadURL(tabId: string, url: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.loadURL(tabId, url)
  }
  
  /**
   * 后退
   */
  static async goBack(tabId: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.goBack(tabId)
  }
  
  /**
   * 前进
   */
  static async goForward(tabId: string): Promise<{ success: boolean }> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.goForward(tabId)
  }
  
  /**
   * 获取导航状态
   */
  static async getNavigationState(tabId: string): Promise<NavigationState> {
    if (!window.nimbria?.searchScraper) {
      throw new Error('SearchScraper API not available')
    }
    return window.nimbria.searchScraper.getNavigationState(tabId)
  }
}

