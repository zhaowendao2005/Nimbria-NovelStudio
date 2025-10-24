/**
 * SearchAndScraper IPC 处理器
 */

import type { IpcMainInvokeEvent, BrowserWindow } from 'electron'
import { ipcMain, BrowserWindow as ElectronBrowserWindow } from 'electron'
import { BrowserSessionManager, BrowserViewManager } from '../../services/search-scraper-service'
import type { 
  SearchScraperInitResponse, 
  SearchScraperCookiesResponse,
  CookieData
} from '../../types/SearchAndScraper'

// 全局单例
const browserSessionManager = new BrowserSessionManager()
let browserViewManager: BrowserViewManager | null = null

/**
 * 设置 SearchAndScraper IPC 处理器
 */
export function setupSearchScraperHandlers(): void {
  // ==================== Session 管理 ====================
  
  // 初始化 Session 和 BrowserViewManager
  ipcMain.handle('search-scraper:init', (): SearchScraperInitResponse => {
    browserSessionManager.initialize()
    if (!browserViewManager) {
      browserViewManager = new BrowserViewManager(browserSessionManager.getSession())
    }
    return { success: true }
  })
  
  // 获取指定 URL 的 Cookies
  ipcMain.handle('search-scraper:get-cookies', async (
    _event: IpcMainInvokeEvent,
    request: { url: string }
  ): Promise<SearchScraperCookiesResponse> => {
    const cookies = await browserSessionManager.getCookies(request.url)
    return { 
      cookies: cookies.map((cookie): CookieData => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expirationDate: cookie.expirationDate
      }))
    }
  })
  
  // 获取所有 Cookies
  ipcMain.handle('search-scraper:get-all-cookies', async (): Promise<SearchScraperCookiesResponse> => {
    const cookies = await browserSessionManager.getCookiesAll()
    return { 
      cookies: cookies.map((cookie): CookieData => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expirationDate: cookie.expirationDate
      }))
    }
  })
  
  // ==================== BrowserView 控制 ====================
  
  // 创建 BrowserView
  ipcMain.handle('search-scraper:create-view', (
    event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    const window = ElectronBrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return { success: false }
    }
    
    browserViewManager.createView(request.tabId, window)
    return { success: true }
  })
  
  // 显示 BrowserView
  ipcMain.handle('search-scraper:show-view', (
    event: IpcMainInvokeEvent,
    request: { tabId: string; bounds: { x: number; y: number; width: number; height: number } }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    const window = ElectronBrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return { success: false }
    }
    
    browserViewManager.showView(request.tabId, window, request.bounds)
    return { success: true }
  })
  
  // 隐藏 BrowserView
  ipcMain.handle('search-scraper:hide-view', (
    event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    const window = ElectronBrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return { success: false }
    }
    
    browserViewManager.hideView(request.tabId, window)
    return { success: true }
  })
  
  // 销毁 BrowserView
  ipcMain.handle('search-scraper:destroy-view', (
    event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    const window = ElectronBrowserWindow.fromWebContents(event.sender)
    if (!window) {
      return { success: false }
    }
    
    browserViewManager.destroyView(request.tabId, window)
    return { success: true }
  })
  
  // 加载 URL
  ipcMain.handle('search-scraper:load-url', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string; url: string }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    try {
      browserViewManager.loadURL(request.tabId, request.url)
      return { success: true }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to load URL:', error)
      return { success: false }
    }
  })
  
  // 后退
  ipcMain.handle('search-scraper:go-back', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    browserViewManager.goBack(request.tabId)
    return { success: true }
  })
  
  // 前进
  ipcMain.handle('search-scraper:go-forward', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    browserViewManager.goForward(request.tabId)
    return { success: true }
  })
  
  // 获取导航状态
  ipcMain.handle('search-scraper:get-navigation-state', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { canGoBack: boolean; canGoForward: boolean; currentUrl: string } => {
    if (!browserViewManager) {
      return { canGoBack: false, canGoForward: false, currentUrl: '' }
    }
    
    return browserViewManager.getNavigationState(request.tabId)
  })
  
  console.log('[SearchAndScraper] IPC handlers registered (with BrowserView support)')
}

