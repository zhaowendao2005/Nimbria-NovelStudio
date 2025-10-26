/**
 * SearchAndScraper 存储服务
 * 职责：封装数据存储逻辑，与爬取管线解耦
 * 用途：不同的爬取方式（Browser模式、轻量模式、未来的其他模式）都调用此服务存储数据
 */

import type { 
  NovelScrapedChapterRow,
  NovelScrapedChapter,
  NovelBatchSummary,
  mapScrapedChapterRowToChapter
} from './types/database'

/**
 * 存储服务：爬取章节数据
 */
export class ScraperStorageService {
  /**
   * 保存爬取的章节到数据库
   * @param projectPath 项目路径
   * @param data 章节数据
   * @returns 是否成功
   */
  static async saveScrapedChapter(
    projectPath: string,
    data: {
      matchedChapterId: string
      batchId: string
      title: string
      url: string
      content: string
      summary: string
      scrapeDuration: number
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!window.nimbria?.database) {
      return { success: false, error: 'Database API not available' }
    }

    try {
      const result = await window.nimbria.database.searchScraperSaveScrapedChapter({
        projectPath,
        data
      })
      
      return result as { success: boolean; error?: string }
    } catch (error) {
      console.error('[ScraperStorageService] 保存章节失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * 批量保存爬取的章节（适用于轻量模式的批量爬取）
   * @param projectPath 项目路径
   * @param chapters 章节数组
   * @returns 成功保存的数量和失败列表
   */
  static async batchSaveScrapedChapters(
    projectPath: string,
    chapters: Array<{
      matchedChapterId: string
      batchId: string
      title: string
      url: string
      content: string
      summary: string
      scrapeDuration: number
    }>
  ): Promise<{
    successCount: number
    failedChapters: Array<{ title: string; error: string }>
  }> {
    let successCount = 0
    const failedChapters: Array<{ title: string; error: string }> = []

    for (const chapter of chapters) {
      const result = await this.saveScrapedChapter(projectPath, chapter)
      if (result.success) {
        successCount++
      } else {
        failedChapters.push({
          title: chapter.title,
          error: result.error || 'Unknown error'
        })
      }
    }

    return { successCount, failedChapters }
  }

  /**
   * 获取批次的已爬取章节
   * @param projectPath 项目路径
   * @param batchId 批次ID
   * @returns 爬取章节列表
   */
  static async getScrapedChapters(
    projectPath: string,
    batchId: string
  ): Promise<{ 
    success: boolean
    chapters?: NovelScrapedChapterRow[]
    error?: string 
  }> {
    if (!window.nimbria?.database) {
      return { success: false, error: 'Database API not available' }
    }

    try {
      const result = await window.nimbria.database.searchScraperGetScrapedChapters({
        projectPath,
        batchId
      })
      
      return result as { 
        success: boolean
        chapters?: NovelScrapedChapterRow[]
        error?: string 
      }
    } catch (error) {
      console.error('[ScraperStorageService] 获取章节列表失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * 获取批次统计摘要
   * @param projectPath 项目路径
   * @param batchId 批次ID
   * @returns 统计摘要
   */
  static async getBatchSummary(
    projectPath: string,
    batchId: string
  ): Promise<{ 
    success: boolean
    summary?: NovelBatchSummary
    error?: string 
  }> {
    if (!window.nimbria?.database) {
      return { success: false, error: 'Database API not available' }
    }

    try {
      const result = await window.nimbria.database.searchScraperGetBatchSummary({
        projectPath,
        batchId
      })
      
      return result as { 
        success: boolean
        summary?: NovelBatchSummary
        error?: string 
      }
    } catch (error) {
      console.error('[ScraperStorageService] 获取批次摘要失败:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    }
  }

  /**
   * 生成章节摘要（从内容中提取前200字）
   * @param content 章节内容
   * @returns 摘要文本
   */
  static generateSummary(content: string): string {
    const cleanContent = content.replace(/\s+/g, ' ').trim()
    return cleanContent.length > 200 
      ? cleanContent.slice(0, 200) + '...' 
      : cleanContent
  }
}

