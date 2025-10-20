/**
 * LLM 翻译主服务类 - Electron 主进程本地服务
 * 
 * 架构职责：
 * - 管理批次和任务的生命周期
 * - 与 SQLite 数据库交互（本地存储）
 * - 集成 LlmChatService 进行翻译（本地LLM调用）
 * - 通过事件驱动向 IPC 层广播进度反馈
 * 
 * ⚠️ 运行在 Electron 主进程，与渲染进程通过 IPC 通信
 * ⚠️ 无网络请求，无后端服务器依赖
 */

import { EventEmitter } from 'events'
import { nanoid } from 'nanoid'
import type { ProjectDatabase } from '../database-service/project-database'
import type { LlmChatService } from '../llm-chat-service/llm-chat-service'
import { TranslationExecutor } from './translation-executor'
import { ExportService } from './export-service'

// 从新的类型系统导入
import type {
  // 前端类型（通过别名导入）
  TranslateConfig,
  ChunkStrategy,
  ExportConfig,
  // 后端类型
  BackendBatch,
  BackendTask,
  BackendBatchStatus,
  BackendTaskStatus,
  BatchListResponse,
  TaskListResponse,
  BatchCreateStartEvent,
  BatchCreatedEvent,
  BatchCreateErrorEvent,
  TaskSubmitStartEvent,
  BatchPauseEvent,
  BatchResumeEvent
} from '../../types/LlmTranslate'

export class LlmTranslateService extends EventEmitter {
  private projectDatabase: ProjectDatabase | null = null
  private llmChatService: LlmChatService
  private translationExecutor: TranslationExecutor
  private exportService: ExportService
  private activeBatches: Map<string, BackendBatch> = new Map()

  constructor(llmChatService: LlmChatService) {
    super()
    this.llmChatService = llmChatService
    this.translationExecutor = new TranslationExecutor(this, llmChatService)
    this.exportService = new ExportService(this)
  }

  /**
   * 初始化服务（设置项目数据库）
   */
  async initialize(projectPath: string, projectDatabase: ProjectDatabase): Promise<void> {
    console.log('🚀 [LlmTranslateService] 初始化服务...')
    this.projectDatabase = projectDatabase
    
    // 从数据库加载所有批次
    await this.loadBatches()
    
    // 检查程序中断的任务，标记为 terminated
    await this.handleTerminatedTasks()
    
    console.log('✅ [LlmTranslateService] 服务初始化完成')
  }

  /**
   * 处理因程序终止而中断的任务
   * 将所有 status = 'waiting' 的任务标记为 'terminated'
   */
  private async handleTerminatedTasks(): Promise<void> {
    if (!this.projectDatabase) return

    // 先查询所有waiting的任务
    const waitingTasks = this.projectDatabase.query(
      `SELECT * FROM Llmtranslate_tasks WHERE status = 'waiting'`
    ) as BackendTask[]

    if (waitingTasks.length > 0) {
      console.log(`⚠️ [LlmTranslateService] 发现 ${waitingTasks.length} 个中断任务，已标记为 terminated`)
      
      // 更新状态
      this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = 'terminated', 
             error_type = 'terminated',
             error_message = '程序异常终止，任务未完成',
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'waiting'`
      )
      
      // 更新批次统计
      const batchIds = new Set(waitingTasks.map(t => t.batchId))
      for (const batchId of batchIds) {
        await this.updateBatchStats(batchId)
      }
    }
  }

  /**
   * 创建新批次
   * 立即返回 batchId，通过事件反馈创建进度
   */
  async createBatch(config: TranslateConfig, content: string): Promise<string> {
    const batchId = `#${Date.now().toString().slice(-8)}`
    
    // ✅ 立即发射开始事件
    this.emit('batch:create-start', {
      batchId,
      totalTasks: 0  // 尚未分片，先为 0
    } as BatchCreateStartEvent)
    
    // ✅ 异步处理，不阻塞返回
    this.createBatchAsync(batchId, config, content)
    
    return batchId
  }

  /**
   * 异步创建批次（分片、入库）
   */
  private async createBatchAsync(
    batchId: string,
    config: TranslateConfig,
    content: string
  ): Promise<void> {
    try {
      if (!this.projectDatabase) {
        throw new Error('Project database not initialized')
      }

      // 1. 根据分片策略分割内容（适配新的分片大小结构）
      const chunks = this.chunkContent(content, config.chunkStrategy, config)
      const totalTasks = chunks.length

      console.log(`📦 [LlmTranslateService] 批次 ${batchId} - 分割为 ${totalTasks} 个任务`)

      // 2. 创建批次记录
      const batch: BackendBatch = {
        id: batchId,
        status: 'running',
        configJson: JSON.stringify(config),
        totalTasks,
        completedTasks: 0,
        failedTasks: 0,
        throttledTasks: 0,
        waitingTasks: 0,
        unsentTasks: totalTasks,
        terminatedTasks: 0,
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgTimePerTask: 0,
        fastestTaskTime: 0,
        slowestTaskTime: 0,
        estimatedCompletionTime: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null,
        updatedAt: new Date().toISOString()
      }

      this.projectDatabase.execute(
        `INSERT INTO Llmtranslate_batches (
          id, status, config_json, total_tasks, unsent_tasks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [batch.id, batch.status, batch.configJson, batch.totalTasks, batch.unsentTasks, batch.createdAt, batch.updatedAt]
      )

      // 3. 创建任务记录
      const tasks: BackendTask[] = []
      for (let i = 0; i < chunks.length; i++) {
        const taskId = `${batchId}-${(i + 1).toString().padStart(4, '0')}`
        const chunk = chunks[i] || ''
        const task: BackendTask = {
          id: taskId,
          batchId: batch.id,
          status: 'unsent',
          content: chunk,
          translation: null,
          inputTokens: this.estimateTokens(chunk),
          replyTokens: 0,
          predictedTokens: config.predictedTokens,
          progress: 0,
          sentTime: null,
          replyTime: null,
          durationMs: null,
          errorMessage: null,
          errorType: null,
          retryCount: 0,
          cost: 0,
          metadataJson: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        this.projectDatabase.execute(
          `INSERT INTO Llmtranslate_tasks (
            id, batch_id, status, content, input_tokens, predicted_tokens, 
            progress, retry_count, cost, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id, task.batchId, task.status, task.content, task.inputTokens,
            task.predictedTokens, task.progress, task.retryCount, task.cost,
            task.createdAt, task.updatedAt
          ]
        )

        tasks.push(task)
      }

      // 4. 创建统计记录
      this.projectDatabase.execute(
        `INSERT INTO Llmtranslate_stats (batch_id, updated_at) VALUES (?, ?)`,
        [batch.id, new Date().toISOString()]
      )

      // 5. 缓存批次
      this.activeBatches.set(batchId, batch)

      // ✅ 发射创建完成事件
      this.emit('batch:created', {
        batchId,
        batch,
        tasks
      } as BatchCreatedEvent)

      console.log(`✅ [LlmTranslateService] 批次 ${batchId} 创建成功`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [LlmTranslateService] 批次 ${batchId} 创建失败:`, errorMessage)
      
      // ✅ 发射错误事件
      this.emit('batch:create-error', {
        batchId,
        error: errorMessage
      } as BatchCreateErrorEvent)
    }
  }

  /**
   * 分片内容 - 适配新的分片大小结构
   * 按行完整分片，不在行中间截断
   */
  private chunkContent(content: string, strategy: ChunkStrategy, config: TranslateConfig): string[] {
    const lines = content.split('\n')
    const chunks: string[] = []

    if (strategy === 'line') {
      // 使用 chunkSizeByLine
      const chunkSize = config.chunkSizeByLine
      for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize).join('\n')
        if (chunk.trim()) {
          chunks.push(chunk)
        }
      }
    } else if (strategy === 'token') {
      // 使用 chunkSizeByToken
      const chunkSize = config.chunkSizeByToken
      let currentChunk: string[] = []
      let currentTokens = 0

      for (const line of lines) {
        const lineTokens = this.estimateTokens(line)
        
        if (currentTokens + lineTokens > chunkSize && currentChunk.length > 0) {
          // 当前块已满，保存并开始新块
          chunks.push(currentChunk.join('\n'))
          currentChunk = [line]
          currentTokens = lineTokens
        } else {
          // 添加到当前块
          currentChunk.push(line)
          currentTokens += lineTokens
        }
      }

      // 添加最后一块
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'))
      }
    }

    return chunks
  }

  /**
   * 估算文本的 Token 数量
   * 简单估算：1 Token ≈ 4 字符（英文）或 1.5 字符（中文）
   */
  private estimateTokens(text: string): number {
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length
    const otherChars = text.length - chineseChars
    return Math.ceil(chineseChars / 1.5 + otherChars / 4)
  }

  /**
   * 从数据库加载所有批次
   */
  private async loadBatches(): Promise<void> {
    if (!this.projectDatabase) return

    const batches = this.projectDatabase.query(
      `SELECT * FROM Llmtranslate_batches ORDER BY created_at DESC`
    ) as BackendBatch[]

    for (const batch of batches) {
      this.activeBatches.set(batch.id, batch)
    }

    console.log(`📂 [LlmTranslateService] 加载了 ${batches.length} 个批次`)
  }

  /**
   * 更新批次统计
   */
  private async updateBatchStats(batchId: string): Promise<void> {
    // TODO: 实现批次统计更新逻辑
    console.log(`📊 [LlmTranslateService] 更新批次 ${batchId} 统计`)
  }

  /**
   * 获取批次列表
   */
  async getBatches(): Promise<BatchListResponse> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const batches = this.projectDatabase.query(
      `SELECT * FROM Llmtranslate_batches ORDER BY created_at DESC`
    ) as BackendBatch[]

    return {
      batches,
      total: batches.length
    }
  }

  /**
   * 获取单个批次
   */
  async getBatch(batchId: string): Promise<BackendBatch | null> {
    if (!this.projectDatabase) return null

    const result = this.projectDatabase.queryOne(
      `SELECT * FROM Llmtranslate_batches WHERE id = ?`,
      [batchId]
    )

    return result as BackendBatch | null
  }

  /**
   * 获取批次的任务列表
   */
  async getTasks(batchId: string): Promise<TaskListResponse> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const tasks = this.projectDatabase.query(
      `SELECT * FROM Llmtranslate_tasks WHERE batch_id = ? ORDER BY created_at ASC`,
      [batchId]
    ) as BackendTask[]

    return {
      tasks,
      total: tasks.length
    }
  }

  /**
   * 获取单个任务
   */
  async getTask(taskId: string): Promise<BackendTask | null> {
    if (!this.projectDatabase) return null

    const result = this.projectDatabase.queryOne(
      `SELECT * FROM Llmtranslate_tasks WHERE id = ?`,
      [taskId]
    )

    return result as BackendTask | null
  }

  /**
   * 暂停批次
   */
  async pauseBatch(batchId: string): Promise<void> {
    // TODO: 实现暂停逻辑
    console.log(`⏸️ [LlmTranslateService] 暂停批次 ${batchId}`)
  }

  /**
   * 恢复批次
   */
  async resumeBatch(batchId: string): Promise<void> {
    // TODO: 实现恢复逻辑
    console.log(`▶️ [LlmTranslateService] 恢复批次 ${batchId}`)
  }

  /**
   * 提交任务
   */
  async submitTasks(batchId: string, taskIds: string[]): Promise<string> {
    // TODO: 实现任务提交逻辑
    console.log(`📤 [LlmTranslateService] 提交任务 ${taskIds.join(', ')} 到批次 ${batchId}`)
    return nanoid()
  }

  /**
   * 重试失败任务
   */
  async retryFailedTasks(batchId: string): Promise<string> {
    // TODO: 实现重试逻辑
    console.log(`🔄 [LlmTranslateService] 重试批次 ${batchId} 的失败任务`)
    return nanoid()
  }

  /**
   * 导出批次
   */
  async exportBatch(batchId: string, options: ExportConfig): Promise<string> {
    // TODO: 实现导出逻辑
    console.log(`📁 [LlmTranslateService] 导出批次 ${batchId}，格式：${options.format}`)
    return nanoid()
  }
}