/**
 * 导出服务 - 负责导出批次结果
 * 
 * 支持格式：
 * - TXT: 纯文本格式
 * - CSV: Excel 可读的 CSV 格式
 * - JSON: 结构化数据格式
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { LlmTranslateService } from './llm-translate-service'
import type { ExportOptions, ExportStartEvent, ExportCompleteEvent, ExportErrorEvent, Task } from './types'

export class ExportService {
  private llmTranslateService: LlmTranslateService

  constructor(llmTranslateService: LlmTranslateService) {
    this.llmTranslateService = llmTranslateService
  }

  /**
   * 导出批次结果
   */
  async export(exportId: string, batchId: string, options: ExportOptions): Promise<void> {
    try {
      // 获取批次信息
      const batch = await this.llmTranslateService.getBatch(batchId)
      if (!batch) {
        throw new Error(`Batch ${batchId} not found`)
      }

      // 获取任务列表
      const taskListResponse = await this.llmTranslateService.getTasks(batchId)
      let tasks = taskListResponse.tasks

      // 根据选项过滤任务
      tasks = tasks.filter(task => {
        if (task.status === 'completed') return true
        if (task.status === 'error' && options.includeFailed) return true
        if (task.status === 'unsent' && options.includeUnsent) return true
        return false
      })

      // 发射开始事件
      this.llmTranslateService.emit('export:start', {
        exportId,
        batchId,
        format: options.format,
        taskCount: tasks.length
      } as ExportStartEvent)

      // 生成文件内容
      let content: string
      let fileExt: string

      switch (options.format) {
        case 'txt':
          content = this.generateTxt(tasks)
          fileExt = 'txt'
          break
        case 'csv':
          content = this.generateCsv(tasks)
          fileExt = 'csv'
          break
        case 'json':
          content = this.generateJson(tasks, batch, options.includeStats, options.includeMetadata)
          fileExt = 'json'
          break
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }

      // 生成文件路径
      const fileName = options.fileName || `${batchId}_${Date.now()}.${fileExt}`
      const filePath = path.join(options.outputDir, fileName)

      // 写入文件
      await fs.writeFile(filePath, content, 'utf-8')
      const stats = await fs.stat(filePath)

      // 发射完成事件
      this.llmTranslateService.emit('export:complete', {
        exportId,
        filePath,
        fileSize: stats.size
      } as ExportCompleteEvent)

      console.log(`✅ [ExportService] 导出完成: ${filePath}`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [ExportService] 导出失败:`, errorMessage)
      
      this.llmTranslateService.emit('export:error', {
        exportId,
        error: errorMessage
      } as ExportErrorEvent)
    }
  }

  /**
   * 生成 TXT 格式
   */
  private generateTxt(tasks: Task[]): string {
    const lines: string[] = []
    
    for (const task of tasks) {
      lines.push(`========== Task ${task.id} ==========`)
      lines.push('原文：')
      lines.push(task.content)
      lines.push('')
      lines.push('译文：')
      lines.push(task.translation || '[未翻译]')
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 生成 CSV 格式
   */
  private generateCsv(tasks: Task[]): string {
    const lines: string[] = []
    
    // CSV 头部
    lines.push('任务ID,状态,原文,译文,输入Token,输出Token,耗时(ms),成本,重试次数')

    for (const task of tasks) {
      const row = [
        task.id,
        task.status,
        this.escapeCsv(task.content),
        this.escapeCsv(task.translation || ''),
        task.inputTokens.toString(),
        task.replyTokens.toString(),
        (task.durationMs || 0).toString(),
        task.cost.toFixed(4),
        task.retryCount.toString()
      ]
      lines.push(row.join(','))
    }

    return lines.join('\n')
  }

  /**
   * 生成 JSON 格式
   */
  private generateJson(
    tasks: Task[],
    batch: { id: string; status: string; totalTasks: number; completedTasks: number },
    includeStats: boolean,
    includeMetadata: boolean
  ): string {
    const data: Record<string, unknown> = {
      batchId: batch.id,
      batchStatus: batch.status,
      exportTime: new Date().toISOString(),
      totalTasks: batch.totalTasks,
      completedTasks: batch.completedTasks,
      tasks: tasks.map(task => ({
        id: task.id,
        status: task.status,
        content: task.content,
        translation: task.translation,
        inputTokens: task.inputTokens,
        replyTokens: task.replyTokens,
        progress: task.progress,
        durationMs: task.durationMs,
        cost: task.cost,
        ...(includeMetadata && { 
          sentTime: task.sentTime,
          replyTime: task.replyTime,
          retryCount: task.retryCount,
          errorMessage: task.errorMessage,
          errorType: task.errorType
        })
      }))
    }

    if (includeStats) {
      const completedTasks = tasks.filter(t => t.status === 'completed')
      const totalCost = tasks.reduce((sum, t) => sum + t.cost, 0)
      const avgDuration = completedTasks.length > 0
        ? completedTasks.reduce((sum, t) => sum + (t.durationMs || 0), 0) / completedTasks.length
        : 0

      data.stats = {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        failedTasks: tasks.filter(t => t.status === 'error').length,
        totalCost,
        averageDuration: avgDuration
      }
    }

    return JSON.stringify(data, null, 2)
  }

  /**
   * CSV 转义
   */
  private escapeCsv(text: string): string {
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }
}

