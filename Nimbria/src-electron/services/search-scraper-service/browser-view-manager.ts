/**
 * BrowserView 管理器
 * 管理搜索和抓取功能的 BrowserView 实例
 */

import { BrowserView, BrowserWindow } from 'electron'
import type { Session } from 'electron'

interface BrowserViewInstance {
  view: BrowserView
  tabId: string
  windowId: number  // 关联的 BrowserWindow ID
  isVisible: boolean
  currentUrl: string
}

export class BrowserViewManager {
  private views = new Map<string, BrowserViewInstance>()
  private session: Session
  
  constructor(session: Session) {
    this.session = session
  }
  
  /**
   * 创建 BrowserView 实例
   */
  public createView(tabId: string, window: BrowserWindow): BrowserView {
    if (this.views.has(tabId)) {
      console.warn(`[BrowserViewManager] View ${tabId} already exists`)
      return this.views.get(tabId)!.view
    }
    
    const view = new BrowserView({
      webPreferences: {
        session: this.session,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    
    // 🔥 处理新窗口打开（核心：在同一 view 中加载）
    view.webContents.setWindowOpenHandler(({ url }) => {
      console.log(`[BrowserViewManager] Opening URL in same view: ${url}`)
      view.webContents.loadURL(url).catch(error => {
        console.error(`[BrowserViewManager] Failed to load URL: ${url}`, error)
      })
      return { action: 'deny' }  // 阻止打开新窗口
    })
    
    // 监听导航事件
    view.webContents.on('did-navigate', (_event, url) => {
      const instance = this.views.get(tabId)
      if (instance) {
        instance.currentUrl = url
        // 发送状态更新到渲染进程
        window.webContents.send('search-scraper:navigation-changed', {
          tabId,
          url,
          canGoBack: view.webContents.canGoBack(),
          canGoForward: view.webContents.canGoForward()
        })
      }
    })
    
    view.webContents.on('did-navigate-in-page', (_event, url) => {
      const instance = this.views.get(tabId)
      if (instance) {
        instance.currentUrl = url
        window.webContents.send('search-scraper:navigation-changed', {
          tabId,
          url,
          canGoBack: view.webContents.canGoBack(),
          canGoForward: view.webContents.canGoForward()
        })
      }
    })
    
    // 监听页面加载状态
    view.webContents.on('did-start-loading', () => {
      window.webContents.send('search-scraper:loading-changed', {
        tabId,
        isLoading: true
      })
    })
    
    view.webContents.on('did-stop-loading', () => {
      window.webContents.send('search-scraper:loading-changed', {
        tabId,
        isLoading: false
      })
    })
    
    // 监听加载失败
    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`[BrowserViewManager] Failed to load ${validatedURL}:`, errorCode, errorDescription)
      window.webContents.send('search-scraper:load-failed', {
        tabId,
        url: validatedURL,
        errorCode,
        errorDescription
      })
    })
    
    this.views.set(tabId, {
      view,
      tabId,
      windowId: window.id,
      isVisible: false,
      currentUrl: ''
    })
    
    console.log(`[BrowserViewManager] Created view for tab: ${tabId}`)
    return view
  }
  
  /**
   * 显示 BrowserView
   */
  public showView(tabId: string, window: BrowserWindow, bounds: { x: number; y: number; width: number; height: number }): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    // 隐藏同一窗口的其他 view
    this.views.forEach((v, id) => {
      if (id !== tabId && v.windowId === window.id && v.isVisible) {
        window.removeBrowserView(v.view)
        v.isVisible = false
      }
    })
    
    // 显示当前 view
    window.setBrowserView(instance.view)
    instance.view.setBounds(bounds)
    instance.isVisible = true
    
    console.log(`[BrowserViewManager] Showing view ${tabId} with bounds:`, bounds)
  }
  
  /**
   * 隐藏 BrowserView
   */
  public hideView(tabId: string, window: BrowserWindow): void {
    const instance = this.views.get(tabId)
    if (!instance) return
    
    window.removeBrowserView(instance.view)
    instance.isVisible = false
    console.log(`[BrowserViewManager] Hidden view: ${tabId}`)
  }
  
  /**
   * 销毁 BrowserView
   */
  public destroyView(tabId: string, window: BrowserWindow): void {
    const instance = this.views.get(tabId)
    if (!instance) return
    
    if (instance.isVisible) {
      window.removeBrowserView(instance.view)
    }
    
    // 销毁 webContents
    if (!instance.view.webContents.isDestroyed()) {
      instance.view.webContents.close()
    }
    
    this.views.delete(tabId)
    console.log(`[BrowserViewManager] Destroyed view: ${tabId}`)
  }
  
  /**
   * 加载 URL
   */
  public loadURL(tabId: string, url: string): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    instance.view.webContents.loadURL(url).catch(error => {
      console.error(`[BrowserViewManager] Failed to load URL ${url}:`, error)
    })
    instance.currentUrl = url
    console.log(`[BrowserViewManager] Loading URL in ${tabId}: ${url}`)
  }
  
  /**
   * 导航控制
   */
  public goBack(tabId: string): void {
    const instance = this.views.get(tabId)
    if (instance && instance.view.webContents.canGoBack()) {
      instance.view.webContents.goBack()
    }
  }
  
  public goForward(tabId: string): void {
    const instance = this.views.get(tabId)
    if (instance && instance.view.webContents.canGoForward()) {
      instance.view.webContents.goForward()
    }
  }
  
  /**
   * 获取导航状态
   */
  public getNavigationState(tabId: string): { canGoBack: boolean; canGoForward: boolean; currentUrl: string } {
    const instance = this.views.get(tabId)
    if (!instance) {
      return { canGoBack: false, canGoForward: false, currentUrl: '' }
    }
    
    return {
      canGoBack: instance.view.webContents.canGoBack(),
      canGoForward: instance.view.webContents.canGoForward(),
      currentUrl: instance.currentUrl
    }
  }
  
  /**
   * 获取指定窗口的所有 view
   */
  public getViewsByWindow(windowId: number): string[] {
    const tabIds: string[] = []
    this.views.forEach((instance, tabId) => {
      if (instance.windowId === windowId) {
        tabIds.push(tabId)
      }
    })
    return tabIds
  }
  
  /**
   * 清理指定窗口的所有 view
   */
  public cleanupWindow(windowId: number): void {
    const tabIds = this.getViewsByWindow(windowId)
    tabIds.forEach(tabId => {
      const instance = this.views.get(tabId)
      if (instance && !instance.view.webContents.isDestroyed()) {
        instance.view.webContents.close()
      }
      this.views.delete(tabId)
    })
    console.log(`[BrowserViewManager] Cleaned up ${tabIds.length} views for window ${windowId}`)
  }
}

