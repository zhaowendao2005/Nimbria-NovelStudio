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
  
  // ==================== 🔍 缩放控制 ====================
  
  // 调整缩放（相对调整）
  ipcMain.handle('search-scraper:adjust-zoom', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string; delta: number }
  ): { success: boolean; zoomFactor?: number } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    try {
      const zoomFactor = browserViewManager.adjustZoom(request.tabId, request.delta)
      return { success: true, zoomFactor }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to adjust zoom:', error)
      return { success: false }
    }
  })
  
  // 设置缩放（绝对设置）
  ipcMain.handle('search-scraper:set-zoom-factor', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string; factor: number }
  ): { success: boolean } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    try {
      browserViewManager.setZoomFactor(request.tabId, request.factor)
      return { success: true }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to set zoom factor:', error)
      return { success: false }
    }
  })
  
  // 获取当前缩放
  ipcMain.handle('search-scraper:get-zoom-factor', (
    _event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): { success: boolean; zoomFactor?: number } => {
    if (!browserViewManager) {
      return { success: false }
    }
    
    try {
      const zoomFactor = browserViewManager.getZoomFactor(request.tabId)
      return { success: true, zoomFactor }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to get zoom factor:', error)
      return { success: false }
    }
  })
  
  // ==================== 元素选取 ====================
  
  // 开始元素选取
  ipcMain.handle('search-scraper:start-element-picker', (
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
    
    try {
      browserViewManager.startElementPicker(request.tabId, window)
      return { success: true }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to start element picker:', error)
      return { success: false }
    }
  })
  
  // 停止元素选取
  ipcMain.handle('search-scraper:stop-element-picker', (
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
    
    try {
      browserViewManager.stopElementPicker(request.tabId, window)
      return { success: true }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to stop element picker:', error)
      return { success: false }
    }
  })
  
  // ==================== 小说爬取 ====================
  
  // 智能提取章节列表
  ipcMain.handle('search-scraper:extract-chapters', async (
    _event: IpcMainInvokeEvent,
    request: { tabId: string }
  ): Promise<{ success: boolean; chapters?: Array<{ title: string; url: string }>; error?: string }> => {
    if (!browserViewManager) {
      return { success: false, error: 'BrowserViewManager not available' }
    }
    
    try {
      const chapters = await browserViewManager.intelligentExtractChapters(request.tabId)
      return { success: true, chapters }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to extract chapters:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })
  
  // 爬取章节内容
  ipcMain.handle('search-scraper:scrape-chapter', async (
    _event: IpcMainInvokeEvent,
    request: { tabId: string; chapterUrl: string }
  ): Promise<{ 
    success: boolean
    chapter?: { title: string; content: string; summary: string }
    error?: string 
  }> => {
    if (!browserViewManager) {
      return { success: false, error: 'BrowserViewManager not available' }
    }
    
    try {
      const chapter = await browserViewManager.scrapeChapterContent(request.tabId, request.chapterUrl)
      return { success: true, chapter }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to scrape chapter:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })
  
  // ==================== 🚀 轻量模式爬取 ====================
  
  /**
   * 学习内容选择器
   */
  ipcMain.handle('search-scraper:learn-selector', async (
    _event: IpcMainInvokeEvent,
    request: { tabId: string; url: string }
  ): Promise<{ success: boolean; selector?: string; error?: string }> => {
    if (!browserViewManager) {
      return { success: false, error: 'BrowserViewManager not available' }
    }
    
    try {
      const selector = await browserViewManager.learnContentSelector(request.tabId, request.url)
      return { success: !!selector, selector: selector || undefined }
    } catch (error) {
      console.error('[SearchAndScraper] Failed to learn selector:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })
  
  /**
   * 轻量模式爬取章节
   */
  ipcMain.handle('search-scraper:scrape-light', async (
    _event: IpcMainInvokeEvent,
    request: { 
      tabId: string
      chapters: Array<{ title: string; url: string }>
      options: {
        selector: string
        parallelCount: number
        timeout: number
        urlPrefix?: string
      }
    }
  ): Promise<{ 
    success: boolean
    successCount: number
    message?: string
    results?: Array<{
      success: boolean
      chapter: { title: string; url: string }
      content?: string
      error?: string
    }>
  }> => {
    if (!browserViewManager) {
      return { success: false, successCount: 0, message: 'BrowserViewManager not available' }
    }
    
    try {
      const result = await browserViewManager.scrapeChaptersLight(
        request.chapters,
        request.options
      )
      
      return { 
        success: result.success, 
        successCount: result.successCount,
        results: result.results,
        message: `Successfully scraped ${result.successCount}/${request.chapters.length} chapters`
      }
    } catch (error) {
      console.error('[SearchAndScraper] Light mode scrape failed:', error)
      return { 
        success: false, 
        successCount: 0,
        message: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  })
  
  console.log('[SearchAndScraper] IPC handlers registered (with BrowserView & Light Mode support)')
}

