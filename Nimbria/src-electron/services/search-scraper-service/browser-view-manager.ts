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
      if (message.startsWith('__NIMBRIA_ELEMENT_SELECTED__')) {
        try {
          const jsonStr = message.replace('__NIMBRIA_ELEMENT_SELECTED__', '').trim()
          const data = JSON.parse(jsonStr)
          // 发送到渲染进程
          window.webContents.send('search-scraper:element-selected', data)
          console.log(`[BrowserViewManager] Element selected event sent:`, data)
        } catch (error) {
          console.error(`[BrowserViewManager] Failed to parse element selection data:`, error)
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
  public startElementPicker(tabId: string, window: BrowserWindow): void {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    // 注入元素选取脚本
    const pickerScript = this.getElementPickerScript(tabId, window)
    instance.view.webContents.executeJavaScript(pickerScript)
      .then(() => {
        console.log(`[BrowserViewManager] Element picker started for ${tabId}`)
      })
      .catch(error => {
        console.error(`[BrowserViewManager] Failed to inject picker script:`, error)
      })
  }
  
  /**
   * 停止元素选取模式
   */
  public stopElementPicker(tabId: string, _window: BrowserWindow): void {
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
  }
  
  /**
   * 智能提取章节列表
   */
  public async intelligentExtractChapters(tabId: string): Promise<Array<{ title: string; url: string }>> {
    const instance = this.views.get(tabId)
    if (!instance) {
      throw new Error(`View ${tabId} not found`)
    }
    
    try {
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
  private getElementPickerScript(tabId: string, window: BrowserWindow): string {
    return `
      (function() {
        // 防止重复注入
        if (window.__nimbriaElementPicker) {
          console.log('[ElementPicker] Already initialized');
          return;
        }
        
        console.log('[ElementPicker] Initializing...');
        
        // 创建高亮overlay
        const overlay = document.createElement('div');
        overlay.id = '__nimbria-picker-overlay';
        overlay.style.cssText = \`
          position: absolute;
          pointer-events: none;
          border: 2px solid #409EFF;
          background: rgba(64, 158, 255, 0.1);
          z-index: 999999;
          transition: all 0.1s ease;
        \`;
        document.body.appendChild(overlay);
        
        // 当前高亮的元素
        let currentElement = null;
        
        // 生成CSS选择器路径
        function getSelector(element) {
          if (element.id) return '#' + element.id;
          
          let path = [];
          while (element.parentElement) {
            let selector = element.tagName.toLowerCase();
            if (element.className) {
              const classes = Array.from(element.classList).filter(c => !c.startsWith('__nimbria'));
              if (classes.length > 0) {
                selector += '.' + classes.join('.');
              }
            }
            
            // 添加nth-child
            let sibling = element;
            let nth = 1;
            while (sibling.previousElementSibling) {
              sibling = sibling.previousElementSibling;
              if (sibling.tagName === element.tagName) nth++;
            }
            if (nth > 1 || element.nextElementSibling) {
              selector += \`:nth-child(\${nth})\`;
            }
            
            path.unshift(selector);
            element = element.parentElement;
            
            // 限制路径长度
            if (path.length >= 6) break;
          }
          
          return path.join(' > ');
        }
        
        // 生成XPath
        function getXPath(element) {
          if (element.id) return '//*[@id="' + element.id + '"]';
          
          const parts = [];
          while (element && element.nodeType === Node.ELEMENT_NODE) {
            let index = 0;
            let sibling = element.previousSibling;
            while (sibling) {
              if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
                index++;
              }
              sibling = sibling.previousSibling;
            }
            
            const tagName = element.nodeName.toLowerCase();
            const pathIndex = index ? \`[\${index + 1}]\` : '';
            parts.unshift(tagName + pathIndex);
            element = element.parentNode;
          }
          
          return parts.length ? '/' + parts.join('/') : '';
        }
        
        // 鼠标移动事件
        function handleMouseMove(e) {
          const element = e.target;
          if (element.id === '__nimbria-picker-overlay') return;
          
          currentElement = element;
          const rect = element.getBoundingClientRect();
          
          overlay.style.left = (rect.left + window.scrollX) + 'px';
          overlay.style.top = (rect.top + window.scrollY) + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';
        }
        
        // 点击事件
        function handleClick(e) {
          e.preventDefault();
          e.stopPropagation();
          
          if (!currentElement || currentElement.id === '__nimbria-picker-overlay') return;
          
          const elementInfo = {
            selector: getSelector(currentElement),
            tagName: currentElement.tagName.toLowerCase(),
            id: currentElement.id || undefined,
            classList: currentElement.className ? Array.from(currentElement.classList).filter(c => !c.startsWith('__nimbria')) : undefined,
            textContent: currentElement.textContent?.substring(0, 100) || undefined,
            xpath: getXPath(currentElement),
            timestamp: Date.now()
          };
          
          console.log('[ElementPicker] Element selected:', elementInfo);
          
          // 发送到主进程（通过自定义事件）
          document.dispatchEvent(new CustomEvent('__nimbria-element-selected', {
            detail: { tabId: '${tabId}', element: elementInfo }
          }));
        }
        
        // 监听自定义事件并通过console发送数据
        document.addEventListener('__nimbria-element-selected', (e) => {
          // 通过console.log传递数据到主进程
          console.log('__NIMBRIA_ELEMENT_SELECTED__', JSON.stringify(e.detail));
        });
        
        // 绑定事件
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('click', handleClick, true);
        
        // 清理函数
        window.__nimbriaElementPicker = {
          destroy: function() {
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('click', handleClick, true);
            if (overlay.parentElement) {
              overlay.parentElement.removeChild(overlay);
            }
            console.log('[ElementPicker] Destroyed');
          }
        };
        
        console.log('[ElementPicker] Initialized successfully');
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
}

