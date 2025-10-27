/**
 * BrowserView 管理器
 * 管理搜索和抓取功能的 BrowserView 实例
 */

import { BrowserView, BrowserWindow } from 'electron'
import type { Session } from 'electron'
import { LightModeScraper, type LightScrapeOptions, type ChapterData, type ScrapeResult } from './light-mode-scraper'

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
  private lightScraper: LightModeScraper
  private elementPickerKeyListeners = new Map<string, (event: Electron.Event, input: Electron.Input) => void>()
  
  constructor(session: Session) {
    this.session = session
    this.lightScraper = new LightModeScraper()
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
    
    // 🔍 页面加载完成后注入缩放控制脚本
    view.webContents.on('did-finish-load', () => {
      this.injectZoomControlScript(tabId, window)
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
    
    // 监听console消息（用于接收元素选取信息和缩放请求）
    view.webContents.on('console-message', (_event, _level, message) => {
      // 🔥 处理 CDP 确认请求（新系统：详细框确认）
      if (message.startsWith('__NIMBRIA_CDP_CONFIRM__')) {
        try {
          const jsonStr = message.replace('__NIMBRIA_CDP_CONFIRM__', '').trim()
          const data = JSON.parse(jsonStr)
          console.log(`[BrowserViewManager] 🔥 CDP confirm request received:`, data)
          
          // 调用 CDP 方法
          this.confirmSelectionWithCDP(data.tabId, data.selector, window)
            .catch(error => {
              console.error(`[BrowserViewManager] CDP confirmation failed:`, error)
            })
        } catch (error) {
          console.error(`[BrowserViewManager] Failed to parse CDP confirm data:`, error)
        }
        return
      }
      
      // 🔥 老系统：直接点击（使用 console.log 传输）
      if (message.startsWith('__NIMBRIA_ELEMENT_SELECTED__')) {
        try {
          const jsonStr = message.replace('__NIMBRIA_ELEMENT_SELECTED__', '').trim()
          const data = JSON.parse(jsonStr)
          // 发送到渲染进程
          window.webContents.send('search-scraper:element-selected', data)
          console.log(`[BrowserViewManager] Element selected event sent (老系统):`, data)
        } catch (error) {
          console.error(`[BrowserViewManager] Failed to parse element selection data:`, error)
        }
        return
      }
      
      // 🔥 处理取消事件
      if (message.startsWith('__NIMBRIA_PICKER_CANCELLED__')) {
        try {
          const jsonStr = message.replace('__NIMBRIA_PICKER_CANCELLED__', '').trim()
          const data = JSON.parse(jsonStr)
          // 发送到渲染进程
          window.webContents.send('search-scraper:picker-cancelled', data)
          console.log(`[BrowserViewManager] Picker cancelled event sent:`, data)
        } catch (error) {
          console.error(`[BrowserViewManager] Failed to parse cancel data:`, error)
        }
      } else if (message.startsWith('__NIMBRIA_ZOOM_REQUEST__')) {
        try {
          const jsonStr = message.replace('__NIMBRIA_ZOOM_REQUEST__', '').trim()
          const data = JSON.parse(jsonStr)
          // 直接调整缩放
          if (data.tabId === tabId && typeof data.delta === 'number') {
            this.adjustZoom(tabId, data.delta)
          }
        } catch (error) {
          console.error(`[BrowserViewManager] Failed to parse zoom request:`, error)
        }
      }
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
    
    // 日志太频繁，注释掉避免污染控制台
    // console.log(`[BrowserViewManager] Showing view ${tabId} with bounds:`, bounds)
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
    
    // 🔥 清理键盘监听器
    const keyListener = this.elementPickerKeyListeners.get(tabId)
    if (keyListener) {
      window.webContents.removeListener('before-input-event', keyListener)
      this.elementPickerKeyListeners.delete(tabId)
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
   * 🔍 调整缩放比例（相对调整）
   */
  public adjustZoom(tabId: string, delta: number): number {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    // 获取当前缩放比例
    const currentZoom = instance.view.webContents.getZoomFactor()
    
    // 计算新的缩放比例，限制在 0.25 到 5.0 之间
    const newZoom = Math.min(Math.max(currentZoom + delta, 0.25), 5.0)
    
    // 设置新的缩放比例
    instance.view.webContents.setZoomFactor(newZoom)
    
    console.log(`[BrowserViewManager] Zoom adjusted for ${tabId}: ${currentZoom.toFixed(2)} -> ${newZoom.toFixed(2)}`)
    return newZoom
  }
  
  /**
   * 🔍 设置缩放比例（绝对设置）
   */
  public setZoomFactor(tabId: string, factor: number): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    // 限制范围
    const newZoom = Math.min(Math.max(factor, 0.25), 5.0)
    instance.view.webContents.setZoomFactor(newZoom)
    
    console.log(`[BrowserViewManager] Zoom set for ${tabId}: ${newZoom.toFixed(2)}`)
  }
  
  /**
   * 🔍 获取当前缩放比例
   */
  public getZoomFactor(tabId: string): number {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    return instance.view.webContents.getZoomFactor()
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
  
  /**
   * 开始元素选取模式
   */
  public startElementPicker(tabId: string, window: BrowserWindow, nodeType: 'get-text' | 'get-links' = 'get-text'): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    // 🔥 先注入 CDP 确认通道（用于详细框确认）
    const cdpChannelScript = `
      window.__nimbriaConfirmWithCDP = function(selector) {
        console.log('[ElementPicker] 🚀 Requesting CDP confirmation for:', selector);
        console.log('__NIMBRIA_CDP_CONFIRM__ ' + JSON.stringify({
          tabId: '${tabId}',
          selector: selector
        }));
      };
      console.log('[ElementPicker] ✅ CDP channel initialized');
    `
    
    instance.view.webContents.executeJavaScript(cdpChannelScript)
      .then(() => {
        console.log(`[BrowserViewManager] CDP channel injected for ${tabId}`)
    
    // 注入元素选取脚本
    const pickerScript = this.getElementPickerScript(tabId, window, nodeType)
        return instance.view.webContents.executeJavaScript(pickerScript)
      })
      .then(() => {
        console.log(`[BrowserViewManager] Element picker started for ${tabId}`)
      })
      .catch(error => {
        console.error(`[BrowserViewManager] Failed to inject picker script:`, error)
      })
    
    // 🔥 设置全局键盘事件监听（解决焦点问题）
    const keyListener = (_event: Electron.Event, input: Electron.Input) => {
      // 只处理按键按下事件
      if (input.type !== 'keyDown') return
      
      // 只处理元素选择器相关的按键
      const relevantKeys = ['ArrowUp', 'ArrowDown', 'Enter', 'Escape']
      if (!relevantKeys.includes(input.key)) return
      
      // 转发按键事件到BrowserView
      const forwardScript = `
        if (window.__nimbriaElementPicker) {
          const event = new KeyboardEvent('keydown', {
            key: '${input.key}',
            code: '${input.code}',
            bubbles: true,
            cancelable: true
          });
          document.dispatchEvent(event);
        }
      `
      
      instance.view.webContents.executeJavaScript(forwardScript).catch(err => {
        console.error('[BrowserViewManager] Failed to forward key event:', err)
      })
    }
    
    // 保存监听器引用
    this.elementPickerKeyListeners.set(tabId, keyListener)
    
    // 在主窗口上监听键盘事件
    window.webContents.on('before-input-event', keyListener)
    
    console.log(`[BrowserViewManager] 🎹 Global keyboard listener enabled for ${tabId}`)
  }
  
  /**
   * 停止元素选取模式
   */
  public stopElementPicker(tabId: string, window: BrowserWindow): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    // 移除选取脚本
    const stopScript = `
      if (window.__nimbriaElementPicker) {
        window.__nimbriaElementPicker.destroy();
        delete window.__nimbriaElementPicker;
      }
    `
    instance.view.webContents.executeJavaScript(stopScript)
      .then(() => {
        console.log(`[BrowserViewManager] Element picker stopped for ${tabId}`)
      })
      .catch(error => {
        console.error(`[BrowserViewManager] Failed to stop picker:`, error)
      })
    
    // 🔥 移除全局键盘事件监听
    const keyListener = this.elementPickerKeyListeners.get(tabId)
    if (keyListener) {
      window.webContents.removeListener('before-input-event', keyListener)
      this.elementPickerKeyListeners.delete(tabId)
      console.log(`[BrowserViewManager] 🎹 Global keyboard listener removed for ${tabId}`)
    }
  }
  
  /**
   * 🔥 使用 CDP 确认元素选择（不依赖页面 JS，适用于防爬网站）
   */
  public async confirmSelectionWithCDP(tabId: string, selector: string, window: BrowserWindow): Promise<void> {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    const dbg = instance.view.webContents.debugger
    
    try {
      console.log(`[CDP] 🚀 Starting CDP confirmation for selector: ${selector}`)
      
      // 附加 debugger（如果还没附加）
      if (!dbg.isAttached()) {
        dbg.attach('1.3')
        console.log(`[CDP] ✅ Debugger attached`)
      }
      
      // 启用 DOM domain
      await dbg.sendCommand('DOM.enable')
      console.log(`[CDP] ✅ DOM domain enabled`)
      
      // 获取文档根节点
      const { root } = await dbg.sendCommand('DOM.getDocument', {
        depth: -1,
        pierce: true
      })
      console.log(`[CDP] ✅ Document root obtained, nodeId: ${root.nodeId}`)
      
      // 使用缓存的选择器查询元素
      const { nodeId } = await dbg.sendCommand('DOM.querySelector', {
        nodeId: root.nodeId,
        selector: selector
      })
      
      if (!nodeId) {
        console.error('[CDP] ❌ Element not found with selector:', selector)
        return
      }
      console.log(`[CDP] ✅ Element found, nodeId: ${nodeId}`)
      
      // 获取元素的详细信息
      const [
        { outerHTML },
        { attributes },
        { node: model }
      ] = await Promise.all([
        dbg.sendCommand('DOM.getOuterHTML', { nodeId }),
        dbg.sendCommand('DOM.getAttributes', { nodeId }),
        dbg.sendCommand('DOM.describeNode', { nodeId })
      ])
      console.log(`[CDP] ✅ Element details obtained`)
      
      // 获取文本内容
      const { object } = await dbg.sendCommand('DOM.resolveNode', { nodeId })
      const { result } = await dbg.sendCommand('Runtime.callFunctionOn', {
        objectId: object.objectId,
        functionDeclaration: 'function() { return { text: this.textContent, length: this.textContent.length }; }'
      })
      console.log(`[CDP] ✅ Text content obtained:`, result.value)
      
      // 解析 attributes 数组为对象
      const attrObj: Record<string, string> = {}
      for (let i = 0; i < attributes.length; i += 2) {
        attrObj[attributes[i]] = attributes[i + 1]
      }
      
      // 生成简化的 XPath
      let xpath = ''
      if (attrObj['id']) {
        xpath = `//*[@id="${attrObj['id']}"]`
      } else {
        xpath = `//${model.nodeName.toLowerCase()}`
      }
      
      // 构建元素信息
      const elementInfo = {
        selector: selector,
        tagName: model.nodeName.toLowerCase(),
        id: attrObj['id'] || undefined,
        classList: attrObj['class']?.split(' ').filter(Boolean) || undefined,
        textContent: result.value?.text?.substring(0, 100) || undefined,
        xpath: xpath,
        timestamp: Date.now()
      }
      
      console.log('[CDP] ✅ Element info constructed via CDP:', elementInfo)
      
      // 🔥 直接通过主进程 IPC 发送到渲染进程
      window.webContents.send('search-scraper:element-selected', {
        tabId,
        element: elementInfo
      })
      
      console.log('[CDP] 🚀 Element selected event sent to renderer')
      
    } catch (error) {
      console.error('[CDP] ❌ Failed to confirm selection:', error)
    } finally {
      // 保持 debugger 附加状态，以便后续使用
      // debugger.detach()
    }
  }
  
  /**
   * 智能提取章节列表
   * 🔥 优化：只等待 DOM Ready，不等待完全加载（图片、广告等资源）
   */
  public async intelligentExtractChapters(tabId: string): Promise<Array<{ title: string; url: string }>> {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    try {
      // 🔥 更准确的检测：检查 document.readyState
      const readyState = await instance.view.webContents.executeJavaScript('document.readyState')
      
      if (readyState !== 'complete' && readyState !== 'interactive') {
        console.log(`[BrowserViewManager] Document not ready (${readyState}), waiting for DOM ready...`)
        // 等待 DOM 准备
        await new Promise<void>((resolve) => {
          const onDomReady = () => {
            console.log(`[BrowserViewManager] DOM ready, extracting chapters...`)
            instance.view.webContents.removeListener('dom-ready', onDomReady)
            resolve()
          }
          instance.view.webContents.once('dom-ready', onDomReady)
          
          // 超时保护（1.5秒，更短）
          setTimeout(() => {
            instance.view.webContents.removeListener('dom-ready', onDomReady)
            console.warn(`[BrowserViewManager] DOM ready timeout, extracting anyway...`)
            resolve()
          }, 1500)
        })
      } else {
        console.log(`[BrowserViewManager] Document ready (${readyState}), extracting immediately...`)
      }
      
      const chapters = await instance.view.webContents.executeJavaScript(`
        (function() {
          // 策略1: 找链接密度最高的容器
          function findChapterContainer() {
            let maxLinks = 0;
            let bestContainer = null;
            
            const containers = document.querySelectorAll('div, ul, ol, table, section');
            
            containers.forEach(container => {
              const links = container.querySelectorAll('a');
              if (links.length > maxLinks && links.length > 10) {
                maxLinks = links.length;
                bestContainer = container;
              }
            });
            
            return bestContainer;
          }
          
          // 策略2: 通过章节命名模式识别
          function extractByPattern() {
            const allLinks = Array.from(document.querySelectorAll('a'));
            const patterns = [
              /第\\s*[0-9零一二三四五六七八九十百千万]+\\s*[章节回]/,
              /Chapter\\s*\\d+/i,
              /^\\d+[\\.、\\s]/,
            ];
            
            return allLinks.filter(link => {
              const text = link.textContent?.trim() || '';
              return patterns.some(p => p.test(text));
            });
          }
          
          // 先尝试容器方式
          let container = findChapterContainer();
          let links = container ? Array.from(container.querySelectorAll('a')) : [];
          
          // 如果失败，用模式匹配
          if (links.length < 5) {
            links = extractByPattern();
          }
          
          // 过滤和提取
          const blacklist = ['首页', '书架', '投票', '打赏', '目录', '上一章', '下一章', '返回'];
          
          return links
            .filter(link => {
              const text = link.textContent?.trim() || '';
              const href = link.href || '';
              
              if (!text || text.length < 2 || text.length > 100) return false;
              
              return !blacklist.some(kw => 
                text.includes(kw) || href.includes(kw)
              );
            })
            .map(link => ({
              title: link.textContent?.trim() || '',
              url: link.href
            }));
        })();
      `)
      
      console.log(`[BrowserViewManager] Extracted ${chapters.length} chapters from ${tabId}`)
      return chapters
    } catch (error) {
      console.error(`[BrowserViewManager] Failed to extract chapters:`, error)
      return []
    }
  }
  
  /**
   * 爬取章节内容
   */
  public async scrapeChapterContent(tabId: string, chapterUrl: string): Promise<{
    title: string
    content: string
    summary: string
  }> {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    try {
      // 加载章节URL
      await instance.view.webContents.loadURL(chapterUrl)
      
      // 等待页面加载完成
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 智能提取正文
      const content = await instance.view.webContents.executeJavaScript(`
        (function() {
          // 移除干扰元素
          const removeSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe'];
          removeSelectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
          });
          
          // 提取标题
          const titleElem = document.querySelector('h1') || 
                           document.querySelector('h2') ||
                           document.querySelector('.title');
          const title = titleElem?.textContent?.trim() || '未知标题';
          
          // 找文字最多的容器（使用文本密度评分）
          function findMainContent() {
            let maxScore = 0;
            let bestElement = null;
            
            const candidates = document.querySelectorAll('div, article, section');
            
            candidates.forEach(elem => {
              const text = elem.textContent?.trim() || '';
              
              // 计算文本密度
              const tagCount = elem.querySelectorAll('*').length || 1;
              const density = text.length / tagCount;
              
              // 综合评分
              const score = text.length * 0.7 + density * 0.3;
              
              if (text.length > 500 && score > maxScore) {
                maxScore = score;
                bestElement = elem;
              }
            });
            
            return bestElement;
          }
          
          const mainElem = findMainContent();
          
          if (!mainElem) {
            return { title, content: '', summary: '' };
          }
          
          // 提取段落
          const paragraphs = Array.from(mainElem.querySelectorAll('p'))
            .map(p => p.textContent?.trim())
            .filter(text => text && text.length > 0);
          
          let content = paragraphs.join('\\n\\n');
          
          // 如果没有p标签，按br分割
          if (!content || content.length < 100) {
            content = mainElem.innerHTML
              .replace(/<br\\s*\\/?>/gi, '\\n')
              .replace(/<[^>]+>/g, '')
              .trim();
          }
          
          // 清理广告等
          const adPatterns = [
            /請記住本站域名.*?黃金屋/g,
            /快捷鍵.*$/g,
            /www\\..*?\\.com/g,
          ];
          
          adPatterns.forEach(pattern => {
            content = content.replace(pattern, '');
          });
          
          // 生成摘要（前200字）
          const summary = content.substring(0, 200) + (content.length > 200 ? '...' : '');
          
          return {
            title,
            content: content.trim(),
            summary
          };
        })();
      `)
      
      console.log(`[BrowserViewManager] Scraped chapter: ${content.title}`)
      return content
    } catch (error) {
      console.error(`[BrowserViewManager] Failed to scrape chapter:`, error)
      throw error
    }
  }
  
  /**
   * 生成元素选取脚本
   */
  private getElementPickerScript(tabId: string, window: BrowserWindow, nodeType: string): string {
    return `
      (function() {
        // 防止重复注入
        if (window.__nimbriaElementPicker) {
          console.log('[ElementPicker] Already initialized');
          return;
        }
        
        // 🔥 注入节点类型常量
        const NODE_TYPE = '${nodeType}';
        console.log('[ElementPicker] Node type:', NODE_TYPE);
        
        // 继续原有的初始化代码
        if (false) {
          console.log('[ElementPicker] Already initialized');
          return;
        }
        
        console.log('[ElementPicker] Initializing Enhanced Element Picker...');
        
        // ============ 状态管理 ============
        let currentElement = null;
        let cachedSelector = null; // 🔥 缓存计算好的选择器，防止DOM变化影响
        let cachedElementInfo = null; // 🔥 缓存完整的元素信息（新系统用，详细框确认时发送）
        let navigationMode = false; // 层级导航模式
        let hoverTimer = null;
        let hoverProgress = 0;
        let detailBoxVisible = false;
        let lastMouseX = 0, lastMouseY = 0;
        
        // ============ DOM 元素创建 ============
        
        // 高亮框
        const overlay = document.createElement('div');
        overlay.id = '__nimbria-picker-overlay';
        overlay.style.cssText = \`
          position: absolute;
          pointer-events: none;
          border: 2px solid #409EFF;
          background: rgba(64, 158, 255, 0.1);
          z-index: 999998;
          transition: all 0.2s ease;
        \`;
        document.body.appendChild(overlay);
        
        // 进度球（跟随光标）
        const progressBall = document.createElement('div');
        progressBall.id = '__nimbria-progress-ball';
        progressBall.style.cssText = \`
          position: fixed;
          left: 0;
          top: 0;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: conic-gradient(#409EFF 0deg, #409EFF 0deg, transparent 0deg);
          border: 2px solid rgba(64, 158, 255, 0.3);
          z-index: 999999;
          opacity: 0;
          transition: opacity 0.3s;
          pointer-events: none;
          transform: translate(-50%, -50%);
        \`;
        const progressInner = document.createElement('div');
        progressInner.style.cssText = \`
          position: absolute;
          inset: 3px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 50%;
        \`;
        progressBall.appendChild(progressInner);
        document.body.appendChild(progressBall);
        
        // 详细信息框
        const detailBox = document.createElement('div');
        detailBox.id = '__nimbria-detail-box';
        detailBox.style.cssText = \`
          position: absolute;
          width: 320px;
          max-height: 220px;
          background: rgba(0, 0, 0, 0.92);
          color: #fff;
          font-size: 12px;
          font-family: 'Consolas', 'Monaco', monospace;
          padding: 12px;
          border-radius: 8px;
          overflow: auto;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
          z-index: 1000000;
          backdrop-filter: blur(8px);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          line-height: 1.5;
        \`;
        document.body.appendChild(detailBox);
        
        // ============ 工具函数 ============
        
        // 生成CSS选择器路径
        function getSelector(element) {
          if (element.id) return '#' + element.id;
          
          let path = [];
          let current = element;
          while (current && current.parentElement) {
            let selector = current.tagName.toLowerCase();
            if (current.className) {
              const classes = Array.from(current.classList).filter(c => !c.startsWith('__nimbria'));
              if (classes.length > 0) {
                selector += '.' + classes.slice(0, 2).join('.');
              }
            }
            
            // 添加nth-child
            let sibling = current;
            let nth = 1;
            while (sibling.previousElementSibling) {
              sibling = sibling.previousElementSibling;
              if (sibling.tagName === current.tagName) nth++;
            }
            if (nth > 1 || current.nextElementSibling) {
              selector += \`:nth-child(\${nth})\`;
            }
            
            path.unshift(selector);
            current = current.parentElement;
            
            if (path.length >= 6) break;
          }
          
          return path.join(' > ');
        }
        
        // 生成XPath
        function getXPath(element) {
          if (element.id) return '//*[@id="' + element.id + '"]';
          
          const parts = [];
          let current = element;
          while (current && current.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = current.previousSibling;
            while (sibling) {
              if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
                index++;
              }
              sibling = sibling.previousSibling;
            }
            
            const tagName = current.nodeName.toLowerCase();
            const pathIndex = index ? \`[\${index + 1}]\` : '';
            parts.unshift(tagName + pathIndex);
            current = current.parentNode;
          }
          
          return parts.length ? '/' + parts.join('/') : '';
        }
        
        // 获取元素层级路径
        function getHierarchyPath(element) {
          const path = [];
          let current = element;
          while (current && current !== document.body) {
            let label = current.tagName.toLowerCase();
            if (current.id) label += '#' + current.id;
            else if (current.className) {
              const classes = Array.from(current.classList).filter(c => !c.startsWith('__nimbria'));
              if (classes.length > 0) label += '.' + classes[0];
            }
            path.unshift(label);
            current = current.parentElement;
          }
          path.unshift('body');
          return path;
        }
        
        // 获取元素摘要
        function getElementSummary(element) {
          const text = element.textContent || '';
          const textPreview = text.trim().substring(0, 80).replace(/\\n/g, ' ');
          const childrenCount = element.children.length;
          
          return {
            tagName: element.tagName.toLowerCase(),
            id: element.id || '',
            classList: element.className ? Array.from(element.classList).filter(c => !c.startsWith('__nimbria')).join(' ') : '',
            textPreview: textPreview + (text.length > 80 ? '...' : ''),
            textLength: text.length,
            childrenCount: childrenCount,
            attributes: Array.from(element.attributes).reduce((acc, attr) => {
              if (!attr.name.startsWith('__nimbria')) {
                acc[attr.name] = attr.value.substring(0, 50);
              }
              return acc;
            }, {})
          };
        }
        
        // 🔥 根据节点类型提取预览内容
        function getNodeSpecificPreview(element) {
          if (NODE_TYPE === 'get-links') {
            // 提取链接预览
            const allLinks = Array.from(element.querySelectorAll('a'))
              .filter(a => a.href && a.textContent?.trim());
            
            return {
              type: 'links',
              data: allLinks.slice(0, 5).map(a => ({
                title: a.textContent.trim().substring(0, 30),
                url: a.href
              })),
              totalCount: allLinks.length
            };
          } else if (NODE_TYPE === 'get-text') {
            // 提取文本预览
            const text = element.textContent || '';
            return {
              type: 'text',
              data: text.trim().substring(0, 200),
              totalLength: text.length
            };
          }
          return null;
        }
        
        // 更新详细信息框内容
        function updateDetailBox(element) {
          const summary = getElementSummary(element);
          const path = getHierarchyPath(element);
          const preview = getNodeSpecificPreview(element);  // 🔥 获取预览
          
          // 🔥 提前计算并缓存选择器（防止后续DOM变化影响）
          cachedSelector = getSelector(element);
          console.log('[ElementPicker] 🎯 Cached selector:', cachedSelector);
          
          // 🔥 构建并缓存完整的元素信息（用于详细框确认时直接发送）
          cachedElementInfo = {
            selector: cachedSelector,
            tagName: summary.tagName,
            id: summary.id || undefined,
            classList: summary.classList ? summary.classList.split(' ').filter(Boolean) : undefined,
            textContent: summary.textPreview || undefined,
            textLength: summary.textLength,
            childrenCount: summary.childrenCount,
            xpath: getXPath(element),
            preview: preview,  // 🔥 缓存预览
            timestamp: Date.now()
          };
          console.log('[ElementPicker] 💾 Cached element info:', cachedElementInfo);
          
          let html = \`
            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
              <div style="color: #409EFF; font-weight: bold; margin-bottom: 4px;">📍 层级路径</div>
              <div style="color: #aaa; font-size: 11px; word-break: break-all;">
                \${path.map((p, i) => i === path.length - 1 ? \`<span style="color: #67C23A; font-weight: bold;">\${p}</span>\` : p).join(' > ')}
              </div>
            </div>
            
            <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
              <div style="color: #409EFF; font-weight: bold; margin-bottom: 4px;">🎯 CSS选择器</div>
              <div style="color: #67C23A; margin-top: 4px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 11px; word-break: break-all; font-family: 'Consolas', monospace;">
                \${cachedSelector}
              </div>
            </div>
            
            <div style="margin-bottom: 6px;">
              <span style="color: #409EFF;">标签:</span> 
              <span style="color: #E6A23C;">&lt;\${summary.tagName}&gt;</span>
            </div>
          \`;
          
          if (summary.id) {
            html += \`
              <div style="margin-bottom: 6px;">
                <span style="color: #409EFF;">ID:</span> 
                <span style="color: #67C23A;">\${summary.id}</span>
              </div>
            \`;
          }
          
          if (summary.classList) {
            html += \`
              <div style="margin-bottom: 6px;">
                <span style="color: #409EFF;">Class:</span> 
                <span style="color: #F56C6C; word-break: break-all;">\${summary.classList}</span>
              </div>
            \`;
          }
          
          html += \`
            <div style="margin-bottom: 6px;">
              <span style="color: #409EFF;">子元素:</span> 
              <span style="color: #fff;">\${summary.childrenCount} 个</span>
            </div>
            
            <div style="margin-bottom: 6px;">
              <span style="color: #409EFF;">文本长度:</span> 
              <span style="color: #fff;">\${summary.textLength} 字符</span>
            </div>
          \`;
          
          if (summary.textPreview) {
            html += \`
              <div style="margin-bottom: 6px;">
                <span style="color: #409EFF;">文本预览:</span>
                <div style="color: #ddd; margin-top: 4px; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 11px; max-height: 60px; overflow: auto;">
                  \${summary.textPreview}
                </div>
              </div>
            \`;
          }
          
          // 🔥 根据节点类型渲染预览区
          if (preview?.type === 'links') {
            html += \`
              <div style="margin: 8px 0; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
                <div style="color: #409EFF; font-weight: bold;">🔗 链接预览</div>
                <div style="color: #909399; font-size: 11px;">
                  总计 \${preview.totalCount} 个链接，预览前5个
                </div>
                <div style="max-height: 120px; overflow: auto; margin-top: 4px;">
                  \${preview.data.map((link, i) => \`
                    <div style="margin: 4px 0; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 3px;">
                      <div style="color: #67C23A; font-size: 11px; font-weight: bold;">
                        \${i + 1}. \${link.title}
                      </div>
                      <div style="color: #909399; font-size: 10px; word-break: break-all;">
                        \${link.url}
                      </div>
                    </div>
                  \`).join('')}
                </div>
              </div>
            \`;
          } else if (preview?.type === 'text') {
            html += \`
              <div style="margin: 8px 0; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 8px;">
                <div style="color: #409EFF; font-weight: bold;">📝 文本预览</div>
                <div style="color: #909399; font-size: 11px;">总计 \${preview.totalLength} 字符</div>
                <div style="color: #ddd; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; font-size: 11px; max-height: 100px; overflow: auto; margin-top: 4px;">
                  \${preview.data}
                </div>
              </div>
            \`;
          }
          
          // 🔥 添加确认按钮（不依赖页面事件，直接使用缓存数据）
          html += \`
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.3);">
              <button id="__nimbria-confirm-btn" style="
                width: 100%;
                padding: 10px 16px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
                transition: all 0.2s ease;
              " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.6)';" onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.4)';">
                ✅ 确认选择此元素
              </button>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2); color: #909399; font-size: 11px; text-align: center;">
              💡 提示: ↑↓ 导航层级 | Enter/点按钮 确认 | Esc 退出
            </div>
          \`;
          
          detailBox.innerHTML = html;
          
          // 🔥 绑定确认按钮的点击事件（使用 setTimeout 确保DOM已渲染）
          setTimeout(() => {
            const confirmBtn = document.getElementById('__nimbria-confirm-btn');
            if (confirmBtn) {
              confirmBtn.onclick = (e) => {
          e.stopPropagation();
                e.preventDefault();
                console.log('[ElementPicker] 🎯 Confirm button clicked!');
                confirmSelection();
              };
            }
          }, 0);
        }
        
        // 🔥 确认选择（智能判断：新系统用CDP，老系统用console.log）
        function confirmSelection() {
          console.log('[ElementPicker] 🎯 confirmSelection called');
          
          if (!currentElement) {
            console.warn('[ElementPicker] ⚠️ No current element!');
            return;
          }
          
          if (currentElement.id?.startsWith('__nimbria')) {
            console.warn('[ElementPicker] ⚠️ Cannot select internal element');
            return;
          }
          
          // 🔥 智能判断：如果有缓存信息（新系统/详细框模式），使用CDP；否则用console.log（老系统/直接点击）
          if (cachedElementInfo && cachedSelector) {
            // 新系统路径：通过 CDP 确认（不依赖页面 JS）
            console.log('[ElementPicker] ✅ Using CDP path (新系统)');
            console.log('[ElementPicker] 🔥 Cached selector:', cachedSelector);
            
            // 调用预先注入的 CDP 通道函数
            if (window.__nimbriaConfirmWithCDP) {
              window.__nimbriaConfirmWithCDP(cachedSelector);
            } else {
              console.error('[ElementPicker] ❌ CDP channel not available!');
            }
          } else {
            // 老系统路径：实时计算并通过 console.log 传输
            console.log('[ElementPicker] ✅ Using console.log path (老系统)');
          
          const elementInfo = {
            selector: getSelector(currentElement),
            tagName: currentElement.tagName.toLowerCase(),
            id: currentElement.id || undefined,
            classList: currentElement.className ? Array.from(currentElement.classList).filter(c => !c.startsWith('__nimbria')) : undefined,
            textContent: currentElement.textContent?.substring(0, 100) || undefined,
            xpath: getXPath(currentElement),
            timestamp: Date.now()
          };
          
            console.log('[ElementPicker] ✅ Calculated element info (老系统):', elementInfo);
            
            // 🔥 发送到主进程（必须是单个字符串！）
            console.log('__NIMBRIA_ELEMENT_SELECTED__ ' + JSON.stringify({
              tabId: '${tabId}',
              element: elementInfo
          }));
        }
        
          console.log('[ElementPicker] 🚀 Data sent to main process!');
        }
        
        // 定位详细信息框
        function positionDetailBox(element) {
          const rect = element.getBoundingClientRect();
          const boxWidth = 320;
          const boxMaxHeight = 220;
          const margin = 12;
          
          let left, top;
          
          // 优先右侧
          if (rect.right + margin + boxWidth <= window.innerWidth) {
            left = rect.right + margin;
            top = rect.top;
          }
          // 左侧
          else if (rect.left - margin - boxWidth >= 0) {
            left = rect.left - margin - boxWidth;
            top = rect.top;
          }
          // 下方
          else if (rect.bottom + margin + boxMaxHeight <= window.innerHeight) {
            left = Math.max(0, Math.min(rect.left, window.innerWidth - boxWidth));
            top = rect.bottom + margin;
          }
          // 上方
          else {
            left = Math.max(0, Math.min(rect.left, window.innerWidth - boxWidth));
            top = Math.max(0, rect.top - margin - boxMaxHeight);
          }
          
          detailBox.style.left = (left + window.scrollX) + 'px';
          detailBox.style.top = (top + window.scrollY) + 'px';
        }
        
        // 更新高亮框位置
        function updateOverlayPosition(element) {
          if (!element) return;
          
          const rect = element.getBoundingClientRect();
          overlay.style.left = (rect.left + window.scrollX) + 'px';
          overlay.style.top = (rect.top + window.scrollY) + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
        }
        
        // 更新进度球位置（跟随光标，右下偏移）
        function updateProgressBallPosition(clientX, clientY) {
          progressBall.style.left = (clientX + 20) + 'px';
          progressBall.style.top = (clientY + 20) + 'px';
        }
        
        // 更新进度球
        function updateProgressBall(progress) {
          const deg = progress * 3.6; // 0-100 -> 0-360
          progressBall.style.background = \`conic-gradient(#409EFF 0deg, #409EFF \${deg}deg, transparent \${deg}deg)\`;
        }
        
        // 开始悬停计时
        function startHoverTimer() {
          clearHoverTimer();
          hoverProgress = 0;
          progressBall.style.opacity = '0.7';
          
          const startTime = Date.now();
          const duration = 3000;
          
          hoverTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            hoverProgress = Math.min(100, (elapsed / duration) * 100);
            updateProgressBall(hoverProgress);
            
            if (hoverProgress >= 100) {
              clearHoverTimer();
              showDetailBox();
            }
          }, 50);
        }
        
        // 清除悬停计时
        function clearHoverTimer() {
          if (hoverTimer) {
            clearInterval(hoverTimer);
            hoverTimer = null;
          }
          progressBall.style.opacity = '0';
          hoverProgress = 0;
          updateProgressBall(0);
        }
        
        // 显示详细信息框
        function showDetailBox() {
          if (!currentElement) return;
          
          updateDetailBox(currentElement);
          positionDetailBox(currentElement);
          detailBox.style.opacity = '1';
          detailBox.style.pointerEvents = 'auto';
          detailBoxVisible = true;
        }
        
        // 隐藏详细信息框
        function hideDetailBox() {
          detailBox.style.opacity = '0';
          detailBox.style.pointerEvents = 'none';
          detailBoxVisible = false;
        }
        
        // ============ 事件处理 ============
        
        // 鼠标移动事件
        function handleMouseMove(e) {
          // 忽略我们自己创建的元素
          if (e.target.id && e.target.id.startsWith('__nimbria')) return;
          
          // 更新进度球位置（跟随光标）
          updateProgressBallPosition(e.clientX, e.clientY);
          
          const dx = e.clientX - lastMouseX;
          const dy = e.clientY - lastMouseY;
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
          
          // 导航模式下不响应鼠标移动
          if (navigationMode) return;
          
          // 检测鼠标是否在详细框内
          if (detailBoxVisible) {
            const detailRect = detailBox.getBoundingClientRect();
            const inDetailBox = e.clientX >= detailRect.left && 
                              e.clientX <= detailRect.right &&
                              e.clientY >= detailRect.top && 
                              e.clientY <= detailRect.bottom;
            
            if (inDetailBox) {
              // 鼠标在详细框内，保持显示
              return;
            }
            
            // 检测是否在向详细框移动
            const currentRect = currentElement.getBoundingClientRect();
            const distToDetail = Math.min(
              Math.abs(e.clientX - detailRect.left),
              Math.abs(e.clientX - detailRect.right),
              Math.abs(e.clientY - detailRect.top),
              Math.abs(e.clientY - detailRect.bottom)
            );
            
            // 如果距离详细框很近且在移动，保持显示
            if (distToDetail < 50) {
              return;
            }
          }
          
          // 切换到新元素
          if (e.target !== currentElement) {
            currentElement = e.target;
            cachedElementInfo = null; // 🔥 清空缓存，等待新元素的详细框显示
            updateOverlayPosition(currentElement);
            hideDetailBox();
            startHoverTimer();
          }
        }
        
        // 键盘事件
        function handleKeyDown(e) {
          if (!currentElement) return;
          
          // 上键 - 选择父元素
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentElement.parentElement && currentElement.parentElement !== document.body) {
              currentElement = currentElement.parentElement;
              updateOverlayPosition(currentElement);
              updateDetailBox(currentElement);
              navigationMode = true;
              clearHoverTimer();
              showDetailBox();
            }
          }
          
          // 下键 - 选择第一个子元素
          else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentElement.children.length > 0) {
              currentElement = currentElement.children[0];
              updateOverlayPosition(currentElement);
              updateDetailBox(currentElement);
              navigationMode = true;
              clearHoverTimer();
              showDetailBox();
            }
          }
          
          // Enter - 确认选择（使用缓存的选择器）
          else if (e.key === 'Enter') {
            e.preventDefault();
            console.log('[ElementPicker] ⌨️ Enter key pressed, confirming selection...');
            confirmSelection();
          }
          
          // Esc - 退出选取器
          else if (e.key === 'Escape') {
            e.preventDefault();
            console.log('[ElementPicker] ⌨️ Escape key pressed, destroying picker...');
            console.log('[ElementPicker] 🔍 tabId:', '${tabId}');
            
            // 🔥 先派发取消事件（必须在destroy之前！）
            console.log('[ElementPicker] 📄 Dispatching cancel event with tabId: ${tabId}');
            document.dispatchEvent(new CustomEvent('__nimbria-picker-cancelled', {
              detail: { tabId: '${tabId}', reason: 'escape' }
            }));
            console.log('[ElementPicker] ✅ Cancel event dispatched');
            
            // 然后销毁选取器
            if (window.__nimbriaElementPicker) {
              window.__nimbriaElementPicker.destroy();
              delete window.__nimbriaElementPicker;
            }
            
            console.log('[ElementPicker] 🎉 Picker fully destroyed');
          }
        }
        
        // 点击事件（简化：直接调用 confirmSelection）
        function handleClick(e) {
          console.log('[ElementPicker] 🖱️ Click event fired!', {
            target: e.target,
            currentElement: currentElement,
            navigationMode: navigationMode
          });
          
          e.preventDefault();
          e.stopPropagation();
          
          // 🔥 直接调用 confirmSelection（统一处理逻辑）
          confirmSelection();
        }
        
        // 监听取消事件（用于 Esc 键）
        document.addEventListener('__nimbria-picker-cancelled', (e) => {
          console.log('[ElementPicker] 📥 Cancel event received!', e.detail);
          console.log('__NIMBRIA_PICKER_CANCELLED__ ' + JSON.stringify(e.detail));
        });
        
        // ============ 绑定事件 ============
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown, true);
        
        // ============ 清理函数 ============
        window.__nimbriaElementPicker = {
          destroy: function() {
            clearHoverTimer();
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeyDown, true);
            
            if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
            if (progressBall.parentElement) progressBall.parentElement.removeChild(progressBall);
            if (detailBox.parentElement) detailBox.parentElement.removeChild(detailBox);
            
            console.log('[ElementPicker] Enhanced picker destroyed');
          }
        };
        
        console.log('[ElementPicker] Enhanced picker initialized successfully');
        console.log('[ElementPicker] 💡 使用 ↑↓ 键导航元素层级, Enter 确认选择, Esc 退出');
      })();
    `
  }
  
  /**
   * 🔍 注入缩放控制脚本
   */
  private injectZoomControlScript(tabId: string, window: BrowserWindow): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      return
    }
    
    const zoomScript = `
      (function() {
        if (window.__nimbriaZoomControl) {
          return; // 已注入，避免重复
        }
        
        let currentZoom = 1.0;
        
        // 监听 Ctrl+滚轮事件
        window.addEventListener('wheel', function(e) {
          if (e.ctrlKey) {
            e.preventDefault();
            
            // 计算缩放增量
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            
            // 通过 console 发送缩放请求
            console.log('__NIMBRIA_ZOOM_REQUEST__', JSON.stringify({
              tabId: '${tabId}',
              delta: delta
            }));
          }
        }, { passive: false });
        
        window.__nimbriaZoomControl = true;
        console.log('[ZoomControl] Initialized for tab ${tabId}');
      })();
    `
    
    instance.view.webContents.executeJavaScript(zoomScript)
      .then(() => {
        console.log(`[BrowserViewManager] Zoom control script injected for ${tabId}`)
      })
      .catch(error => {
        console.error(`[BrowserViewManager] Failed to inject zoom control script:`, error)
      })
  }
  
  // ==================== 🚀 轻量模式爬取 ====================
  
  /**
   * 学习内容选择器
   * 在 BrowserView 中加载页面，然后使用 cheerio 分析 HTML
   */
  public async learnContentSelector(tabId: string, url: string): Promise<string | null> {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`[BrowserViewManager] Tab ${tabId} not found`)
    }
    
    try {
      console.log(`[BrowserViewManager] Learning selector from: ${url}`)
      
      // 🔥 学习选择器时，先隐藏 BrowserView，避免用户看到跳转
      const wasVisible = instance.isVisible
      const window = BrowserWindow.fromId(instance.windowId)
      
      if (wasVisible && window) {
        // 保存当前 bounds，以便恢复
        const currentBounds = instance.view.getBounds()
        // 🔥 设置 bounds 为零，视觉上隐藏
        instance.view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        instance.isVisible = false
        console.log(`[BrowserViewManager] Temporarily hidden view for selector learning`)
        // 保存 bounds 用于恢复
        ;(instance as any).__savedBounds = currentBounds
      }
      
      // 在 BrowserView 中加载页面
      await instance.view.webContents.loadURL(url)
      
      // 等待 DOM 准备完成
      await new Promise<void>((resolve) => {
        instance.view.webContents.once('dom-ready', () => resolve())
        // 超时保护
        setTimeout(() => resolve(), 5000)
      })
      
      // 获取页面 HTML
      const html = await instance.view.webContents.executeJavaScript(
        'document.documentElement.outerHTML'
      )
      
      // 使用 cheerio 学习选择器
      const selector = await this.lightScraper.learnSelector(html)
      
      // 🔥 学习完成后，恢复 BrowserView 的显示状态
      if (wasVisible && window) {
        const savedBounds = (instance as any).__savedBounds
        if (savedBounds) {
          instance.view.setBounds(savedBounds)
          instance.isVisible = true
          delete (instance as any).__savedBounds
          console.log(`[BrowserViewManager] Restored view visibility`)
        }
      }
      
      if (selector) {
        console.log(`[BrowserViewManager] Successfully learned selector: ${selector}`)
      } else {
        console.warn(`[BrowserViewManager] Failed to learn selector from ${url}`)
      }
      
      return selector
      
    } catch (error) {
      console.error('[BrowserViewManager] Learn selector failed:', error)
      
      // 🔥 出错时也要恢复显示状态
      if (wasVisible && window) {
        const savedBounds = (instance as any).__savedBounds
        if (savedBounds) {
          instance.view.setBounds(savedBounds)
          instance.isVisible = true
          delete (instance as any).__savedBounds
          console.log(`[BrowserViewManager] Restored view visibility after error`)
        }
      }
      
      return null
    }
  }
  
  /**
   * 轻量模式爬取章节
   * 使用并行请求 + cheerio 解析
   */
  public async scrapeChaptersLight(
    chapters: ChapterData[],
    options: LightScrapeOptions,
    onProgress?: (current: number, total: number, currentChapter: string) => void
  ): Promise<{ success: boolean; results: ScrapeResult[]; successCount: number }> {
    try {
      console.log(`[BrowserViewManager] Starting light mode scrape: ${chapters.length} chapters`)
      console.log(`[BrowserViewManager] Options:`, {
        selector: options.selector,
        parallelCount: options.parallelCount,
        timeout: options.timeout
      })
      
      const results = await this.lightScraper.scrapeChapters(chapters, options, onProgress)
      
      const successCount = results.filter(r => r.success).length
      
      console.log(`[BrowserViewManager] Light mode scrape completed: ${successCount}/${chapters.length} successful`)
      
      return {
        success: true,
        results,
        successCount
      }
      
    } catch (error) {
      console.error('[BrowserViewManager] Light scrape failed:', error)
      return {
        success: false,
        results: [],
        successCount: 0
      }
    }
  }
}

