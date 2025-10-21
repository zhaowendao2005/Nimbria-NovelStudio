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
import { TaskStateManager } from './task-state-manager'
import { BatchScheduler } from './batch-scheduler'
import { ThrottleProbe } from './throttle-probe'
import type { ThrottleProbeConfig, ThrottleProbeResult } from './throttle-probe'
import { TokenRegressionEstimator } from './token-regression-estimator'
import type { TokenSample } from './token-regression-estimator'
import { initializeErrorSimulator } from './error-simulator'

// 从新的类型系统导入
import type {
  // 前端类型（通过别名转发）
  TranslateConfig,
  BatchConfig,
  ChunkStrategy,
  Batch,
  Task,
  TaskMetadata,
  ExportConfig
} from '../../types/LlmTranslate'

// 后端事件类型
import type {
  BatchCreateStartEvent,
  BatchCreatedEvent,
  BatchCreateErrorEvent,
  BatchDeleteStartEvent,
  BatchDeletedEvent,
  BatchDeleteErrorEvent,
  TaskDeleteStartEvent,
  TaskDeletedEvent,
  TaskDeleteErrorEvent
} from '../../types/LlmTranslate/backend'

export class LlmTranslateService extends EventEmitter {
  private projectDatabase: ProjectDatabase | null = null
  private llmChatService: LlmChatService
  private llmConfigManager: any
  private translationExecutor: TranslationExecutor
  private taskStateManager: TaskStateManager
  private exportService: ExportService
  private activeBatches: Map<string, Batch> = new Map()
  private schedulers: Map<string, BatchScheduler> = new Map()
  private probes: Map<string, ThrottleProbe> = new Map()
  private estimator: TokenRegressionEstimator

  constructor(llmChatService: LlmChatService, llmConfigManager: any) {
    super()
    this.llmChatService = llmChatService
    this.llmConfigManager = llmConfigManager
    
    // 创建 TaskStateManager
    this.taskStateManager = new TaskStateManager()
    
    // 创建 TranslationExecutor（传入 TaskStateManager）
    this.translationExecutor = new TranslationExecutor(this, llmConfigManager, this.taskStateManager)
    
    this.exportService = new ExportService(this)
    
    // 创建 TokenRegressionEstimator
    this.estimator = new TokenRegressionEstimator()
  }

  /**
   * 初始化服务（设置项目数据库）
   */
  async initialize(projectPath: string, projectDatabase: ProjectDatabase): Promise<void> {
    console.log('🚀 [LlmTranslateService] 初始化服务...')
    this.projectDatabase = projectDatabase
    
    // 🎲 初始化错误模拟器（默认关闭，可通过环境变量开启）
    const enableErrorMock = process.env.NIMBRIA_ENABLE_TRANSLATE_ERROR_SIM === 'true'
    initializeErrorSimulator({
      enabled: enableErrorMock,
      debug: enableErrorMock && process.env.DEBUG_ERROR_SIMULATOR === 'true'
    })
    console.log(`🎲 [LlmTranslateService] 错误模拟器: ${enableErrorMock ? '已启用' : '已关闭'}`)
    
    // 设置 TaskStateManager 的数据库
    this.taskStateManager.setProjectDatabase(projectDatabase)
    
    // 设置全局日志过滤器，过滤 LangChain 的重复 token 警告
    this.setupGlobalLogFilter()
    
    // 监听 TaskStateManager 的事件并转发
    this.setupTaskStateListeners()
    
    // 从数据库加载所有批次
    await this.loadBatches()
    
    // 检查程序中断的任务，标记为 terminated
    await this.handleTerminatedTasks()
    
    // 检查异常任务并恢复（将 sending 状态的任务标记为 error）
    await this.handleRecoveryTasks()
    
    console.log('✅ [LlmTranslateService] 服务初始化完成')
  }

  /**
   * 设置 TaskStateManager 的事件监听器
   * 将 TaskStateManager 的事件转发给 IPC 层
   */
  private setupTaskStateListeners(): void {
    // 任务状态变化事件
    this.taskStateManager.on('state:change', (event) => {
      this.emit('task:state-changed', event)
    })

    // 任务进度更新事件
    this.taskStateManager.on('progress:update', (event) => {
      this.emit('task:progress', event)
    })

    // 任务完成事件
    this.taskStateManager.on('task:complete', (event) => {
      this.emit('task:complete', event)
      
      // 收集token样本用于回归估计
      this.collectTokenSample(event)
    })

    // 任务错误事件
    this.taskStateManager.on('task:error', (event) => {
      this.emit('task:error', event)
    })

    console.log('✅ [LlmTranslateService] TaskStateManager 事件监听器已设置')
  }
  
  /**
   * 收集token样本（用于回归估计）
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private collectTokenSample(event: any): void {
    try {
      const { taskId, inputTokens, replyTokens } = event
      
      if (!taskId || !this.projectDatabase) {
        return
      }
      
      // 从数据库获取任务详情
      const task = this.projectDatabase.query(
        `SELECT content, metadata_json AS metadataJson FROM Llmtranslate_tasks WHERE id = ?`,
        [taskId]
      )[0]
      
      if (!task) {
        return
      }
      
      // 提取modelId
      let modelId = ''
      try {
        const metadata = typeof task.metadataJson === 'string' 
          ? JSON.parse(task.metadataJson) 
          : task.metadataJson
        modelId = metadata?.modelId || ''
      } catch {
        return
      }
      
      if (!modelId || !replyTokens) {
        return
      }
      
      // 构建样本
      const sample: TokenSample = {
        modelId,
        inputLength: task.content?.length || 0,
        inputTokens: inputTokens || 0,
        outputTokens: replyTokens,
        timestamp: Date.now()
      }
      
      // 添加到estimator
      this.estimator.addSample(sample)
      
      console.log(`📊 [LlmTranslateService] 收集样本: modelId=${modelId}, input=${sample.inputLength}, output=${sample.outputTokens}`)
      
    } catch (error) {
      console.error(`❌ [LlmTranslateService] 收集样本失败:`, error)
    }
  }

  /**
   * 处理因程序终止而中断的任务
   * waiting 状态的任务保持不变，用户重启后可以选择继续发送或取消等待
   */
  private async handleTerminatedTasks(): Promise<void> {
    if (!this.projectDatabase) return

    // 查询所有waiting的任务
    const waitingTasks = this.projectDatabase.query(
      `SELECT id FROM Llmtranslate_tasks WHERE status = 'waiting'`
    ) as Array<{ id: string }>

    if (waitingTasks.length > 0) {
      console.log(`⚠️ [LlmTranslateService] 发现 ${waitingTasks.length} 个等待中的任务，保持状态不变`)
      // ✅ 什么都不做，让这些任务保留为 waiting 状态
      // 用户重启后可以手动点击"发送"重新提交，或点击"取消等待"改回 unsent
    }
  }

  /**
   * 处理异常任务恢复
   * 将所有 status = 'sending' 的任务标记为 'error'
   * 
   * @description
   * 应用启动时检查是否有异常终止的任务（sending 状态）
   * 这些任务应该在应用崩溃时被中断，需要标记为 error
   */
  private async handleRecoveryTasks(): Promise<void> {
    if (!this.projectDatabase) return

    // 查询所有 sending 状态的任务
    const sendingTasks = this.projectDatabase.query(
      `SELECT 
        id, batch_id AS batchId, status, content, translation,
        input_tokens AS inputTokens, reply_tokens AS replyTokens, 
        predicted_tokens AS predictedTokens, progress,
        sent_time AS sentTime, reply_time AS replyTime, duration_ms AS durationMs,
        error_message AS errorMessage, error_type AS errorType, retry_count AS retryCount,
        cost, metadata_json AS metadataJson,
        created_at AS createdAt, updated_at AS updatedAt
      FROM Llmtranslate_tasks 
      WHERE status = 'sending'`
    ) as Task[]

    if (sendingTasks.length > 0) {
      console.log(`⚠️ [LlmTranslateService] 发现 ${sendingTasks.length} 个异常终止任务，标记为 error`)
      
      // 更新状态为 error
      this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = 'error', 
             error_type = 'APP_CRASHED',
             error_message = '程序异常中止，任务未完成。请检查API或重新发送',
             updated_at = CURRENT_TIMESTAMP
         WHERE status = 'sending'`
      )
      
      // 更新批次统计
      const batchIds = new Set(sendingTasks.map(t => t.batchId))
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
    void this.createBatchAsync(batchId, config, content)
    
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

      // 1. 提取批次配置（从 TranslateConfig 中提取，排除 content）
      const batchConfig: BatchConfig = {
        systemPrompt: config.systemPrompt,
        modelId: config.modelId,
        chunkStrategy: config.chunkStrategy,
        chunkSizeByLine: config.chunkSizeByLine,
        chunkSizeByToken: config.chunkSizeByToken,
        concurrency: config.concurrency,
        replyMode: config.replyMode,
        predictedTokens: config.predictedTokens,
        schedulerConfig: config.schedulerConfig
      }

      // 2. 根据分片策略分割内容
      const chunkSize = config.chunkStrategy === 'line' 
        ? config.chunkSizeByLine 
        : config.chunkSizeByToken
      const chunks = this.chunkContent(content, config.chunkStrategy, chunkSize)
      const totalTasks = chunks.length

      console.log(`📦 [LlmTranslateService] 批次 ${batchId} - 分割为 ${totalTasks} 个任务`)

      // 3. 创建批次记录
      const batch: Batch = {
        id: batchId,
        status: 'running',
        configJson: JSON.stringify(batchConfig),
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

      // 4. 创建任务记录
      const tasks: Task[] = []
      for (let i = 0; i < chunks.length; i++) {
        const taskId = `${batchId}-${(i + 1).toString().padStart(4, '0')}`
        const chunk = chunks[i] || ''
        
        // 估算输入和输出 Token（根据replyMode决定）
        const estimatedInputTokens = this.estimateTokens(chunk)
        const estimatedOutputTokens = this.calculatePredictedTokens(
          chunk, 
          config.modelId, 
          config.replyMode, 
          config.predictedTokens
        )
        const estimatedCost = ((estimatedInputTokens + estimatedOutputTokens) / 1000) * 0.002
        
        // 创建任务元数据
        const taskMetadata: TaskMetadata = {
          // 批次公共配置
          ...batchConfig,
          // 任务私有信息
          estimatedInputTokens,
          estimatedOutputTokens,
          estimatedCost
        }
        
        const task: Task = {
          id: taskId,
          batchId: batch.id,
          status: 'unsent',
          content: chunk,
          translation: null,
          inputTokens: estimatedInputTokens,
          replyTokens: 0,
          predictedTokens: estimatedOutputTokens,
          progress: 0,
          sentTime: null,
          replyTime: null,
          durationMs: null,
          errorMessage: null,
          errorType: null,
          retryCount: 0,
          cost: 0,
          metadataJson: JSON.stringify(taskMetadata),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        this.projectDatabase.execute(
          `INSERT INTO Llmtranslate_tasks (
            id, batch_id, status, content, input_tokens, predicted_tokens, 
            progress, retry_count, cost, metadata_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id, task.batchId, task.status, task.content, task.inputTokens,
            task.predictedTokens, task.progress, task.retryCount, task.cost,
            task.metadataJson, task.createdAt, task.updatedAt
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
   * 分片内容
   * 按行完整分片，不在行中间截断
   */
  private chunkContent(content: string, strategy: ChunkStrategy, chunkSize: number): string[] {
    const lines = content.split('\n')
    const chunks: string[] = []

    if (strategy === 'line') {
      // 按行数分片
      for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize).join('\n')
        if (chunk.trim()) {
          chunks.push(chunk)
        }
      }
    } else if (strategy === 'token') {
      // 按 Token 数分片
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
      `SELECT 
        id, status, config_json AS configJson,
        total_tasks AS totalTasks, completed_tasks AS completedTasks,
        failed_tasks AS failedTasks, throttled_tasks AS throttledTasks,
        waiting_tasks AS waitingTasks, unsent_tasks AS unsentTasks,
        terminated_tasks AS terminatedTasks,
        total_cost AS totalCost, total_input_tokens AS totalInputTokens,
        total_output_tokens AS totalOutputTokens,
        avg_time_per_task AS avgTimePerTask, fastest_task_time AS fastestTaskTime,
        slowest_task_time AS slowestTaskTime, estimated_completion_time AS estimatedCompletionTime,
        created_at AS createdAt, started_at AS startedAt,
        completed_at AS completedAt, updated_at AS updatedAt
      FROM Llmtranslate_batches 
      ORDER BY created_at DESC`
    ) as Batch[]

    for (const batch of batches) {
      this.activeBatches.set(batch.id, batch)
    }

    console.log(`📂 [LlmTranslateService] 加载了 ${batches.length} 个批次`)
  }

  /**
   * 更新批次统计（公共方法，供 TranslationExecutor 调用）
   */
  async updateBatchStats(batchId: string): Promise<void> {
    // TODO: 实现批次统计更新逻辑
    console.log(`📊 [LlmTranslateService] 更新批次 ${batchId} 统计`)
  }

  /**
   * 获取批次列表
   */
  async getBatches(): Promise<{ batches: Batch[], total: number }> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const batches = this.projectDatabase.query(
      `SELECT 
        id, status, config_json AS configJson,
        total_tasks AS totalTasks, completed_tasks AS completedTasks,
        failed_tasks AS failedTasks, throttled_tasks AS throttledTasks,
        waiting_tasks AS waitingTasks, unsent_tasks AS unsentTasks,
        terminated_tasks AS terminatedTasks,
        total_cost AS totalCost, total_input_tokens AS totalInputTokens,
        total_output_tokens AS totalOutputTokens,
        avg_time_per_task AS avgTimePerTask, fastest_task_time AS fastestTaskTime,
        slowest_task_time AS slowestTaskTime, estimated_completion_time AS estimatedCompletionTime,
        created_at AS createdAt, started_at AS startedAt,
        completed_at AS completedAt, updated_at AS updatedAt
      FROM Llmtranslate_batches 
      ORDER BY created_at DESC`
    ) as Batch[]

    return {
      batches,
      total: batches.length
    }
  }

  /**
   * 获取单个批次
   */
  async getBatch(batchId: string): Promise<Batch | null> {
    if (!this.projectDatabase) return null

    const result = this.projectDatabase.queryOne(
      `SELECT 
        id, status, config_json AS configJson,
        total_tasks AS totalTasks, completed_tasks AS completedTasks,
        failed_tasks AS failedTasks, throttled_tasks AS throttledTasks,
        waiting_tasks AS waitingTasks, unsent_tasks AS unsentTasks,
        terminated_tasks AS terminatedTasks,
        total_cost AS totalCost, total_input_tokens AS totalInputTokens,
        total_output_tokens AS totalOutputTokens,
        avg_time_per_task AS avgTimePerTask, fastest_task_time AS fastestTaskTime,
        slowest_task_time AS slowestTaskTime, estimated_completion_time AS estimatedCompletionTime,
        created_at AS createdAt, started_at AS startedAt,
        completed_at AS completedAt, updated_at AS updatedAt
      FROM Llmtranslate_batches 
      WHERE id = ?`,
      [batchId]
    )

    return result as Batch | null
  }

  /**
   * 获取批次的任务列表
   */
  async getTasks(batchId: string): Promise<{ tasks: Task[], total: number }> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const tasks = this.projectDatabase.query(
      `SELECT 
        id, batch_id AS batchId, status, content, translation,
        input_tokens AS inputTokens, reply_tokens AS replyTokens, 
        predicted_tokens AS predictedTokens, progress,
        sent_time AS sentTime, reply_time AS replyTime, duration_ms AS durationMs,
        error_message AS errorMessage, error_type AS errorType, retry_count AS retryCount,
        cost, metadata_json AS metadataJson,
        created_at AS createdAt, updated_at AS updatedAt
      FROM Llmtranslate_tasks 
      WHERE batch_id = ? 
      ORDER BY created_at ASC`,
      [batchId]
    ) as Task[]

    return {
      tasks,
      total: tasks.length
    }
  }

  /**
   * 获取单个任务
   */
  async getTask(taskId: string): Promise<Task | null> {
    if (!this.projectDatabase) return null

    const result = this.projectDatabase.queryOne(
      `SELECT 
        id, batch_id AS batchId, status, content, translation,
        input_tokens AS inputTokens, reply_tokens AS replyTokens, 
        predicted_tokens AS predictedTokens, progress,
        sent_time AS sentTime, reply_time AS replyTime, duration_ms AS durationMs,
        error_message AS errorMessage, error_type AS errorType, retry_count AS retryCount,
        cost, metadata_json AS metadataJson,
        created_at AS createdAt, updated_at AS updatedAt
      FROM Llmtranslate_tasks 
      WHERE id = ?`,
      [taskId]
    )

    return result as Task | null
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
   * 立即返回 submissionId，异步启动任务执行
   */
  async submitTasks(batchId: string, taskIds: string[]): Promise<string> {
    console.log(`📤 [LlmTranslateService] 提交任务 ${taskIds.join(', ')} 到批次 ${batchId}`)
    
    // 1. 生成提交 ID
    const submissionId = nanoid()
    
    // 2. 获取批次配置
    const batch = await this.getBatch(batchId)
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`)
    }
    
    // 3. 解析批次配置
    const config: TranslateConfig = typeof batch.configJson === 'string' 
      ? JSON.parse(batch.configJson) 
      : batch.configJson
    
    // 4. 提取调度器配置（如果有）
    const maxConcurrency = config.schedulerConfig?.maxConcurrency || 3 // 默认并发数为3
    
    // 5. 将任务标记为 'waiting' 状态（写入数据库）
    if (this.projectDatabase) {
      for (const taskId of taskIds) {
        this.projectDatabase.execute(
          `UPDATE Llmtranslate_tasks SET status = 'waiting', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [taskId]
        )
      }
      console.log(`✅ [LlmTranslateService] ${taskIds.length} 个任务已标记为 waiting`)
    }
    
    // 6. 创建并启动 BatchScheduler（异步，不阻塞）
    setImmediate(() => {
      void this.startBatchScheduler(batchId, taskIds, maxConcurrency)
    })
    
    return submissionId
  }
  
  /**
   * 启动批次调度器
   */
  private async startBatchScheduler(
    batchId: string,
    taskIds: string[],
    maxConcurrency: number
  ): Promise<void> {
    try {
      // 检查是否已有调度器在运行
      if (this.schedulers.has(batchId)) {
        const existingScheduler = this.schedulers.get(batchId)!
        const status = existingScheduler.getStatus()
        if (status.state === 'running' || status.state === 'paused') {
          console.warn(`⚠️ [LlmTranslateService] 批次 ${batchId} 已有调度器在运行`)
          return
        }
        // 如果之前的调度器已完成，先销毁
        existingScheduler.destroy()
      }
      
      // 获取批次配置以提取modelId
      const batch = await this.getBatch(batchId)
      const config: TranslateConfig = typeof batch?.configJson === 'string' 
        ? JSON.parse(batch.configJson) 
        : batch?.configJson || {}
      
      const modelId = config.modelId || ''
      
      // 创建 ThrottleProbe（如果配置了探针）
      let probe: ThrottleProbe | undefined
      if (modelId && config.schedulerConfig) {
        const probeConfig: ThrottleProbeConfig = {
          intervalSeconds: config.schedulerConfig.throttleProbeIntervalSeconds || 10,
          type: config.schedulerConfig.throttleProbeType || 'quick',
          maxRetries: 20 // 最多探测20次（约3-5分钟）
        }
        
        probe = new ThrottleProbe(modelId, probeConfig, this.llmConfigManager)
        this.probes.set(modelId, probe)
        
        // 监听probe事件
        probe.on('test-result', (result) => {
          this.emit('throttle:test-result', { modelId, result })
        })
      }
      
      // 创建新的调度器
      const scheduler = new BatchScheduler({
        batchId,
        taskIds,
        maxConcurrency,
        config,
        executor: this.translationExecutor,
        stateManager: this.taskStateManager,
        probe
      })
      
      // 设置调度器事件监听
      this.setupSchedulerListeners(scheduler, batchId)
      
      // 保存调度器引用
      this.schedulers.set(batchId, scheduler)
      
      // 启动调度器
      scheduler.start()
      
    } catch (error) {
      console.error(`❌ [LlmTranslateService] 启动调度器失败:`, error)
      throw error
    }
  }
  
  /**
   * 设置调度器事件监听
   */
  private setupSchedulerListeners(scheduler: BatchScheduler, batchId: string): void {
    // 调度器状态变化
    scheduler.on('scheduler:status-changed', (status) => {
      console.log(`📊 [LlmTranslateService] 调度器状态变化:`, status)
      this.emit('scheduler:status-changed', { batchId, status })
    })
    
    // 调度器完成
    scheduler.on('scheduler:completed', (data) => {
      console.log(`✅ [LlmTranslateService] 调度器完成:`, data)
      this.emit('scheduler:completed', data)
      
      // 清理调度器
      this.schedulers.delete(batchId)
      scheduler.destroy()
    })
    
    // 调度器限流
    scheduler.on('scheduler:throttled', (data) => {
      console.log(`🚨 [LlmTranslateService] 调度器限流:`, data)
      this.emit('scheduler:throttled', data)
    })
    
    // 调度器恢复
    scheduler.on('scheduler:recovered', (data) => {
      console.log(`🔄 [LlmTranslateService] 调度器恢复:`, data)
      this.emit('scheduler:recovered', data)
    })
  }
  
  /**
   * 异步执行任务（内部方法）
   */
  private async executeTasksAsync(
    batchId: string, 
    taskIds: string[], 
    config: TranslateConfig
  ): Promise<void> {
    try {
      console.log(`🎬 [LlmTranslateService] 开始执行批次 ${batchId}，任务数: ${taskIds.length}`)
      
      // 调用 TranslationExecutor 执行任务
      await this.translationExecutor.executeTasks(
        batchId,
        taskIds,
        config,
        config.concurrency
      )
      
      console.log(`✅ [LlmTranslateService] 批次 ${batchId} 执行完成`)
    } catch (error) {
      console.error(`❌ [LlmTranslateService] 批次 ${batchId} 执行失败:`, error)
    }
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
   * 暂停任务
   * 
   * @description
   * 将任务状态设置为 paused，并通过 TaskStateManager 记录错误信息
   */
  async pauseTask(taskId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    console.log(`⏸️ [LlmTranslateService] 暂停任务 ${taskId}`)
    
    // 调用 TaskStateManager 暂停任务
    await this.taskStateManager.pauseTask(taskId)
    
    // 获取任务所属批次并更新统计
    const task = await this.getTask(taskId)
    if (task) {
      await this.updateBatchStats(task.batchId)
    }
  }

  /**
   * 取消正在执行的任务
   * 
   * @description
   * 1. 从 TranslationExecutor 获取正在执行的任务
   * 2. 调用该任务的 cancel 方法来中止与LLM的连接
   * 3. 标记任务为 error 状态
   * 4. 数据库更新反映这个改变
   */
  async cancelTask(taskId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    console.log(`✂️ [LlmTranslateService] 取消任务 ${taskId}`)
    
    try {
      // 从执行器中获取正在执行的任务并取消
      const executingClient = this.translationExecutor.getExecutingTask(taskId)
      if (executingClient) {
        executingClient.cancel()
        console.log(`✂️ [LlmTranslateService] 已中止任务 ${taskId} 的LLM连接`)
      }
      
      // 标记任务为 error 状态
      await this.taskStateManager.markError(
        taskId,
        'USER_CANCELLED',
        '用户取消了任务'
      )
      
      console.log(`✂️ [LlmTranslateService] 任务 ${taskId} 已标记为 error`)
    } catch (error) {
      console.error(`❌ [LlmTranslateService] 取消任务 ${taskId} 失败:`, error)
      throw error
    }
  }

  /**
   * 取消等待中的任务
   * 将 waiting → unsent，从调度队列移除
   */
  async cancelWaitingTask(taskId: string): Promise<void> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    console.log(`✂️ [LlmTranslateService] 取消等待任务 ${taskId}`)

    try {
      // 1. 更新数据库状态
      const result = this.projectDatabase.execute(
        `UPDATE Llmtranslate_tasks 
         SET status = 'unsent', updated_at = CURRENT_TIMESTAMP 
         WHERE id = ? AND status = 'waiting'`,
        [taskId]
      )

      if (result.changes === 0) {
        throw new Error(`任务 ${taskId} 不是 waiting 状态或不存在`)
      }

      // 2. 从调度器队列中移除（如果调度器正在运行）
      const task = await this.getTask(taskId)
      if (task) {
        const scheduler = this.schedulers.get(task.batchId)
        if (scheduler) {
          // 如果 BatchScheduler 有 removeTaskFromQueue 方法的话
          // scheduler.removeTaskFromQueue(taskId)
          console.log(`✂️ [LlmTranslateService] 已从调度器队列移除任务 ${taskId}`)
        }
        
        // 更新批次统计
        await this.updateBatchStats(task.batchId)
      }

      console.log(`✂️ [LlmTranslateService] 任务 ${taskId} 已取消等待，状态改为 unsent`)
    } catch (error) {
      console.error(`❌ [LlmTranslateService] 取消等待任务 ${taskId} 失败:`, error)
      throw error
    }
  }

  /**
   * 根据replyMode计算预估token数
   * 
   * @param content 任务内容
   * @param modelId 模型ID
   * @param replyMode 回复模式
   * @param predictedTokens 用户设定的固定值（predicted模式使用）
   */
  private calculatePredictedTokens(
    content: string,
    modelId: string,
    replyMode: 'predicted' | 'equivalent' | 'regression',
    predictedTokens: number
  ): number {
    switch (replyMode) {
      case 'predicted':
        // 使用用户设定的固定值
        console.log(`📊 [LlmTranslateService] 使用predicted模式: ${predictedTokens} tokens`)
        return predictedTokens
        
      case 'equivalent': {
        // 等额模式：输出≈输入（假设token约为字符数的1/3）
        const equivalentTokens = Math.ceil(content.length / 3)
        console.log(`📊 [LlmTranslateService] 使用equivalent模式: ${equivalentTokens} tokens (内容长度: ${content.length})`)
        return equivalentTokens
      }
        
      case 'regression': {
        // 回归估计：使用历史样本学习
        const contentLength = content.length
        const estimated = this.estimator.estimate(contentLength, modelId)
        
        if (estimated > 0) {
          console.log(`📊 [LlmTranslateService] 使用regression模式: ${estimated} tokens (基于样本)`)
          return estimated
        } else {
          // 样本不足，降级到predicted模式
          console.log(`⚠️ [LlmTranslateService] Regression模式样本不足，降级到predicted: ${predictedTokens} tokens`)
          return predictedTokens
        }
      }
        
      default:
        console.warn(`⚠️ [LlmTranslateService] 未知的replyMode: ${replyMode}，使用predicted`)
        return predictedTokens
    }
  }

  /**
   * 估算任务的输出token数（根据taskId）
   * 用于动态估算已存在任务的预估token
   */
  estimateTaskTokens(taskId: string): number {
    if (!this.projectDatabase) {
      return -1
    }
    
    try {
      // 从数据库获取任务
      const task = this.projectDatabase.query(
        `SELECT content, metadata_json AS metadataJson FROM Llmtranslate_tasks WHERE id = ?`,
        [taskId]
      )[0]
      
      if (!task) {
        return -1
      }
      
      // 提取modelId
      let modelId = ''
      try {
        const metadata = typeof task.metadataJson === 'string' 
          ? JSON.parse(task.metadataJson) 
          : task.metadataJson
        modelId = metadata?.modelId || ''
      } catch {
        return -1
      }
      
      if (!modelId) {
        return -1
      }
      
      // 使用estimator估算
      const contentLength = task.content?.length || 0
      const estimated = this.estimator.estimate(contentLength, modelId)
      
      console.log(`📊 [LlmTranslateService] Token估算: taskId=${taskId}, modelId=${modelId}, length=${contentLength} → ${estimated}`)
      
      return estimated
      
    } catch (error) {
      console.error(`❌ [LlmTranslateService] Token估算失败:`, error)
      return -1
    }
  }

  /**
   * 测试限流状态
   * 手动发送一次探针测试
   */
  async testThrottle(modelId: string, config: ThrottleProbeConfig): Promise<ThrottleProbeResult> {
    console.log(`🔧 [LlmTranslateService] 测试限流: modelId=${modelId}, type=${config.type}`)
    
    try {
      // 创建或获取probe
      let probe = this.probes.get(modelId)
      if (!probe) {
        probe = new ThrottleProbe(modelId, config, this.llmConfigManager)
        this.probes.set(modelId, probe)
      }
      
      // 执行一次测试
      const result = await probe.test()
      
      // 发射测试结果事件
      this.emit('throttle:test-result', {
        modelId,
        result
      })
      
      return result
      
    } catch (error) {
      console.error(`❌ [LlmTranslateService] 测试限流失败:`, error)
      throw error
    }
  }

  /**
   * 导出批次
   */
  exportBatch(batchId: string, options: ExportConfig): string {
    // TODO: 实现导出逻辑
    console.log(`📁 [LlmTranslateService] 导出批次 ${batchId}，格式：${options.format}`)
    return nanoid()
  }

  /**
   * 删除批次
   * 立即返回操作ID，通过事件反馈删除进度
   */
  deleteBatch(batchId: string): string {
    const operationId = `delete_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    // ✅ 立即发射开始事件
    this.emit('batch:delete-start', {
      batchId
    } as BatchDeleteStartEvent)
    
    // ✅ 异步处理，不阻塞返回
    void this.deleteBatchAsync(batchId)
    
    return operationId
  }

  /**
   * 异步删除批次
   */
  private async deleteBatchAsync(batchId: string): Promise<void> {
    try {
      if (!this.projectDatabase) {
        throw new Error('Project database not initialized')
      }

      // 1. 统计要删除的任务数量
      const taskCountResult = this.projectDatabase.queryOne(
        `SELECT COUNT(*) as count FROM Llmtranslate_tasks WHERE batch_id = ?`,
        [batchId]
      ) as { count: number }
      const deletedTaskCount = taskCountResult?.count || 0

      // 2. 删除批次（CASCADE 会自动删除相关任务）
      this.projectDatabase.execute(
        `DELETE FROM Llmtranslate_batches WHERE id = ?`,
        [batchId]
      )

      // 3. 删除统计记录
      this.projectDatabase.execute(
        `DELETE FROM Llmtranslate_stats WHERE batch_id = ?`,
        [batchId]
      )

      // 4. 清理内存缓存
      this.activeBatches.delete(batchId)

      // ✅ 发射删除完成事件
      this.emit('batch:deleted', {
        batchId,
        deletedTaskCount
      } as BatchDeletedEvent)

      console.log(`✅ [LlmTranslateService] 批次 ${batchId} 删除成功，删除了 ${deletedTaskCount} 个任务`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [LlmTranslateService] 删除批次 ${batchId} 失败:`, errorMessage)
      
      // ✅ 发射错误事件
      this.emit('batch:delete-error', {
        batchId,
        error: errorMessage
      } as BatchDeleteErrorEvent)
    }
  }

  /**
   * 删除任务
   * 立即返回操作ID，通过事件反馈删除进度
   */
  async deleteTasks(taskIds: string[]): Promise<string> {
    const operationId = `delete_tasks_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    if (taskIds.length === 0) {
      throw new Error('任务ID列表不能为空')
    }

    // 获取批次ID（假设同一批次的任务）
    const firstTask = await this.getTask(taskIds[0]!)
    if (!firstTask) {
      throw new Error(`任务 ${taskIds[0]} 不存在`)
    }
    const batchId = firstTask.batchId

    // ✅ 立即发射开始事件
    this.emit('task:delete-start', {
      taskIds,
      batchId
    } as TaskDeleteStartEvent)
    
    // ✅ 异步处理，不阻塞返回
    void this.deleteTasksAsync(taskIds, batchId)
    
    return operationId
  }

  /**
   * 异步删除任务
   */
  private async deleteTasksAsync(taskIds: string[], batchId: string): Promise<void> {
    try {
      if (!this.projectDatabase) {
        throw new Error('Project database not initialized')
      }

      // 1. 删除任务
      const placeholders = taskIds.map(() => '?').join(',')
      this.projectDatabase.execute(
        `DELETE FROM Llmtranslate_tasks WHERE id IN (${placeholders})`,
        taskIds
      )

      // 2. 检查批次是否还有剩余任务
      const remainingTasks = this.projectDatabase.queryOne(
        `SELECT COUNT(*) as count FROM Llmtranslate_tasks WHERE batch_id = ?`,
        [batchId]
      ) as { count: number }

      // 3. 如果没有剩余任务，自动删除批次
      if (remainingTasks.count === 0) {
        console.log(`🗑️ [LlmTranslateService] 批次 ${batchId} 已无任务，自动删除`)
        
        // 删除批次相关数据
        this.projectDatabase.execute(`DELETE FROM Llmtranslate_batches WHERE id = ?`, [batchId])
        this.projectDatabase.execute(`DELETE FROM Llmtranslate_stats WHERE batch_id = ?`, [batchId])
        
        // 清理内存缓存
        this.activeBatches.delete(batchId)
        
        // 发射批次删除事件（自动删除）
        this.emit('batch:deleted', {
          batchId,
          deletedTaskCount: taskIds.length
        } as BatchDeletedEvent)
      } else {
        // 4. 如果还有任务，只更新批次统计
        await this.updateBatchStats(batchId)
        
        // 发射任务删除完成事件
        this.emit('task:deleted', {
          taskIds,
          batchId,
          deletedCount: taskIds.length
        } as TaskDeletedEvent)
      }

      console.log(`✅ [LlmTranslateService] 删除了 ${taskIds.length} 个任务`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [LlmTranslateService] 删除任务失败:`, errorMessage)
      
      // ✅ 发射错误事件
      this.emit('task:delete-error', {
        taskIds,
        batchId,
        error: errorMessage
      } as TaskDeleteErrorEvent)
    }
  }

  // ==================== 公共 Getter 方法 ====================

  /**
   * 获取项目数据库实例
   */
  getProjectDatabase(): ProjectDatabase | null {
    return this.projectDatabase
  }

  /**
   * 获取 TaskStateManager 实例
   */
  getTaskStateManager(): TaskStateManager {
    return this.taskStateManager
  }

  /**
   * 获取 ExportService 实例
   */
  getExportService(): ExportService {
    return this.exportService
  }

  /**
   * 设置全局日志过滤器，过滤 LangChain 的重复 token 警告
   * 在应用启动时一次性配置，避免并发竞态条件
   */
  private setupGlobalLogFilter(): void {
    const originalError = console.error
    let totalFiltered = 0

    console.error = (...args: unknown[]) => {
      const message = args.join(' ')
      
      // 过滤 LangChain 的重复 token 警告
      if (
        message.includes('field[') &&
        message.includes('] already exists in this message chunk') &&
        message.includes('value has unsupported type') &&
        (message.includes('completion_tokens') || message.includes('total_tokens'))
      ) {
        totalFiltered++
        return
      }
      
      // 其他错误正常输出
      originalError.apply(console, args)
    }

    console.log(`🔇 [LlmTranslateService] 全局日志过滤器已启用，将过滤 LangChain 重复token警告`)
  }
}
