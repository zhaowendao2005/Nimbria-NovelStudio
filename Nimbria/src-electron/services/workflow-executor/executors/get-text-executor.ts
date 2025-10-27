/**
 * 获取文本节点执行器
 * 支持三种引擎：BrowserView、Cheerio、Puppeteer
 */

import type { BrowserViewManager } from '../../search-scraper-service/browser-view-manager'
import type { 
  NodeExecutor, 
  WorkflowNode, 
  WorkflowExecutionContext, 
  NodeExecutionResult,
  GetTextOutput
} from '../types'
import axios from 'axios'
import { load } from 'cheerio'
import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'
import { existsSync } from 'fs'

export class GetTextExecutor implements NodeExecutor {
  private puppeteerBrowser: Browser | null = null
  
  constructor(
    private browserViewManager: BrowserViewManager
  ) {}

  async execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: string
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now()
    const { config } = node.data
    const engine = config?.engine || 'browserview' // 默认使用BrowserView
    const url = input || context.currentUrl

    if (!url) {
      return {
        nodeId: node.id,
        success: false,
        error: 'No URL provided',
        executedAt: Date.now()
      }
    }

    try {
      let output: GetTextOutput

      // 🔥 根据用户选择的引擎执行
      switch (engine) {
        case 'browserview':
          output = await this.executeWithBrowserView(node, context, url)
          break
        case 'cheerio':
          output = await this.executeWithCheerio(node, context, url)
          break
        case 'puppeteer':
          output = await this.executeWithPuppeteer(node, context, url)
          break
        default:
          throw new Error(`Unknown engine: ${String(engine)}`)
      }

      const duration = Date.now() - startTime

      return {
        nodeId: node.id,
        success: true,
        output,
        executedAt: Date.now(),
        engine,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[GetTextExecutor] Execution failed:`, error)
      
      return {
        nodeId: node.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: Date.now(),
        engine,
        duration
      }
    }
  }

  /**
   * 使用BrowserView引擎执行
   */
  private async executeWithBrowserView(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    url: string
  ): Promise<GetTextOutput> {
    const { selector, config } = node.data
    const strategy = config?.strategy || 'max-text'
    const removeSelectors = config?.removeSelectors || 'script, style, nav, header, footer, aside, iframe'

    // 🔥 加载URL（如果当前URL不是目标URL）
    const currentUrl = this.browserViewManager.getNavigationState(context.tabId).currentUrl
    if (currentUrl !== url) {
      console.log(`[GetTextExecutor] Loading URL: ${url}`)
      this.browserViewManager.loadURL(context.tabId, url)
      
      // 等待页面加载完成
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // 🔥 获取BrowserView实例
    // @ts-expect-error - BrowserViewManager的views是private属性，这里需要访问
    const viewInstance = this.browserViewManager.views.get(context.tabId)
    if (!viewInstance) {
      throw new Error(`BrowserView for tab ${context.tabId} not found`)
    }

    // 🔥 提取标题选择器（优先使用用户配置的标题选择器）
    const titleSelector = config?.titleSelector || 'h1, title'

    // 🔥 执行提取脚本
    const result = await viewInstance.view.webContents.executeJavaScript(`
      (function() {
        const strategy = '${strategy}';
        const contentSelector = '${selector || ''}';
        const titleSelector = '${titleSelector}';
        const removeSelectors = '${removeSelectors}';

        // 移除干扰元素
        document.querySelectorAll(removeSelectors).forEach(el => el.remove());

        let contentText = '';
        let actualContentSelector = '';
        let titleText = '';
        let actualTitleSelector = '';

        // 🔥 提取标题
        const titleElem = document.querySelector(titleSelector);
        if (titleElem) {
          titleText = (titleElem.textContent || '').trim();
          actualTitleSelector = titleSelector;
        } else {
          // 回退到document.title
          titleText = document.title || '';
          actualTitleSelector = 'document.title';
        }

        // 🔥 提取内容
        if (strategy === 'max-text') {
          // 🔥 获取用户配置的权重（0-100，默认70表示70%密度30%长度）
          const densityWeightPercent = ${config?.densityWeight ?? 70};
          const densityWeight = densityWeightPercent / 100; // 转换为0-1
          const lengthWeight = 1 - densityWeight;
          
          // 找文字最多的容器（使用文本密度评分）
          let maxScore = 0;
          let maxText = '';
          let maxElem = null;

          const candidates = document.querySelectorAll('div, article, section, main');
          candidates.forEach(elem => {
            const elemText = elem.textContent || '';
            const textLength = elemText.trim().length;
            
            // 🔥 计算文本密度（文本长度/子元素数量）
            const tagCount = elem.querySelectorAll('*').length || 1;
            const density = textLength / tagCount;
            
            // 🔥 动态权重评分
            // 密度权重放大1000倍让其和长度在同一数量级
            // 评分 = 长度 × lengthWeight + 密度 × 1000 × densityWeight
            const score = textLength * lengthWeight + density * 1000 * densityWeight;
            
            // 🔥 最小长度限制500字，避免选中太短的内容
            if (textLength > 500 && score > maxScore) {
              maxScore = score;
              maxText = elemText;
              maxElem = elem;
            }
          });

          contentText = maxText.trim();
          
          // 记录自动检测的选择器
          if (maxElem) {
            const tagName = maxElem.tagName.toLowerCase();
            const className = maxElem.className ? '.' + maxElem.className.split(' ').join('.') : '';
            const id = maxElem.id ? '#' + maxElem.id : '';
            actualContentSelector = tagName + id + className + ' (auto-detected)';
          } else {
            actualContentSelector = 'auto-detected (none found)';
          }
        } else {
          // 直接提取选择器内容
          if (contentSelector) {
            const elem = document.querySelector(contentSelector);
            if (elem) {
              contentText = (elem.textContent || '').trim();
              actualContentSelector = contentSelector;
            } else {
              actualContentSelector = contentSelector + ' (not found)';
            }
          } else {
            // 没有选择器，使用body
            contentText = (document.body.textContent || '').trim();
            actualContentSelector = 'body (default)';
          }
        }

        return {
          title: {
            text: titleText,
            length: titleText.length,
            selector: actualTitleSelector
          },
          content: {
            text: contentText,
            length: contentText.length,
            selector: actualContentSelector
          },
          url: window.location.href
        };
      })();
    `)

    return {
      title: result.title,
      content: result.content,
      url: result.url,
      engine: 'browserview'
    }
  }

  /**
   * 使用Cheerio引擎执行（轻量级、快速）
   */
  private async executeWithCheerio(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    url: string
  ): Promise<GetTextOutput> {
    const { selector, config } = node.data
    const strategy = config?.strategy || 'max-text'
    const removeSelectors = config?.removeSelectors || 'script, style, nav, header, footer, aside, iframe'
    const titleSelector = config?.titleSelector || 'h1, title'

    console.log(`[GetTextExecutor/Cheerio] Fetching URL: ${url}`)

    // 🔥 使用axios获取HTML
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    })

    const $ = load(response.data)

    // 移除不需要的元素
    removeSelectors.split(',').forEach(sel => {
      $(sel.trim()).remove()
    })

    // 🔥 提取标题
    let titleText = ''
    let actualTitleSelector = ''
    
    const titleElem = $(titleSelector).first()
    if (titleElem.length > 0) {
      titleText = titleElem.text().trim()
      actualTitleSelector = titleSelector
    } else {
      // 回退到默认标题
      titleText = $('title').text().trim() || $('h1').first().text().trim() || ''
      actualTitleSelector = 'title (fallback)'
    }

    // 🔥 提取内容
    let contentText = ''
    let actualContentSelector = ''

    if (strategy === 'max-text') {
      // 🔥 获取用户配置的权重（0-100，默认70表示70%密度30%长度）
      const densityWeightPercent = config?.densityWeight ?? 70
      const densityWeight = densityWeightPercent / 100 // 转换为0-1
      const lengthWeight = 1 - densityWeight
      
      // 找文字最多的容器（使用文本密度评分）
      let maxScore = 0
      let maxText = ''
      
      interface CheerioElement {
        tagName?: string
        attribs?: Record<string, string>
      }
      let maxElem: CheerioElement | null = null

      $('div, article, section, main').each((_, elem) => {
        const $elem = $(elem)
        const elemText = $elem.text().trim()
        const textLength = elemText.length
        
        // 🔥 计算文本密度（文本长度/子元素数量）
        const tagCount = $elem.find('*').length || 1
        const density = textLength / tagCount
        
        // 🔥 动态权重评分
        // 密度权重放大1000倍让其和长度在同一数量级
        // 评分 = 长度 × lengthWeight + 密度 × 1000 × densityWeight
        const score = textLength * lengthWeight + density * 1000 * densityWeight
        
        // 🔥 最小长度限制500字，避免选中太短的内容
        if (textLength > 500 && score > maxScore) {
          maxScore = score
          maxText = elemText
          maxElem = elem as CheerioElement
        }
      })

      contentText = maxText
      
      // 记录自动检测的选择器
      if (maxElem !== null) {
        const elem = maxElem as CheerioElement
        const tagName = elem.tagName?.toLowerCase() || 'unknown'
        const className = elem.attribs?.class ? '.' + elem.attribs.class.split(' ').join('.') : ''
        const id = elem.attribs?.id ? '#' + elem.attribs.id : ''
        actualContentSelector = `${tagName}${id}${className} (auto-detected)`
      } else {
        actualContentSelector = 'auto-detected (none found)'
      }
    } else {
      // 直接提取选择器内容
      if (selector) {
        const elem = $(selector)
        if (elem.length > 0) {
          contentText = elem.text().trim()
          actualContentSelector = selector
        } else {
          actualContentSelector = selector + ' (not found)'
        }
      } else {
        contentText = $('body').text().trim()
        actualContentSelector = 'body (default)'
      }
    }

    return {
      title: {
        text: titleText,
        length: titleText.length,
        selector: actualTitleSelector
      },
      content: {
        text: contentText,
        length: contentText.length,
        selector: actualContentSelector
      },
      url,
      engine: 'cheerio'
    }
  }

  /**
   * 🔥 使用 Puppeteer 引擎执行（适用于防爬网站）
   */
  private async executeWithPuppeteer(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    url: string
  ): Promise<GetTextOutput> {
    const { selector, config } = node.data
    const strategy = config?.strategy || 'max-text'
    const removeSelectors = config?.removeSelectors || 'script, style, nav, header, footer, aside, iframe'
    const titleSelector = config?.titleSelector || 'h1, title'

    console.log(`[PuppeteerExecutor] 🚀 Starting Puppeteer execution`)
    console.log(`[PuppeteerExecutor] URL: ${url}`)
    console.log(`[PuppeteerExecutor] Strategy: ${strategy}`)
    console.log(`[PuppeteerExecutor] Selector: ${selector}`)

    try {
      // 1. 🔥 初始化 Puppeteer Browser（如果还没有）
      if (!this.puppeteerBrowser) {
        await this.initPuppeteerBrowser()
      }

      // 2. 🔥 从 BrowserView 获取 cookies（模拟真人 session）
      const cookies = await this.getCookiesFromBrowserView(context.tabId)
      console.log(`[PuppeteerExecutor] ✅ Got ${cookies.length} cookies from BrowserView`)

      // 3. 创建新页面
      const page = await this.puppeteerBrowser!.newPage()
      console.log(`[PuppeteerExecutor] ✅ New page created`)

      try {
        // 4. 🔥 设置 User-Agent（模拟真人）
        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        )

        // 5. 🔥 注入 cookies
        if (cookies.length > 0) {
          await page.setCookie(...cookies)
          console.log(`[PuppeteerExecutor] ✅ Cookies injected`)
        }

        // 6. 🔥 禁用 webdriver 检测
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', {
            get: () => false
          })
          // 伪装 Chrome 特征
          // @ts-ignore - 浏览器环境注入
          window.chrome = { runtime: {} }
        })

        // 7. 导航到页面
        console.log(`[PuppeteerExecutor] ⏳ Navigating to ${url}...`)
        await page.goto(url, {
          waitUntil: 'domcontentloaded', // 只等待 DOM 加载，不等完整资源
          timeout: 30000
        })
        console.log(`[PuppeteerExecutor] ✅ Page loaded`)

        // 8. 🔥 移除干扰元素
        await page.evaluate((selectors) => {
          document.querySelectorAll(selectors).forEach(el => el.remove())
        }, removeSelectors)

        // 9. 🔥 提取内容（与 BrowserView 逻辑一致）
        const result = await page.evaluate(({ strategy: strat, contentSelector, titleSel, densityWeightPercent }) => {
          let contentText = ''
          let actualContentSelector = ''
          let titleText = ''
          let actualTitleSelector = ''

          // 提取标题
          const titleElem = document.querySelector(titleSel)
          if (titleElem) {
            titleText = (titleElem.textContent || '').trim()
            actualTitleSelector = titleSel
          } else {
            titleText = document.title || ''
            actualTitleSelector = 'document.title'
          }

          // 提取内容
          if (strat === 'max-text') {
            const densityWeight = densityWeightPercent / 100
            const lengthWeight = 1 - densityWeight
            
            let maxScore = 0
            let maxText = ''
            let maxElem: HTMLElement | null = null

            const candidates = document.querySelectorAll<HTMLElement>('div, article, section, main')
            candidates.forEach(elem => {
              const elemText = elem.textContent || ''
              const textLength = elemText.trim().length
              const tagCount = elem.querySelectorAll('*').length || 1
              const density = textLength / tagCount
              const score = textLength * lengthWeight + density * 1000 * densityWeight
              
              if (textLength > 500 && score > maxScore) {
                maxScore = score
                maxText = elemText
                maxElem = elem
              }
            })

            contentText = maxText.trim()
            
            if (maxElem) {
              const elem = maxElem as HTMLElement
              const tagName = elem.tagName.toLowerCase()
              const id = elem.id
              const className = Array.from(elem.classList)[0]
              
              if (id) {
                actualContentSelector = `${tagName}#${id}`
              } else if (className) {
                actualContentSelector = `${tagName}.${className}`
              } else {
                actualContentSelector = `${tagName} (auto-detected)`
              }
            }
          } else if (contentSelector) {
            const elem = document.querySelector(contentSelector)
            if (elem) {
              contentText = (elem.textContent || '').trim()
              actualContentSelector = contentSelector
            }
          }

          return {
            titleText,
            actualTitleSelector,
            contentText,
            actualContentSelector
          }
        }, {
          strategy,
          contentSelector: selector || '',
          titleSel: titleSelector,
          densityWeightPercent: config?.densityWeight ?? 70
        })

        console.log(`[PuppeteerExecutor] ✅ Content extracted:`)
        console.log(`  - Title: ${result.titleText.substring(0, 50)}...`)
        console.log(`  - Content length: ${result.contentText.length}`)
        console.log(`  - Content selector: ${result.actualContentSelector}`)

        return {
          title: {
            text: result.titleText,
            length: result.titleText.length,
            selector: result.actualTitleSelector
          },
          content: {
            text: result.contentText,
            length: result.contentText.length,
            selector: result.actualContentSelector
          },
          url,
          engine: 'puppeteer'
        }

      } finally {
        // 10. 关闭页面（释放资源）
        await page.close()
        console.log(`[PuppeteerExecutor] ✅ Page closed`)
      }

    } catch (error) {
      console.error(`[PuppeteerExecutor] ❌ Execution failed:`, error)
      throw error
    }
  }

  /**
   * 🔥 初始化 Puppeteer Browser（使用Edge/Chrome headless模式）
   */
  private async initPuppeteerBrowser(): Promise<void> {
    if (this.puppeteerBrowser) return
    
    console.log(`[PuppeteerExecutor] 🚀 Initializing Puppeteer browser...`)
    
    try {
      // 🔥 获取浏览器路径（用户配置 > Edge > Chrome）
      const executablePath = await this.getBrowserPath()
      
      console.log(`[PuppeteerExecutor] Using browser at: ${executablePath}`)
      
      // 🔥 启动浏览器（headless模式，后台运行）
      this.puppeteerBrowser = await puppeteer.launch({
        headless: true, // ← 后台运行，不显示窗口
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        ]
      })
      
      console.log(`[PuppeteerExecutor] ✅ Browser launched successfully`)
    } catch (error) {
      console.error(`[PuppeteerExecutor] ❌ Failed to launch browser:`, error)
      throw error
    }
  }
  
  /**
   * 🔥 获取浏览器路径（统一优先级）
   */
  private async getBrowserPath(): Promise<string> {
    // 1️⃣ 用户手动配置（最高优先级）
    const userPath = await this.getUserConfiguredBrowserPath()
    if (userPath && existsSync(userPath)) {
      console.log('[Puppeteer] 使用用户配置:', userPath)
      return userPath
    }
    
    // 2️⃣ 自动检测Edge（Windows自带）
    try {
      const edgePath = GetTextExecutor.detectEdge()
      console.log('[Puppeteer] 使用Edge:', edgePath)
      return edgePath
    } catch {}
    
    // 3️⃣ 自动检测Chrome（备用）
    try {
      const chromePath = GetTextExecutor.detectChrome()
      console.log('[Puppeteer] 使用Chrome:', chromePath)
      return chromePath
    } catch {}
    
    throw new Error('未找到可用的Chromium浏览器（Edge/Chrome）')
  }
  
  /**
   * 从配置获取用户手动设置的路径
   */
  private async getUserConfiguredBrowserPath(): Promise<string | null> {
    // 从全局变量获取（后续会通过IPC从前端传递）
    return (global as any).userBrowserPath || null
  }
  
  /**
   * 🔥 自动检测所有可用浏览器（供前端调用）
   */
  static detectAllBrowsers(): Array<{
    name: string
    type: 'edge' | 'chrome'
    path: string
  }> {
    const browsers: Array<{
      name: string
      type: 'edge' | 'chrome'
      path: string
    }> = []
    
    // 检测Edge
    try {
      const edgePath = this.detectEdge()
      browsers.push({
        name: 'Microsoft Edge',
        type: 'edge',
        path: edgePath
      })
    } catch {}
    
    // 检测Chrome
    try {
      const chromePath = this.detectChrome()
      browsers.push({
        name: 'Google Chrome',
        type: 'chrome',
        path: chromePath
      })
    } catch {}
    
    return browsers
  }
  
  /**
   * 🔥 检测Edge
   */
  static detectEdge(): string {
    const paths = [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      (process.env['PROGRAMFILES(X86)'] || '') + '\\Microsoft\\Edge\\Application\\msedge.exe',
      (process.env['PROGRAMFILES'] || '') + '\\Microsoft\\Edge\\Application\\msedge.exe'
    ]
    
    for (const path of paths) {
      if (path && existsSync(path)) return path
    }
    
    throw new Error('Edge not found')
  }
  
  /**
   * 🔥 检测Chrome
   */
  static detectChrome(): string {
    const { platform } = process
    
    const pathsMap = {
      win32: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe',
        (process.env['PROGRAMFILES'] || '') + '\\Google\\Chrome\\Application\\chrome.exe',
        (process.env['PROGRAMFILES(X86)'] || '') + '\\Google\\Chrome\\Application\\chrome.exe'
      ],
      darwin: [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      ],
      linux: [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
      ]
    }
    
    const platformPaths = pathsMap[platform as keyof typeof pathsMap] || []
    
    for (const path of platformPaths) {
      if (path && existsSync(path)) return path
    }
    
    throw new Error('Chrome not found')
  }

  /**
   * 🔥 从 BrowserView 获取 cookies（模拟真人 session）
   */
  private async getCookiesFromBrowserView(tabId: string): Promise<Array<{
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }>> {
    try {
      // @ts-expect-error - 访问 private 属性
      const viewInstance = this.browserViewManager.views.get(tabId)
      if (!viewInstance) {
        console.warn(`[PuppeteerExecutor] ⚠️ BrowserView not found for tab ${tabId}`)
        return []
      }

      const dbg = viewInstance.view.webContents.debugger

      // 附加 debugger（如果还没附加）
      if (!dbg.isAttached()) {
        dbg.attach('1.3')
      }

      // 🔥 通过 CDP 获取 cookies
      const result = await dbg.sendCommand('Network.getAllCookies') as {
        cookies: Array<{
          name: string
          value: string
          domain: string
          path: string
          expires?: number
          httpOnly?: boolean
          secure?: boolean
          sameSite?: string
        }>
      }
      
      // 转换为 Puppeteer 格式
      return result.cookies.map((cookie) => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires || -1,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: (cookie.sameSite as 'Strict' | 'Lax' | 'None') || 'Lax'
      }))

    } catch (error) {
      console.error(`[PuppeteerExecutor] ❌ Failed to get cookies:`, error)
      return []
    }
  }

  /**
   * 🔥 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.puppeteerBrowser) {
      try {
        // 🔥 关闭浏览器（launch模式）
        await this.puppeteerBrowser.close()
        console.log(`[PuppeteerExecutor] ✅ Browser closed`)
      } catch (error) {
        console.error(`[PuppeteerExecutor] Error during cleanup:`, error)
      }
      this.puppeteerBrowser = null
    }
  }
  
  /**
   * 🔥 设置用户配置的浏览器路径（由IPC调用）
   */
  static setUserBrowserPath(path: string | null): void {
    (global as any).userBrowserPath = path
  }
}

