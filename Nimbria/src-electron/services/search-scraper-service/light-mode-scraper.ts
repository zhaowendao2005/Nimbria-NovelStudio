import axios, { type AxiosInstance } from 'axios'
import { load } from 'cheerio'
import pLimit from 'p-limit'

/**
 * 爬取选项
 */
export interface LightScrapeOptions {
  /** 内容选择器 */
  selector: string
  /** 并行数 */
  parallelCount: number
  /** 请求超时（毫秒） */
  timeout: number
  /** URL 前缀 */
  urlPrefix?: string
  /** 自定义 Headers */
  headers?: Record<string, string>
}

/**
 * 章节数据（简化版）
 */
export interface ChapterData {
  title: string
  url: string
}

/**
 * 爬取结果
 */
export interface ScrapeResult {
  success: boolean
  chapter: ChapterData
  content?: string
  error?: string
}

/**
 * 轻量模式爬虫
 * 使用 cheerio + axios 进行并行爬取
 */
export class LightModeScraper {
  private axiosInstance: AxiosInstance
  
  constructor() {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
  }
  
  /**
   * 并行爬取多个章节
   */
  public async scrapeChapters(
    chapters: ChapterData[],
    options: LightScrapeOptions,
    onProgress?: (current: number, total: number, currentChapter: string) => void
  ): Promise<ScrapeResult[]> {
    const limit = pLimit(options.parallelCount)
    let completedCount = 0
    
    const tasks = chapters.map((chapter, index) =>
      limit(async () => {
        const result = await this.scrapeChapter(chapter, options)
        completedCount++
        
        // 报告进度
        if (onProgress) {
          onProgress(completedCount, chapters.length, chapter.title)
        }
        
        return result
      })
    )
    
    return await Promise.all(tasks)
  }
  
  /**
   * 爬取单个章节
   */
  private async scrapeChapter(
    chapter: ChapterData,
    options: LightScrapeOptions
  ): Promise<ScrapeResult> {
    try {
      // 构建完整 URL
      const fullUrl = options.urlPrefix 
        ? `${options.urlPrefix}${chapter.url}` 
        : chapter.url
      
      console.log(`[LightScraper] 开始爬取: ${chapter.title} - ${fullUrl}`)
      
      // 发送 HTTP 请求
      const response = await this.axiosInstance.get(fullUrl, {
        timeout: options.timeout,
        headers: options.headers
      })
      
      // 使用 cheerio 解析 HTML
      const $ = load(response.data)
      
      // 提取内容
      const content = $(options.selector).text().trim()
      
      if (!content) {
        console.warn(`[LightScraper] 选择器未匹配到内容: ${chapter.title}`)
        return {
          success: false,
          chapter,
          error: '选择器未匹配到内容'
        }
      }
      
      console.log(`[LightScraper] 成功爬取: ${chapter.title} (${content.length} 字符)`)
      
      return {
        success: true,
        chapter,
        content
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      console.error(`[LightScraper] 爬取失败: ${chapter.title}`, errorMessage)
      return {
        success: false,
        chapter,
        error: errorMessage
      }
    }
  }
  
  /**
   * 学习内容选择器（使用 BrowserView 加载的 HTML）
   * 
   * 策略：
   * 1. 优先匹配常见的小说内容容器
   * 2. 查找文本最多的 div 元素
   */
  public async learnSelector(html: string): Promise<string | null> {
    const $ = load(html)
    
    // 策略1: 查找常见的小说内容容器
    const commonSelectors = [
      '#content',
      '.content',
      '#chaptercontent',
      '.chapter-content',
      '.novel-content',
      '.article-content',
      'article',
      '.text-content',
      '#txt',
      '.txt',
      '#bookcontent',
      '.book-content'
    ]
    
    for (const selector of commonSelectors) {
      const element = $(selector)
      if (element.length > 0) {
        const text = element.text().trim()
        // 确保元素有足够的文本内容（至少100字符）
        if (text.length > 100) {
          console.log(`[LightScraper] 学习到选择器: ${selector} (${text.length} 字符)`)
          return selector
        }
      }
    }
    
    console.log('[LightScraper] 常见选择器未匹配，尝试分析页面结构...')
    
    // 策略2: 查找文本最多的 div
    let maxTextLength = 0
    let bestSelector: string | null = null
    let bestElement: cheerio.Cheerio | null = null
    
    $('div').each((_, elem) => {
      const $elem = $(elem)
      // 只计算直接文本内容，避免包含子元素的累加
      const directText = $elem.clone().children().remove().end().text().trim()
      const totalText = $elem.text().trim()
      
      // 要求有足够的直接文本或总文本
      if (totalText.length > maxTextLength && totalText.length > 100) {
        maxTextLength = totalText.length
        bestElement = $elem
      }
    })
    
    // 尝试为最佳元素生成选择器
    if (bestElement) {
      const id = bestElement.attr('id')
      const className = bestElement.attr('class')
      
      if (id) {
        bestSelector = `#${id}`
      } else if (className) {
        const firstClass = className.split(' ')[0]
        bestSelector = `.${firstClass}`
      } else {
        // 如果没有 id 和 class，尝试使用标签名 + 索引
        const tagName = bestElement.prop('tagName')?.toLowerCase()
        if (tagName) {
          bestSelector = tagName
        }
      }
      
      if (bestSelector) {
        console.log(`[LightScraper] 通过分析学习到选择器: ${bestSelector} (${maxTextLength} 字符)`)
      }
    }
    
    if (!bestSelector) {
      console.warn('[LightScraper] 无法学习到合适的选择器')
    }
    
    return bestSelector
  }
}

