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

export class GetTextExecutor implements NodeExecutor {
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
          // TODO: Puppeteer实现
          throw new Error('Puppeteer engine not implemented yet')
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
}

