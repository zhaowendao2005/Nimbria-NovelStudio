# 📋 **LLM 翻译系统 - Electron 本地集成设计文档 (v1.0)**

**版本**: v1.0  
**创建时间**: 2025年10月20日  
**架构模式**: 事件驱动 + 强类型 + Electron IPC  
**数据库版本**: v1.2.0  
**运行环境**: 纯桌面应用（无后端服务器）

## 🎯 **核心设计原则**

1. ✅ **严格事件驱动**：所有异步操作立即返回操作ID，通过事件反馈进度
2. ✅ **强类型约束**：严禁 `any`，所有类型必须显式定义
3. ✅ **Electron 本地进程**：主进程运行 LlmTranslateService，通过IPC与渲染进程通信
4. ✅ **本地数据库**：使用SQLite存储批次和任务数据
5. ✅ **本地文件操作**：通过 Electron Dialog API 选择文件路径
6. ✅ **优雅中断处理**：程序终止时，所有 `waiting` 状态的任务标记为 `terminated`

---

## 📊 **数据库 Schema 设计 (v1.2.0)**

### **文件位置**
```
src-electron/services/database-service/schema/versions/v1.2.0.schema.ts
```

### **完整 Schema 定义**

```typescript
/**
 * Database Schema v1.2.0
 * 添加 LLM Translate 批量翻译系统支持
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import { PROJECT_TABLES as V1_1_0_TABLES } from './v1.1.0.schema'

// ========== LLM Translate 相关表 ==========

const LLM_TRANSLATE_TABLES: TableDefinition[] = [
  {
    name: 'Llmtranslate_batches',
    sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_batches (
      id TEXT PRIMARY KEY,                    -- 批次ID (#20250115-001)
      status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'failed', 'terminated')),
      
      -- 配置信息 (JSON 序列化 TranslateConfig)
      config_json TEXT NOT NULL,
      
      -- 统计信息
      total_tasks INTEGER DEFAULT 0,
      completed_tasks INTEGER DEFAULT 0,
      failed_tasks INTEGER DEFAULT 0,
      throttled_tasks INTEGER DEFAULT 0,
      waiting_tasks INTEGER DEFAULT 0,
      unsent_tasks INTEGER DEFAULT 0,
      terminated_tasks INTEGER DEFAULT 0,     -- 因程序中断而终止的任务数
      
      -- 成本统计
      total_cost REAL DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      
      -- 性能统计
      avg_time_per_task REAL DEFAULT 0,      -- 平均耗时(秒)
      fastest_task_time REAL DEFAULT 0,      -- 最快任务耗时
      slowest_task_time REAL DEFAULT 0,      -- 最慢任务耗时
      estimated_completion_time DATETIME,     -- 预计完成时间
      
      -- 时间戳
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,                    -- 开始执行时间
      completed_at DATETIME,                  -- 完成时间
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_batches_status ON Llmtranslate_batches(status)`,
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_batches_created ON Llmtranslate_batches(created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_batches_updated ON Llmtranslate_batches(updated_at DESC)`
    ]
  },
  
  {
    name: 'Llmtranslate_tasks',
    sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_tasks (
      id TEXT PRIMARY KEY,                    -- 任务ID (#1250)
      batch_id TEXT NOT NULL,                 -- 所属批次
      
      -- 任务状态
      status TEXT NOT NULL CHECK (status IN ('unsent', 'waiting', 'throttled', 'error', 'completed', 'terminated')),
      
      -- 内容
      content TEXT NOT NULL,                  -- 待翻译原文
      translation TEXT,                       -- 翻译结果
      
      -- Token 信息
      input_tokens INTEGER DEFAULT 0,        -- 输入Token数
      reply_tokens INTEGER DEFAULT 0,        -- 已回复Token数
      predicted_tokens INTEGER DEFAULT 0,    -- 预计回复Token数
      progress REAL DEFAULT 0,               -- 进度百分比 (0-100)
      
      -- 时间信息
      sent_time DATETIME,                    -- 发送时间
      reply_time DATETIME,                   -- 回复完成时间
      duration_ms INTEGER,                   -- 耗时(毫秒)
      
      -- 错误信息
      error_message TEXT,                    -- 错误消息
      error_type TEXT,                       -- 错误类型 (network/timeout/rate_limit/terminated/unknown)
      retry_count INTEGER DEFAULT 0,         -- 重试次数
      
      -- 成本信息
      cost REAL DEFAULT 0,                   -- 单个任务成本
      
      -- 元数据
      metadata_json TEXT,                    -- 扩展元数据 (JSON)
      
      -- 时间戳
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (batch_id) REFERENCES Llmtranslate_batches(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_batch ON Llmtranslate_tasks(batch_id)`,
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_status ON Llmtranslate_tasks(status)`,
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_created ON Llmtranslate_tasks(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_progress ON Llmtranslate_tasks(progress)`,
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_error_type ON Llmtranslate_tasks(error_type)`
    ]
  },
  
  {
    name: 'Llmtranslate_stats',
    sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_stats (
      batch_id TEXT PRIMARY KEY,
      
      -- 性能指标
      fastest_task_id TEXT,                  -- 最快任务ID
      fastest_time REAL,                     -- 最快耗时(秒)
      slowest_task_id TEXT,                  -- 最慢任务ID
      slowest_time REAL,                     -- 最慢耗时(秒)
      avg_time REAL,                         -- 平均耗时(秒)
      
      -- 错误统计
      network_errors INTEGER DEFAULT 0,      -- 网络错误次数
      timeout_errors INTEGER DEFAULT 0,      -- 超时错误次数
      rate_limit_errors INTEGER DEFAULT 0,   -- 限流次数
      terminated_errors INTEGER DEFAULT 0,   -- 程序中断次数
      unknown_errors INTEGER DEFAULT 0,      -- 未知错误次数
      
      -- 成本分析
      total_cost REAL DEFAULT 0,
      avg_cost_per_task REAL DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      
      -- 时间分析
      fast_completion_count INTEGER DEFAULT 0,    -- 快速完成(< 1s)
      normal_completion_count INTEGER DEFAULT 0,  -- 正常完成(1-3s)
      slow_completion_count INTEGER DEFAULT 0,    -- 缓慢完成(> 3s)
      
      -- 更新时间
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (batch_id) REFERENCES Llmtranslate_batches(id) ON DELETE CASCADE
    )`,
    indexes: []
  }
]

// ========== 合并所有表 ==========

const PROJECT_TABLES_V1_2_0: TableDefinition[] = [
  ...V1_1_0_TABLES,
  ...LLM_TRANSLATE_TABLES
]

// ========== Schema导出 ==========

export const PROJECT_SCHEMA_V1_2_0: SchemaDefinition = {
  version: '1.2.0',
  tables: PROJECT_TABLES_V1_2_0,
  description: 'Project database schema v1.2.0 - Added LLM Translate support'
}

export { PROJECT_TABLES_V1_2_0 as PROJECT_TABLES }
```

---

## 🔧 **类型定义 (强类型)**

### **文件位置**
```
src-electron/services/llm-translate-service/types.ts
```

### **完整类型定义**

```typescript
/**
 * LLM Translate Service 类型定义
 * 严格强类型，禁止 any
 */

// ========== 基础类型 ==========

export type TaskStatus = 'unsent' | 'waiting' | 'throttled' | 'error' | 'completed' | 'terminated'
export type BatchStatus = 'running' | 'paused' | 'completed' | 'failed' | 'terminated'
export type ChunkStrategy = 'line' | 'token'
export type ReplyMode = 'predicted' | 'equivalent'
export type ErrorType = 'network' | 'timeout' | 'rate_limit' | 'terminated' | 'unknown'

// ========== 配置类型 ==========

export interface TranslateConfig {
  inputSource: 'file' | 'text'
  content: string
  filePath: string
  systemPrompt: string
  chunkStrategy: ChunkStrategy
  chunkSize: number
  concurrency: number
  replyMode: ReplyMode
  predictedTokens: number
  modelId: string
  outputDir: string
}

// ========== 批次类型 ==========

export interface Batch {
  id: string
  status: BatchStatus
  configJson: string                         // TranslateConfig 的 JSON 序列化
  totalTasks: number
  completedTasks: number
  failedTasks: number
  throttledTasks: number
  waitingTasks: number
  unsentTasks: number
  terminatedTasks: number
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  avgTimePerTask: number
  fastestTaskTime: number
  slowestTaskTime: number
  estimatedCompletionTime: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
}

export interface BatchCreateRequest {
  config: TranslateConfig
  content: string
}

export interface BatchStats {
  totalTasks: number
  completedTasks: number
  failedTasks: number
  successRate: number
  totalCost: number
  estimatedTime: number
}

// ========== 任务类型 ==========

export interface Task {
  id: string
  batchId: string
  status: TaskStatus
  content: string
  translation: string | null
  inputTokens: number
  replyTokens: number
  predictedTokens: number
  progress: number
  sentTime: string | null
  replyTime: string | null
  durationMs: number | null
  errorMessage: string | null
  errorType: ErrorType | null
  retryCount: number
  cost: number
  metadataJson: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskCreateData {
  id: string
  batchId: string
  content: string
  predictedTokens: number
}

// ========== 统计类型 ==========

export interface TranslateStats {
  batchId: string
  fastestTaskId: string | null
  fastestTime: number | null
  slowestTaskId: string | null
  slowestTime: number | null
  avgTime: number
  networkErrors: number
  timeoutErrors: number
  rateLimitErrors: number
  terminatedErrors: number
  unknownErrors: number
  totalCost: number
  avgCostPerTask: number
  totalInputTokens: number
  totalOutputTokens: number
  fastCompletionCount: number
  normalCompletionCount: number
  slowCompletionCount: number
  updatedAt: string
}

// ========== 事件类型 ==========

export interface BatchCreateStartEvent {
  batchId: string
  totalTasks: number
}

export interface BatchCreatedEvent {
  batchId: string
  batch: Batch
  tasks: Task[]
}

export interface BatchCreateErrorEvent {
  batchId: string
  error: string
}

export interface TaskSubmitStartEvent {
  batchId: string
  taskIds: string[]
}

export interface TaskSubmittedEvent {
  batchId: string
  taskId: string
  sentTime: string
}

export interface TaskProgressEvent {
  batchId: string
  taskId: string
  replyTokens: number
  progress: number
  chunk: string
}

export interface TaskCompleteEvent {
  batchId: string
  taskId: string
  translation: string
  totalTokens: number
  durationMs: number
  cost: number
}

export interface TaskErrorEvent {
  batchId: string
  taskId: string
  errorType: ErrorType
  errorMessage: string
}

export interface BatchProgressEvent {
  batchId: string
  completedTasks: number
  totalTasks: number
  progress: number
}

export interface BatchCompleteEvent {
  batchId: string
  stats: BatchStats
}

export interface BatchPauseEvent {
  batchId: string
  pausedAt: string
}

export interface BatchResumeEvent {
  batchId: string
  resumedAt: string
}

export interface ExportStartEvent {
  exportId: string
  batchId: string
  format: 'txt' | 'csv' | 'json'
  taskCount: number
}

export interface ExportCompleteEvent {
  exportId: string
  filePath: string
  fileSize: number
}

export interface ExportErrorEvent {
  exportId: string
  error: string
}

// ========== 导出选项 ==========

export interface ExportOptions {
  format: 'txt' | 'csv' | 'json'
  includeFailed: boolean
  includeUnsent: boolean
  includeMetadata: boolean
  includeStats: boolean
  outputDir: string
  fileName: string
}

// ========== API 响应类型 ==========

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface BatchListResponse {
  batches: Batch[]
  total: number
}

export interface TaskListResponse {
  tasks: Task[]
  total: number
}
```

---

## 🏗️ **后端服务架构**

### **1. LlmTranslateService (主服务类)**

**文件位置**: `src-electron/services/llm-translate-service/llm-translate-service.ts`

```typescript
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
import { BatchManager } from './batch-manager'
import { TaskManager } from './task-manager'
import { TranslationExecutor } from './translation-executor'
import { ExportService } from './export-service'
import type {
  TranslateConfig,
  Batch,
  Task,
  BatchCreateStartEvent,
  BatchCreatedEvent,
  BatchCreateErrorEvent,
  TaskSubmitStartEvent,
  TaskSubmittedEvent,
  TaskProgressEvent,
  TaskCompleteEvent,
  TaskErrorEvent,
  BatchProgressEvent,
  BatchCompleteEvent,
  BatchPauseEvent,
  BatchResumeEvent,
  ExportStartEvent,
  ExportCompleteEvent,
  ExportErrorEvent,
  ExportOptions,
  BatchListResponse,
  TaskListResponse
} from './types'

export class LlmTranslateService extends EventEmitter {
  private projectDatabase: ProjectDatabase | null = null
  private llmChatService: LlmChatService
  private batchManager: BatchManager
  private taskManager: TaskManager
  private translationExecutor: TranslationExecutor
  private exportService: ExportService
  private activeBatches: Map<string, Batch> = new Map()

  constructor(llmChatService: LlmChatService) {
    super()
    this.llmChatService = llmChatService
    this.batchManager = new BatchManager(this)
    this.taskManager = new TaskManager(this)
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

    const terminatedTasks = await this.projectDatabase.query<Task>(
      `UPDATE Llmtranslate_tasks 
       SET status = 'terminated', 
           error_type = 'terminated',
           error_message = '程序异常终止，任务未完成',
           updated_at = CURRENT_TIMESTAMP
       WHERE status = 'waiting'
       RETURNING *`
    )

    if (terminatedTasks.length > 0) {
      console.log(`⚠️ [LlmTranslateService] 发现 ${terminatedTasks.length} 个中断任务，已标记为 terminated`)
      
      // 更新批次统计
      for (const task of terminatedTasks) {
        await this.updateBatchStats(task.batchId)
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

      // 1. 根据分片策略分割内容
      const chunks = this.chunkContent(content, config.chunkStrategy, config.chunkSize)
      const totalTasks = chunks.length

      console.log(`📦 [LlmTranslateService] 批次 ${batchId} - 分割为 ${totalTasks} 个任务`)

      // 2. 创建批次记录
      const batch: Batch = {
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

      await this.projectDatabase.run(
        `INSERT INTO Llmtranslate_batches (
          id, status, config_json, total_tasks, unsent_tasks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [batch.id, batch.status, batch.configJson, batch.totalTasks, batch.unsentTasks, batch.createdAt, batch.updatedAt]
      )

      // 3. 创建任务记录
      const tasks: Task[] = []
      for (let i = 0; i < chunks.length; i++) {
        const taskId = `${batchId}-${i + 1}`
        const task: Task = {
          id: taskId,
          batchId: batch.id,
          status: 'unsent',
          content: chunks[i],
          translation: null,
          inputTokens: this.estimateTokens(chunks[i]),
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

        await this.projectDatabase.run(
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
      await this.projectDatabase.run(
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
        chunks.push(lines.slice(i, i + chunkSize).join('\n'))
      }
    } else {
      // 按 Token 分片（但保持行完整）
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
          currentChunk.push(line)
          currentTokens += lineTokens
        }
      }

      // 保存最后一个块
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n'))
      }
    }

    return chunks
  }

  /**
   * 估算 Token 数（简单算法：字符数 / 4）
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * 提交任务到 LLM（批量）
   * 立即返回 submissionId，通过事件反馈每个任务的提交状态
   */
  async submitTasks(batchId: string, taskIds: string[]): Promise<string> {
    const submissionId = `sub_${Date.now()}_${nanoid(6)}`
    
    // ✅ 发射提交开始事件
    this.emit('task:submit-start', {
      batchId,
      taskIds
    } as TaskSubmitStartEvent)
    
    // ✅ 异步提交
    this.submitTasksAsync(batchId, taskIds, submissionId)
    
    return submissionId
  }

  /**
   * 异步提交任务
   */
  private async submitTasksAsync(
    batchId: string,
    taskIds: string[],
    submissionId: string
  ): Promise<void> {
    if (!this.projectDatabase) return

    const batch = await this.getBatch(batchId)
    if (!batch) {
      console.error(`❌ [LlmTranslateService] 批次 ${batchId} 不存在`)
      return
    }

    const config: TranslateConfig = JSON.parse(batch.configJson)
    const concurrency = config.concurrency

    // 使用翻译执行器处理任务队列
    await this.translationExecutor.executeTasks(batchId, taskIds, config, concurrency)
  }

  /**
   * 获取批次列表
   */
  async getBatches(): Promise<BatchListResponse> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const batches = await this.projectDatabase.query<Batch>(
      `SELECT * FROM Llmtranslate_batches ORDER BY created_at DESC`
    )

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

    const batches = await this.projectDatabase.query<Batch>(
      `SELECT * FROM Llmtranslate_batches WHERE id = ?`,
      [batchId]
    )

    return batches[0] || null
  }

  /**
   * 获取批次的任务列表
   */
  async getTasks(batchId: string): Promise<TaskListResponse> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const tasks = await this.projectDatabase.query<Task>(
      `SELECT * FROM Llmtranslate_tasks WHERE batch_id = ? ORDER BY created_at ASC`,
      [batchId]
    )

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

    const tasks = await this.projectDatabase.query<Task>(
      `SELECT * FROM Llmtranslate_tasks WHERE id = ?`,
      [taskId]
    )

    return tasks[0] || null
  }

  /**
   * 暂停批次
   */
  async pauseBatch(batchId: string): Promise<void> {
    if (!this.projectDatabase) return

    await this.projectDatabase.run(
      `UPDATE Llmtranslate_batches SET status = 'paused', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [batchId]
    )

    this.translationExecutor.pauseBatch(batchId)

    this.emit('batch:paused', {
      batchId,
      pausedAt: new Date().toISOString()
    } as BatchPauseEvent)
  }

  /**
   * 恢复批次
   */
  async resumeBatch(batchId: string): Promise<void> {
    if (!this.projectDatabase) return

    await this.projectDatabase.run(
      `UPDATE Llmtranslate_batches SET status = 'running', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [batchId]
    )

    this.translationExecutor.resumeBatch(batchId)

    this.emit('batch:resumed', {
      batchId,
      resumedAt: new Date().toISOString()
    } as BatchResumeEvent)
  }

  /**
   * 导出批次结果
   * 通过 Electron Dialog 选择路径
   */
  async exportBatch(batchId: string, options: ExportOptions): Promise<string> {
    const exportId = `export_${Date.now()}_${nanoid(6)}`
    
    this.emit('export:start', {
      exportId,
      batchId,
      format: options.format,
      taskCount: 0  // 稍后更新
    } as ExportStartEvent)
    
    this.exportBatchAsync(exportId, batchId, options)
    
    return exportId
  }

  /**
   * 异步导出
   */
  private async exportBatchAsync(
    exportId: string,
    batchId: string,
    options: ExportOptions
  ): Promise<void> {
    try {
      const result = await this.exportService.export(batchId, options)
      
      this.emit('export:complete', {
        exportId,
        filePath: result.filePath,
        fileSize: result.fileSize
      } as ExportCompleteEvent)
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.emit('export:error', {
        exportId,
        error: errorMessage
      } as ExportErrorEvent)
    }
  }

  /**
   * 重试失败任务
   */
  async retryFailedTasks(batchId: string): Promise<string> {
    if (!this.projectDatabase) {
      throw new Error('Project database not initialized')
    }

    const failedTasks = await this.projectDatabase.query<Task>(
      `SELECT id FROM Llmtranslate_tasks 
       WHERE batch_id = ? AND status IN ('error', 'throttled', 'terminated')`,
      [batchId]
    )

    const taskIds = failedTasks.map((t: Task) => t.id)
    
    if (taskIds.length === 0) {
      throw new Error('没有需要重试的任务')
    }

    // 重置任务状态
    await this.projectDatabase.run(
      `UPDATE Llmtranslate_tasks 
       SET status = 'unsent', 
           error_message = NULL, 
           error_type = NULL, 
           retry_count = retry_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${taskIds.map(() => '?').join(',')})`,
      taskIds
    )

    // 重新提交
    return await this.submitTasks(batchId, taskIds)
  }

  /**
   * 更新批次统计
   */
  private async updateBatchStats(batchId: string): Promise<void> {
    if (!this.projectDatabase) return

    const stats = await this.projectDatabase.query<{
      completed: number
      failed: number
      throttled: number
      waiting: number
      unsent: number
      terminated: number
    }>(
      `SELECT 
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'throttled' THEN 1 ELSE 0 END) as throttled,
        SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
        SUM(CASE WHEN status = 'unsent' THEN 1 ELSE 0 END) as unsent,
        SUM(CASE WHEN status = 'terminated' THEN 1 ELSE 0 END) as terminated
       FROM Llmtranslate_tasks WHERE batch_id = ?`,
      [batchId]
    )

    if (stats[0]) {
      await this.projectDatabase.run(
        `UPDATE Llmtranslate_batches 
         SET completed_tasks = ?, 
             failed_tasks = ?, 
             throttled_tasks = ?, 
             waiting_tasks = ?, 
             unsent_tasks = ?,
             terminated_tasks = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          stats[0].completed,
          stats[0].failed,
          stats[0].throttled,
          stats[0].waiting,
          stats[0].unsent,
          stats[0].terminated,
          batchId
        ]
      )
    }
  }

  /**
   * 加载所有批次
   */
  private async loadBatches(): Promise<void> {
    if (!this.projectDatabase) return

    const batches = await this.projectDatabase.query<Batch>(
      `SELECT * FROM Llmtranslate_batches ORDER BY created_at DESC LIMIT 100`
    )

    this.activeBatches.clear()
    for (const batch of batches) {
      this.activeBatches.set(batch.id, batch)
    }

    console.log(`📚 [LlmTranslateService] 加载了 ${batches.length} 个批次`)
  }

  /**
   * 获取项目数据库（供子模块使用）
   */
  getProjectDatabase(): ProjectDatabase | null {
    return this.projectDatabase
  }
}
```

---

## 🎯 **翻译执行器 (TranslationExecutor)**

**文件位置**: `src-electron/services/llm-translate-service/translation-executor.ts`

```typescript
/**
 * 翻译执行器 - Electron 主进程任务队列管理器
 * 
 * 职责：
 * - 管理任务队列（FIFO）
 * - 并发控制（限制同时执行的任务数）
 * - 与 LlmChatService 交互调用本地LLM进行翻译
 * - 监听流式响应并广播进度事件
 * - 错误捕获和重试逻辑
 * 
 * ⚠️ 所有操作都在主进程本地完成，无外部网络调用
 */

import type { LlmTranslateService } from './llm-translate-service'
import type { LlmChatService } from '../llm-chat-service/llm-chat-service'
import type { TranslateConfig, Task, TaskStatus, ErrorType } from './types'

export class TranslationExecutor {
  private llmTranslateService: LlmTranslateService
  private llmChatService: LlmChatService
  private taskQueues: Map<string, string[]> = new Map()  // batchId -> taskIds[]
  private pausedBatches: Set<string> = new Set()
  private activeTaskCount: Map<string, number> = new Map()  // batchId -> count

  constructor(llmTranslateService: LlmTranslateService, llmChatService: LlmChatService) {
    this.llmTranslateService = llmTranslateService
    this.llmChatService = llmChatService
  }

  /**
   * 执行任务队列
   * 使用并发控制，限制同时执行的任务数
   */
  async executeTasks(
    batchId: string,
    taskIds: string[],
    config: TranslateConfig,
    concurrency: number
  ): Promise<void> {
    this.taskQueues.set(batchId, [...taskIds])
    this.activeTaskCount.set(batchId, 0)

    console.log(`🎬 [TranslationExecutor] 开始执行批次 ${batchId}，共 ${taskIds.length} 个任务，并发: ${concurrency}`)

    // 启动并发任务
    const workers: Promise<void>[] = []
    for (let i = 0; i < Math.min(concurrency, taskIds.length); i++) {
      workers.push(this.worker(batchId, config))
    }

    await Promise.all(workers)

    console.log(`✅ [TranslationExecutor] 批次 ${batchId} 执行完成`)
  }

  /**
   * 工作线程：不断从队列取任务并执行
   */
  private async worker(batchId: string, config: TranslateConfig): Promise<void> {
    while (true) {
      // 检查是否暂停
      if (this.pausedBatches.has(batchId)) {
        console.log(`⏸️ [TranslationExecutor] 批次 ${batchId} 已暂停，工作线程退出`)
        break
      }

      // 从队列取任务
      const queue = this.taskQueues.get(batchId)
      if (!queue || queue.length === 0) {
        break  // 队列空了，退出
      }

      const taskId = queue.shift()
      if (!taskId) break

      // 执行任务
      await this.executeTask(batchId, taskId, config)

      // 等待间隔（防止限流）
      await this.delay(1000 / config.concurrency * 60)  // 基于并发数计算间隔
    }
  }

  /**
   * 执行单个任务
   */
  private async executeTask(batchId: string, taskId: string, config: TranslateConfig): Promise<void> {
    const projectDb = this.llmTranslateService.getProjectDatabase()
    if (!projectDb) return

    try {
      // 1. 获取任务
      const task = await this.llmTranslateService.getTask(taskId)
      if (!task) {
        throw new Error(`Task ${taskId} not found`)
      }

      // 2. 更新状态为 waiting
      await projectDb.run(
        `UPDATE Llmtranslate_tasks 
         SET status = 'waiting', sent_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [taskId]
      )

      this.llmTranslateService.emit('task:submitted', {
        batchId,
        taskId,
        sentTime: new Date().toISOString()
      })

      // 3. 调用 LLM API 进行翻译（使用 LlmChatService）
      const startTime = Date.now()
      let translationResult = ''
      let replyTokens = 0

      // 创建临时对话
      const conversationId = await this.llmChatService.createConversation(config.modelId, {
        temperature: 0.7,
        maxTokens: config.predictedTokens
      })

      // 监听流式响应
      const messageId = await this.llmChatService.sendMessage(conversationId, 
        `${config.systemPrompt}\n\n${task.content}`
      )

      // 通过事件监听流式进度
      const chunkHandler = (data: { messageId: string; chunk: string; conversationId: string }) => {
        if (data.conversationId === conversationId && data.messageId === messageId) {
          translationResult += data.chunk
          replyTokens = this.estimateTokens(translationResult)
          
          const progress = Math.min((replyTokens / task.predictedTokens) * 100, 100)

          // 发射进度事件
          this.llmTranslateService.emit('task:progress', {
            batchId,
            taskId,
            replyTokens,
            progress,
            chunk: data.chunk
          })

          // 更新数据库进度
          projectDb.run(
            `UPDATE Llmtranslate_tasks 
             SET reply_tokens = ?, progress = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [replyTokens, progress, taskId]
          )
        }
      }

      this.llmChatService.on('message:chunk', chunkHandler)

      // 等待响应完成
      await new Promise<void>((resolve, reject) => {
        const completeHandler = (data: { messageId: string; conversationId: string }) => {
          if (data.conversationId === conversationId && data.messageId === messageId) {
            this.llmChatService.off('message:chunk', chunkHandler)
            this.llmChatService.off('message:complete', completeHandler)
            this.llmChatService.off('message:error', errorHandler)
            resolve()
          }
        }

        const errorHandler = (data: { messageId: string; conversationId: string; error: string }) => {
          if (data.conversationId === conversationId && data.messageId === messageId) {
            this.llmChatService.off('message:chunk', chunkHandler)
            this.llmChatService.off('message:complete', completeHandler)
            this.llmChatService.off('message:error', errorHandler)
            reject(new Error(data.error))
          }
        }

        this.llmChatService.on('message:complete', completeHandler)
        this.llmChatService.on('message:error', errorHandler)
      })

      // 4. 任务完成
      const durationMs = Date.now() - startTime
      const cost = this.calculateCost(task.inputTokens, replyTokens, config.modelId)

      await projectDb.run(
        `UPDATE Llmtranslate_tasks 
         SET status = 'completed', 
             translation = ?,
             reply_tokens = ?,
             progress = 100,
             reply_time = CURRENT_TIMESTAMP,
             duration_ms = ?,
             cost = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [translationResult, replyTokens, durationMs, cost, taskId]
      )

      // 5. 发射完成事件
      this.llmTranslateService.emit('task:complete', {
        batchId,
        taskId,
        translation: translationResult,
        totalTokens: replyTokens,
        durationMs,
        cost
      })

      // 6. 清理临时对话
      await this.llmChatService.deleteConversation(conversationId)

    } catch (error) {
      // 错误处理
      const errorMessage = error instanceof Error ? error.message : String(error)
      let errorType: ErrorType = 'unknown'

      if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        errorType = 'rate_limit'
        await projectDb.run(
          `UPDATE Llmtranslate_tasks 
           SET status = 'throttled', error_type = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorType, errorMessage, taskId]
        )
      } else if (errorMessage.includes('timeout')) {
        errorType = 'timeout'
        await projectDb.run(
          `UPDATE Llmtranslate_tasks 
           SET status = 'error', error_type = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorType, errorMessage, taskId]
        )
      } else {
        await projectDb.run(
          `UPDATE Llmtranslate_tasks 
           SET status = 'error', error_type = 'unknown', error_message = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [errorMessage, taskId]
        )
      }

      // 发射错误事件
      this.llmTranslateService.emit('task:error', {
        batchId,
        taskId,
        errorType,
        errorMessage
      })
    }
  }

  /**
   * 暂停批次
   */
  pauseBatch(batchId: string): void {
    this.pausedBatches.add(batchId)
    console.log(`⏸️ [TranslationExecutor] 批次 ${batchId} 已暂停`)
  }

  /**
   * 恢复批次
   */
  resumeBatch(batchId: string): void {
    this.pausedBatches.delete(batchId)
    console.log(`▶️ [TranslationExecutor] 批次 ${batchId} 已恢复`)
    
    // TODO: 重新启动工作线程
  }

  /**
   * 估算 Token 数
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * 计算成本
   */
  private calculateCost(inputTokens: number, outputTokens: number, modelId: string): number {
    // 示例价格（需要根据实际模型调整）
    const INPUT_PRICE_PER_1K = 0.03  // $0.03 per 1K tokens
    const OUTPUT_PRICE_PER_1K = 0.06 // $0.06 per 1K tokens
    
    return (inputTokens / 1000) * INPUT_PRICE_PER_1K + (outputTokens / 1000) * OUTPUT_PRICE_PER_1K
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

---

## 🔗 **IPC 通信层**

### **文件位置**
```
src-electron/ipc/main-renderer/llm-translate-handlers.ts
```

### **IPC Handlers 实现（纯Electron 进程间通信）**

```typescript
/**
 * LLM Translate IPC 处理器
 * 主进程监听来自渲染进程的 IPC 消息，调用 LlmTranslateService 执行业务逻辑
 * 通过事件驱动架构向所有渲染窗口广播进度反馈
 * 
 * 架构说明：
 * - 无后端服务器，无网络请求
 * - 所有数据操作在主进程本地完成
 * - 通过 IPC 与渲染进程通信
 * - 使用 EventEmitter 实现事件驱动
 */

import { ipcMain, BrowserWindow, dialog } from 'electron'
import type { LlmTranslateService } from '../../services/llm-translate-service/llm-translate-service'
import type {
  TranslateConfig,
  ExportOptions,
  BatchCreateStartEvent,
  BatchCreatedEvent,
  BatchCreateErrorEvent,
  TaskSubmitStartEvent,
  TaskSubmittedEvent,
  TaskProgressEvent,
  TaskCompleteEvent,
  TaskErrorEvent,
  BatchPauseEvent,
  BatchResumeEvent,
  ExportStartEvent,
  ExportCompleteEvent,
  ExportErrorEvent
} from '../../services/llm-translate-service/types'

export function registerLlmTranslateHandlers(llmTranslateService: LlmTranslateService) {
  
  // ========== 事件监听器（只注册一次） ==========
  
  llmTranslateService.on('batch:create-start', (data: BatchCreateStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-create-start', data)
    })
  })

  llmTranslateService.on('batch:created', (data: BatchCreatedEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-created', data)
    })
  })

  llmTranslateService.on('batch:create-error', (data: BatchCreateErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-create-error', data)
    })
  })

  llmTranslateService.on('task:submit-start', (data: TaskSubmitStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-submit-start', data)
    })
  })

  llmTranslateService.on('task:submitted', (data: TaskSubmittedEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-submitted', data)
    })
  })

  llmTranslateService.on('task:progress', (data: TaskProgressEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-progress', data)
    })
  })

  llmTranslateService.on('task:complete', (data: TaskCompleteEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-complete', data)
    })
  })

  llmTranslateService.on('task:error', (data: TaskErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-error', data)
    })
  })

  llmTranslateService.on('batch:paused', (data: BatchPauseEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-paused', data)
    })
  })

  llmTranslateService.on('batch:resumed', (data: BatchResumeEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-resumed', data)
    })
  })

  llmTranslateService.on('export:start', (data: ExportStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:export-start', data)
    })
  })

  llmTranslateService.on('export:complete', (data: ExportCompleteEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:export-complete', data)
    })
  })

  llmTranslateService.on('export:error', (data: ExportErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:export-error', data)
    })
  })

  // ========== IPC Handlers（纯调用） ==========

  /**
   * 创建批次
   */
  ipcMain.handle('llm-translate:create-batch', async (_event, args: {
    config: TranslateConfig
    content: string
  }) => {
    try {
      const batchId = await llmTranslateService.createBatch(args.config, args.content)
      return { success: true, batchId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 获取批次列表
   */
  ipcMain.handle('llm-translate:get-batches', async () => {
    try {
      const result = await llmTranslateService.getBatches()
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 获取批次的任务列表
   */
  ipcMain.handle('llm-translate:get-tasks', async (_event, args: { batchId: string }) => {
    try {
      const result = await llmTranslateService.getTasks(args.batchId)
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 获取单个任务
   */
  ipcMain.handle('llm-translate:get-task', async (_event, args: { taskId: string }) => {
    try {
      const task = await llmTranslateService.getTask(args.taskId)
      return { success: true, data: task }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 提交任务
   */
  ipcMain.handle('llm-translate:submit-tasks', async (_event, args: {
    batchId: string
    taskIds: string[]
  }) => {
    try {
      const submissionId = await llmTranslateService.submitTasks(args.batchId, args.taskIds)
      return { success: true, submissionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 重试失败任务
   */
  ipcMain.handle('llm-translate:retry-failed-tasks', async (_event, args: { batchId: string }) => {
    try {
      const submissionId = await llmTranslateService.retryFailedTasks(args.batchId)
      return { success: true, submissionId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 暂停批次
   */
  ipcMain.handle('llm-translate:pause-batch', async (_event, args: { batchId: string }) => {
    try {
      await llmTranslateService.pauseBatch(args.batchId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 恢复批次
   */
  ipcMain.handle('llm-translate:resume-batch', async (_event, args: { batchId: string }) => {
    try {
      await llmTranslateService.resumeBatch(args.batchId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 选择文件路径（文件上传）
   */
  ipcMain.handle('llm-translate:select-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('Window not found')

      const result = await dialog.showOpenDialog(win, {
        title: '选择待翻译文件',
        properties: ['openFile'],
        filters: [
          { name: '文本文件', extensions: ['txt', 'md'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const filePath = result.filePaths[0]
      
      // 读取文件内容
      const fs = await import('fs/promises')
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)

      return {
        success: true,
        data: {
          filePath,
          fileName: filePath.split(/[/\\]/).pop() || '',
          fileSize: stats.size,
          content
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 选择输出目录（导出）
   */
  ipcMain.handle('llm-translate:select-output-dir', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('Window not found')

      const result = await dialog.showOpenDialog(win, {
        title: '选择输出目录',
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, data: { outputDir: result.filePaths[0] } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 导出批次
   */
  ipcMain.handle('llm-translate:export-batch', async (_event, args: {
    batchId: string
    options: ExportOptions
  }) => {
    try {
      const exportId = await llmTranslateService.exportBatch(args.batchId, args.options)
      return { success: true, exportId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  console.log('✅ [IPC] LLM Translate handlers registered')
}
```

---

## 💾 **前端 Store 集成 (强类型)**

### **更新 LlmTranslate.store.ts**

```typescript
/**
 * LlmTranslate Store - IPC 通信版本（纯Electron本地应用）
 * 强类型，事件驱动
 * 通过 IPC 与主进程的 LlmTranslateService 通信
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockBatchList, mockTaskList } from './mock'
import type { 
  Batch, 
  Task, 
  TranslateConfig, 
  TaskFilter,
  BatchCreateStartEvent,
  BatchCreatedEvent,
  TaskProgressEvent,
  TaskCompleteEvent,
  TaskErrorEvent
} from '../types'

// ⭐ 无后端服务器，所有操作通过 IPC 在本地进行
// 渲染进程 ←→ IPC Bridge ←→ 主进程 (LlmTranslateService)

export const useLlmTranslateStore = defineStore('llmTranslate', () => {
  // ⭐ 单一开关：改这里切换 Mock ↔ Electron 本地服务
  const useMock = ref(import.meta.env.MODE === 'development')

  // ==================== 状态定义 ====================
  
  const config = ref<TranslateConfig>({
    inputSource: 'file',
    content: '',
    filePath: '',
    systemPrompt: '你是一个专业的翻译助手，请将以下内容翻译成英文。',
    chunkStrategy: 'line',
    chunkSize: 50,
    concurrency: 3,
    replyMode: 'predicted',
    predictedTokens: 2000,
    modelId: 'gpt-4',
    outputDir: 'D:\\output\\translate\\'
  })

  const batchList = ref<Batch[]>([])
  const currentBatch = ref<Batch | null>(null)
  const taskList = ref<Task[]>([])
  const selectedTasks = ref<string[]>([])
  const taskFilters = ref<TaskFilter>({
    status: ['waiting', 'throttled', 'error', 'unsent'],
    searchText: ''
  })
  const threadDrawer = ref({
    isOpen: false,
    currentTaskId: null as string | null
  })
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ==================== 事件监听器设置 ==========

  function setupListeners(): void {
    if (useMock.value) return  // Mock 模式不需要监听

    // 批次创建事件
    window.nimbria.llmTranslate.onBatchCreateStart((data: BatchCreateStartEvent) => {
      console.log('📦 [Store] 批次创建开始:', data.batchId)
    })

    window.nimbria.llmTranslate.onBatchCreated((data: BatchCreatedEvent) => {
      console.log('✅ [Store] 批次创建完成:', data.batchId)
      
      // 更新批次列表
      batchList.value.unshift(data.batch)
      currentBatch.value = data.batch
      taskList.value = data.tasks
    })

    window.nimbria.llmTranslate.onBatchCreateError((data: BatchCreateErrorEvent) => {
      console.error('❌ [Store] 批次创建失败:', data.error)
      error.value = data.error
    })

    // 任务进度事件
    window.nimbria.llmTranslate.onTaskProgress((data: TaskProgressEvent) => {
      const task = taskList.value.find((t: Task) => t.id === data.taskId)
      if (task) {
        task.replyTokens = data.replyTokens
        task.progress = data.progress
        task.translation = (task.translation || '') + data.chunk
      }
    })

    // 任务完成事件
    window.nimbria.llmTranslate.onTaskComplete((data: TaskCompleteEvent) => {
      const task = taskList.value.find((t: Task) => t.id === data.taskId)
      if (task) {
        task.status = 'completed'
        task.translation = data.translation
        task.progress = 100
        task.replyTokens = data.totalTokens
      }
      
      // 更新批次统计
      if (currentBatch.value && currentBatch.value.id === data.batchId) {
        currentBatch.value.completedTasks++
      }
    })

    // 任务错误事件
    window.nimbria.llmTranslate.onTaskError((data: TaskErrorEvent) => {
      const task = taskList.value.find((t: Task) => t.id === data.taskId)
      if (task) {
        if (data.errorType === 'rate_limit') {
          task.status = 'throttled'
        } else {
          task.status = 'error'
        }
        task.errorMessage = data.errorMessage
        task.errorType = data.errorType
      }
      
      // 更新批次统计
      if (currentBatch.value && currentBatch.value.id === data.batchId) {
        if (data.errorType === 'rate_limit') {
          currentBatch.value.throttledTasks++
        } else {
          currentBatch.value.failedTasks++
        }
      }
    })
  }

  // ==================== 数据获取方法 ====================

  async function fetchBatchList(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        batchList.value = mockBatchList
      } else {
        // 通过 IPC 调用主进程的 getBatches()
        const result = await window.nimbria.llmTranslate.getBatches()
        if (result.success && result.data) {
          batchList.value = result.data.batches
        } else {
          throw new Error(result.error || '获取批次列表失败')
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取批次列表失败'
      console.error('Failed to fetch batch list:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchTaskList(batchId: string): Promise<void> {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        taskList.value = mockTaskList.filter((t: Task) => t.batchId === batchId)
      } else {
        // 通过 IPC 调用主进程的 getTasks()
        const result = await window.nimbria.llmTranslate.getTasks({ batchId })
        if (result.success && result.data) {
          taskList.value = result.data.tasks
        } else {
          throw new Error(result.error || '获取任务列表失败')
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取任务列表失败'
      console.error('Failed to fetch task list:', err)
    } finally {
      loading.value = false
    }
  }

  async function createBatch(configData: TranslateConfig): Promise<Batch> {
    loading.value = true
    error.value = null

    try {
      if (useMock.value) {
        // Mock 模式
        const newBatch: Batch = {
          id: `#${Date.now().toString().slice(-8)}`,
          status: 'running',
          totalTasks: 100,
          completedTasks: 0,
          failedTasks: 0,
          throttledTasks: 0,
          waitingTasks: 0,
          unsentTasks: 100,
          terminatedTasks: 0,
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          avgTimePerTask: 0,
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
          updatedAt: new Date().toISOString()
        }
        currentBatch.value = newBatch
        batchList.value.unshift(newBatch)
        return newBatch
      } else {
        // 通过 IPC 调用主进程创建批次
        const result = await window.nimbria.llmTranslate.createBatch({
          config: configData,
          content: configData.content
        })
        
        if (!result.success || !result.batchId) {
          throw new Error(result.error || '创建批次失败')
        }

        // 等待批次创建完成事件（通过 Promise + 事件监听）
        return await new Promise<Batch>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('创建超时')), 10000)
          
          const handler = (data: BatchCreatedEvent) => {
            if (data.batchId === result.batchId) {
              clearTimeout(timeout)
              resolve(data.batch)
            }
          }
          
          window.nimbria.llmTranslate.onBatchCreated(handler)
        })
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建批次失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  // ... 其他方法保持不变

  return {
    config,
    batchList,
    currentBatch,
    taskList,
    selectedTasks,
    taskFilters,
    threadDrawer,
    loading,
    error,
    setupListeners,
    fetchBatchList,
    fetchTaskList,
    createBatch
    // ... 其他方法
  }
})
```

---

## 🔗 **Preload API 定义 (强类型)**

### **文件位置**
```
src-electron/core/project-preload.ts
```

### **IPC 通信 API 暴露（纯Electron）**

```typescript
/**
 * LLM Translate IPC API - 主进程通信接口（强类型）
 * 
 * 架构流程：
 * 渲染进程 → ipcRenderer → IPC Bridge → 主进程 LlmTranslateService → 数据库/LLM
 * 
 * ⚠️ 无后端服务器，所有数据操作都在主进程本地完成
 */

import type {
  TranslateConfig,
  ExportOptions,
  Batch,
  Task,
  BatchListResponse,
  TaskListResponse,
  ApiResponse
} from '../services/llm-translate-service/types'

// 在 contextBridge.exposeInMainWorld 中添加
llmTranslate: {
  // ===== 数据查询（同步IPC调用） =====
  getBatches: (): Promise<ApiResponse<BatchListResponse>> => 
    ipcRenderer.invoke('llm-translate:get-batches'),
  
  getTasks: (args: { batchId: string }): Promise<ApiResponse<TaskListResponse>> =>
    ipcRenderer.invoke('llm-translate:get-tasks', args),
  
  getTask: (args: { taskId: string }): Promise<ApiResponse<Task | null>> =>
    ipcRenderer.invoke('llm-translate:get-task', args),
  
  // ===== 批次操作（异步IPC调用 + 事件反馈） =====
  createBatch: (args: { config: TranslateConfig; content: string }): Promise<ApiResponse<{ batchId: string }>> =>
    ipcRenderer.invoke('llm-translate:create-batch', args),
  
  submitTasks: (args: { batchId: string; taskIds: string[] }): Promise<ApiResponse<{ submissionId: string }>> =>
    ipcRenderer.invoke('llm-translate:submit-tasks', args),
  
  retryFailedTasks: (args: { batchId: string }): Promise<ApiResponse<{ submissionId: string }>> =>
    ipcRenderer.invoke('llm-translate:retry-failed-tasks', args),
  
  pauseBatch: (args: { batchId: string }): Promise<ApiResponse<void>> =>
    ipcRenderer.invoke('llm-translate:pause-batch', args),
  
  resumeBatch: (args: { batchId: string }): Promise<ApiResponse<void>> =>
    ipcRenderer.invoke('llm-translate:resume-batch', args),
  
  // ===== 本地文件操作（Electron Dialog） =====
  selectFile: (): Promise<ApiResponse<{ filePath: string; fileName: string; fileSize: number; content: string }>> =>
    ipcRenderer.invoke('llm-translate:select-file'),
  
  selectOutputDir: (): Promise<ApiResponse<{ outputDir: string }>> =>
    ipcRenderer.invoke('llm-translate:select-output-dir'),
  
  exportBatch: (args: { batchId: string; options: ExportOptions }): Promise<ApiResponse<{ exportId: string }>> =>
    ipcRenderer.invoke('llm-translate:export-batch', args),
  
  // ===== 事件监听（IPC 事件流） =====
  // 这些事件由主进程发射，渲染进程监听以获取实时反馈
  
  onBatchCreateStart: (callback: (data: BatchCreateStartEvent) => void) => {
    ipcRenderer.on('llm-translate:batch-create-start', (_event, data) => callback(data))
  },
  
  onBatchCreated: (callback: (data: BatchCreatedEvent) => void) => {
    ipcRenderer.on('llm-translate:batch-created', (_event, data) => callback(data))
  },
  
  onBatchCreateError: (callback: (data: BatchCreateErrorEvent) => void) => {
    ipcRenderer.on('llm-translate:batch-create-error', (_event, data) => callback(data))
  },
  
  onTaskProgress: (callback: (data: TaskProgressEvent) => void) => {
    ipcRenderer.on('llm-translate:task-progress', (_event, data) => callback(data))
  },
  
  onTaskComplete: (callback: (data: TaskCompleteEvent) => void) => {
    ipcRenderer.on('llm-translate:task-complete', (_event, data) => callback(data))
  },
  
  onTaskError: (callback: (data: TaskErrorEvent) => void) => {
    ipcRenderer.on('llm-translate:task-error', (_event, data) => callback(data))
  }
  
  // ... 其他事件监听器
}
```

---

## 📋 **循序渐进实现 TODO (5 阶段)**

```markdown
### Phase 0: 准备工作 ✅
- [x] 创建 `src-electron/services/llm-translate-service/` 目录
- [x] 创建 `types.ts` - 定义所有强类型接口
- [x] 创建 Schema v1.2.0 - 定义数据库表结构

### Phase 1: 数据查询（本地IPC读取）
- [ ] 实现 `LlmTranslateService.getBatches()` - 从SQLite查询批次列表
- [ ] 实现 `LlmTranslateService.getTasks(batchId)` - 从SQLite查询任务列表
- [ ] 实现 `LlmTranslateService.getTask(taskId)` - 从SQLite查询单个任务
- [ ] 注册 IPC Handlers: `llm-translate:get-batches`, `llm-translate:get-tasks`, `llm-translate:get-task`
- [ ] 更新 `project-preload.ts` - 暴露IPC方法
- [ ] **测试**: 前端通过IPC调用，验证从数据库读取数据

### Phase 2: 批次创建（事件驱动异步）
- [ ] 实现 `LlmTranslateService.createBatch()` - 创建批次和内容分片
- [ ] 实现 `chunkContent()` - 按行/按Token分片逻辑
- [ ] 实现 `handleTerminatedTasks()` - 程序中断恢复（将waiting标记为terminated）
- [ ] 注册事件监听器: `batch:create-start`, `batch:created`, `batch:create-error`
- [ ] 注册 IPC Handler: `llm-translate:create-batch`（立即返回batchId）
- [ ] 前端 Store 添加事件监听: `setupListeners()`
- [ ] **测试**: 调用createBatch → 监听事件反馈 → 验证数据库中的分片

### Phase 3: 任务执行（流式翻译）
- [ ] 实现 `TranslationExecutor.executeTasks()` - 任务队列管理
- [ ] 实现 `TranslationExecutor.worker()` - 并发工作线程
- [ ] 实现 `TranslationExecutor.executeTask()` - 单个任务执行
- [ ] 集成 `LlmChatService` - 调用本地LLM服务
- [ ] 实现流式进度更新 - 监听 `message:chunk` 事件并广播进度
- [ ] 注册任务事件: `task:submitted`, `task:progress`, `task:complete`, `task:error`
- [ ] **测试**: 提交任务 → 观察流式进度 → 验证翻译结果保存

### Phase 4: 控制与导出
- [ ] 实现 `pauseBatch()` / `resumeBatch()` - 暂停/恢复批次
- [ ] 实现 `retryFailedTasks()` - 重试失败的任务
- [ ] 实现 `ExportService.export()` - 导出服务
- [ ] 实现本地文件选择: `llm-translate:select-file`, `llm-translate:select-output-dir`
- [ ] 实现导出格式生成: TXT / CSV / JSON
- [ ] **测试**: 暂停/恢复批次 → 重试失败任务 → 验证文件导出

### Phase 5: 统计与优化
- [ ] 实现 `updateBatchStats()` - 实时更新批次统计
- [ ] 实现 `Llmtranslate_stats` 表的统计计算
- [ ] 实现错误分类统计: network/timeout/rate_limit/terminated
- [ ] 优化并发控制: 限流时自动降低并发
- [ ] 优化重试机制: 指数退避算法
- [ ] **测试**: 查看统计分析 → 验证性能指标准确
```

---

## 🎯 **关键实现要点**

### 1. **程序中断处理（Electron graceful shutdown）**
```typescript
// 在 LlmTranslateService.initialize() 中
await this.handleTerminatedTasks()

private async handleTerminatedTasks(): Promise<void> {
  const terminatedTasks = await projectDb.query<Task>(
    `UPDATE Llmtranslate_tasks 
     SET status = 'terminated', 
         error_type = 'terminated',
         error_message = '程序异常终止，任务未完成'
     WHERE status = 'waiting'
     RETURNING *`
  )
  // 更新批次统计...
}
```

### 2. **本地文件操作（Electron Dialog API）**
```typescript
// Electron Dialog 选择文件（本地）
const result = await dialog.showOpenDialog(win, {
  title: '选择待翻译文件',
  properties: ['openFile'],
  filters: [{ name: '文本文件', extensions: ['txt', 'md'] }]
})

// 本地读取文件内容
const fs = await import('fs/promises')
const content = await fs.readFile(filePath, 'utf-8')
```

### 3. **强类型约束**
- ✅ 所有函数参数和返回值都有明确类型
- ✅ 事件数据使用 `interface` 定义
- ✅ 数据库查询结果使用泛型 `query<T>()`
- ✅ 禁止 `any`，使用 `unknown` + 类型守卫
- ✅ IPC 消息类型完全匹配

### 4. **事件驱动流程（Electron IPC + EventEmitter）**
```
渲染进程 (createBatch)
  → IPC invoke → 主进程
  → createBatch() 立即返回 batchId
  → emit('batch:create-start')
  → 异步处理分片
  → emit('batch:created')
  → IPC send 广播给所有渲染窗口
  → 渲染进程监听事件更新UI
```

### 5. **本地LLM调用（LlmChatService）**
```
翻译执行器 → LlmChatService.sendMessage()
  → 本地 LLM 推理（无网络调用）
  → 流式响应
  → 监听 message:chunk 事件
  → 广播 task:progress 事件
```

### 6. **本地数据持久化（SQLite）**
- 所有批次和任务数据存储在本地 SQLite 数据库
- 支持程序重启后恢复未完成的任务
- 无云同步，纯本地存储