/**
 * Markdown Service 导出模块
 * 统一管理所有 Markdown 相关服务
 */

export * from './types'
export * from './markdown-scanner'
export * from './markdown-reader'
export * from './markdown-writer'
export * from './markdown-queue'
export * from './markdown-backup'

import { MarkdownScanner } from './markdown-scanner'
import { MarkdownReader } from './markdown-reader'
import { MarkdownWriter } from './markdown-writer'
import { MarkdownSaveQueue } from './markdown-queue'
import { MarkdownBackup } from './markdown-backup'

/**
 * Markdown Service 单例
 * 提供统一的 Markdown 文件操作接口
 */
export class MarkdownService {
  private static instance: MarkdownService

  public scanner: MarkdownScanner
  public reader: MarkdownReader
  public writer: MarkdownWriter
  public saveQueue: MarkdownSaveQueue
  public backup: MarkdownBackup

  private constructor() {
    this.scanner = new MarkdownScanner()
    this.reader = new MarkdownReader()
    this.writer = new MarkdownWriter()
    this.saveQueue = new MarkdownSaveQueue()
    this.backup = new MarkdownBackup()
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): MarkdownService {
    if (!MarkdownService.instance) {
      MarkdownService.instance = new MarkdownService()
    }
    return MarkdownService.instance
  }

  /**
   * 等待所有保存任务完成
   */
  async waitForSaveCompletion(timeout?: number): Promise<boolean> {
    return this.saveQueue.waitUntilEmpty(timeout)
  }

  /**
   * 获取保存队列状态
   */
  getSaveQueueStatus() {
    return this.saveQueue.getStatus()
  }
}

/**
 * 导出单例实例
 */
export const markdownService = MarkdownService.getInstance()

