/**
 * SearchAndScraper 浏览器 Session 管理器
 * 使用 Electron Session API 实现浏览器级别的 Cookie、缓存管理
 */

import type { Session } from 'electron'
import { session, app } from 'electron'
import path from 'path'
import fs from 'fs'

export class BrowserSessionManager {
  private sessionInstance: Session | null = null
  private sessionPath: string
  private initialized: boolean = false
  
  constructor() {
    // 只初始化路径，不创建 Session（需要等 app ready）
    this.sessionPath = path.join(app.getPath('userData'), 'search-scraper-session')
  }
  
  /**
   * 初始化 Session 配置
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('[BrowserSessionManager] Already initialized, skipping')
      return
    }
    
    // 确保目录存在
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true })
    }
    
    // 创建持久化 session（此时 app 已 ready）
    this.sessionInstance = session.fromPartition('persist:search-scraper')
    // 设置 User-Agent（模拟真实浏览器）
    this.sessionInstance.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    // 配置请求头（模拟真实浏览器请求）
    this.sessionInstance.webRequest.onBeforeSendHeaders((details, callback) => {
      const headers = {
        ...details.requestHeaders,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'cache-control': 'max-age=0',
        'upgrade-insecure-requests': '1'
      }
      callback({ requestHeaders: headers })
    })
    
    this.initialized = true
    console.log('[BrowserSessionManager] Initialized')
  }
  
  /**
   * 获取 Session 实例
   */
  public getSession(): Session {
    if (!this.sessionInstance) {
      throw new Error('BrowserSessionManager not initialized. Call initialize() first.')
    }
    return this.sessionInstance
  }
  
  /**
   * 获取指定 URL 的 Cookies
   */
  public async getCookies(url: string): Promise<Electron.Cookie[]> {
    if (!this.sessionInstance) {
      throw new Error('BrowserSessionManager not initialized. Call initialize() first.')
    }
    return this.sessionInstance.cookies.get({ url })
  }
  
  /**
   * 获取所有 Cookies
   */
  public async getCookiesAll(): Promise<Electron.Cookie[]> {
    if (!this.sessionInstance) {
      throw new Error('BrowserSessionManager not initialized. Call initialize() first.')
    }
    return this.sessionInstance.cookies.get({})
  }
}

