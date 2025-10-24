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
    
    // 监听console消息（用于接收元素选取信息）
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
}

