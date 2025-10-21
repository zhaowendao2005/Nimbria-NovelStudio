/**
 * Database Schema v1.2.2
 * 升级 LLM Translate 系统任务状态支持
 * 
 * 变更：
 * 1. Llmtranslate_tasks 表的 status 字段增加 'sending' 状态
 *    - 之前允许的状态：unsent, queued, waiting, throttled, error, completed, terminated
 *    - 新增状态：sending (用于表示任务正在发送到 LLM)
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_TABLES as V1_2_1_TABLES,
  GLOBAL_TABLES as V1_2_1_GLOBAL_TABLES
} from './v1.2.1.schema'

// ========== LLM Translate 表（更新版） ==========

const LLM_TRANSLATE_TABLES_V1_2_2: TableDefinition[] = [
  {
    name: 'Llmtranslate_batches',
    sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_batches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('running', 'paused', 'completed', 'failed')),
      
      -- 配置信息 (JSON 序列化 BatchConfig)
      config_json TEXT NOT NULL,
      
      -- 统计信息
      total_tasks INTEGER DEFAULT 0,
      completed_tasks INTEGER DEFAULT 0,
      failed_tasks INTEGER DEFAULT 0,
      throttled_tasks INTEGER DEFAULT 0,
      waiting_tasks INTEGER DEFAULT 0,
      unsent_tasks INTEGER DEFAULT 0,
      terminated_tasks INTEGER DEFAULT 0,
      
      -- 成本统计
      total_cost REAL DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      
      -- 性能统计
      avg_time_per_task REAL DEFAULT 0,
      fastest_task_time REAL DEFAULT 0,
      slowest_task_time REAL DEFAULT 0,
      estimated_completion_time DATETIME,
      
      -- 时间戳
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME,
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
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      
      -- 任务状态（仅支持：unsent, waiting, sending, throttled, error, completed）
      status TEXT NOT NULL CHECK (status IN ('unsent', 'waiting', 'sending', 'throttled', 'error', 'completed')),
      
      -- 内容
      content TEXT NOT NULL,
      translation TEXT,
      
      -- Token 信息
      input_tokens INTEGER DEFAULT 0,
      reply_tokens INTEGER DEFAULT 0,
      predicted_tokens INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      
      -- 时间信息
      sent_time DATETIME,
      reply_time DATETIME,
      duration_ms INTEGER,
      
      -- 错误信息
      error_message TEXT,
      error_type TEXT,
      retry_count INTEGER DEFAULT 0,
      
      -- 成本信息
      cost REAL DEFAULT 0,
      
      -- 元数据 (JSON 序列化 TaskMetadata)
      metadata_json TEXT,
      
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
      fastest_task_id TEXT,
      fastest_time REAL,
      slowest_task_id TEXT,
      slowest_time REAL,
      
      -- 时间戳
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (batch_id) REFERENCES Llmtranslate_batches(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llmtranslate_stats_batch ON Llmtranslate_stats(batch_id)`
    ]
  }
]

// ========== Schema 定义 ==========

export const PROJECT_SCHEMA_V1_2_2: SchemaDefinition = {
  version: '1.2.2',
  tables: [
    ...V1_2_1_TABLES.filter(table => 
      !['Llmtranslate_batches', 'Llmtranslate_tasks', 'Llmtranslate_stats'].includes(table.name)
    ),
    ...LLM_TRANSLATE_TABLES_V1_2_2
  ],
  description: '项目数据库 Schema v1.2.2 - 新增 LLM Translate 任务 sending 状态'
}

export const GLOBAL_SCHEMA_V1_2_2: SchemaDefinition = {
  version: '1.2.2',
  tables: V1_2_1_GLOBAL_TABLES,
  description: '全局数据库 Schema v1.2.2 - 保持不变'
}

// ========== 迁移脚本：v1.2.1 → v1.2.2 ==========

export const MIGRATION_1_2_1_TO_1_2_2 = {
  from: '1.2.1',
  to: '1.2.2',
  description: '为 Llmtranslate_tasks 表的 status 字段增加 sending 状态支持',
  sql: `
    -- SQLite 不支持直接修改 CHECK 约束
    -- 需要重建表来添加新状态
    
    -- 1. 创建临时表
    CREATE TABLE IF NOT EXISTS Llmtranslate_tasks_new (
      id TEXT PRIMARY KEY,
      batch_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('unsent', 'queued', 'waiting', 'sending', 'throttled', 'error', 'completed', 'terminated')),
      content TEXT NOT NULL,
      translation TEXT,
      input_tokens INTEGER DEFAULT 0,
      reply_tokens INTEGER DEFAULT 0,
      predicted_tokens INTEGER DEFAULT 0,
      progress REAL DEFAULT 0,
      sent_time DATETIME,
      reply_time DATETIME,
      duration_ms INTEGER,
      error_message TEXT,
      error_type TEXT,
      retry_count INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES Llmtranslate_batches(id) ON DELETE CASCADE
    );
    
    -- 2. 复制数据
    INSERT INTO Llmtranslate_tasks_new 
    SELECT * FROM Llmtranslate_tasks;
    
    -- 3. 删除旧表
    DROP TABLE Llmtranslate_tasks;
    
    -- 4. 重命名新表
    ALTER TABLE Llmtranslate_tasks_new RENAME TO Llmtranslate_tasks;
    
    -- 5. 重建索引
    CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_batch ON Llmtranslate_tasks(batch_id);
    CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_status ON Llmtranslate_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_created ON Llmtranslate_tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_progress ON Llmtranslate_tasks(progress);
    CREATE INDEX IF NOT EXISTS idx_llmtranslate_tasks_error_type ON Llmtranslate_tasks(error_type);
  `
}
