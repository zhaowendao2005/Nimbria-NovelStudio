/**
 * Markdown 保存队列管理器
 * 管理文件保存任务，避免并发写入冲突，支持任务合并
 */

import type { SaveTask, SaveResult } from './types'
import { MarkdownWriter } from './markdown-writer'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('MarkdownSaveQueue')

export class MarkdownSaveQueue {
  private queue = new Map<string, SaveTask>()
  private processing = new Set<string>()
  private writer: MarkdownWriter

  constructor() {
    this.writer = new MarkdownWriter()
  }

  /**
   * 将保存任务加入队列
   */
  async enqueue(task: SaveTask): Promise<SaveResult> {
    const { filePath } = task

    logger.debug(`Enqueue task: ${filePath}`)

    // 检查是否正在处理同一文件
    if (this.processing.has(filePath)) {
      // 合并任务（使用最新内容）
      logger.debug(`Merging task for: ${filePath}`)
      this.queue.set(filePath, task)
      return { success: true, queued: true }
    }

    // 标记为正在处理
    this.processing.add(filePath)

    try {
      // 执行保存任务
      const result = await this.processTask(task)
      return result
    } finally {
      // 处理完成，移除标记
      this.processing.delete(filePath)

      // 检查是否有合并的任务需要处理
      if (this.queue.has(filePath)) {
        const nextTask = this.queue.get(filePath)!
        this.queue.delete(filePath)
        
        logger.debug(`Processing merged task for: ${filePath}`)
        
        // 异步处理下一个任务，不阻塞当前返回
        this.enqueue(nextTask).catch((error) => {
          logger.error(`Failed to process merged task: ${filePath}`, error)
        })
      }
    }
  }

  /**
   * 处理单个保存任务
   */
  private async processTask(task: SaveTask): Promise<SaveResult> {
    try {
      logger.info(`Processing save task: ${task.filePath}`)

      const result = await this.writer.writeMarkdownFile(
        task.filePath,
        task.content,
        {
          createBackup: task.createBackup,
          verifyWrite: true
        }
      )

      if (result.success) {
        logger.info(`Save task completed: ${task.filePath}`)
        return { success: true }
      } else {
        logger.error(`Save task failed: ${task.filePath}`, result.error)
        return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      logger.error(`Failed to process task: ${task.filePath}`, error)
      return {
        success: false,
        error: String(error)
      }
    }
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    queuedCount: number
    processingCount: number
    queuedFiles: string[]
    processingFiles: string[]
  } {
    return {
      queuedCount: this.queue.size,
      processingCount: this.processing.size,
      queuedFiles: Array.from(this.queue.keys()),
      processingFiles: Array.from(this.processing)
    }
  }

  /**
   * 等待队列清空
   */
  async waitUntilEmpty(timeout = 30000): Promise<boolean> {
    const startTime = Date.now()

    while (this.processing.size > 0 || this.queue.size > 0) {
      if (Date.now() - startTime > timeout) {
        logger.warn('Wait timeout: queue not empty')
        return false
      }

      // 等待 100ms 后再检查
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    logger.info('Queue is empty')
    return true
  }

  /**
   * 清空队列（不影响正在处理的任务）
   */
  clearQueue(): void {
    logger.info(`Clearing queue: ${this.queue.size} tasks removed`)
    this.queue.clear()
  }
}

