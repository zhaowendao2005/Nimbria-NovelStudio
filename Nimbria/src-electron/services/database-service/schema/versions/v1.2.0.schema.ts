/**
 * Database Schema v1.2.0
 * 添加 LLM Translate 批量翻译系统支持
 * 所有表前缀：Llmtranslate_
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_TABLES as V1_1_0_TABLES,
  GLOBAL_TABLES as V1_1_0_GLOBAL_TABLES
} from './v1.1.0.schema'

// ========== LLM Translate 相关表 ==========

const LLM_TRANSLATE_TABLES: TableDefinition[] = [
  {
    name: 'Llmtranslate_batches',
    sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_batches (
      id TEXT PRIMARY KEY,
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
      
      -- 任务状态
      status TEXT NOT NULL CHECK (status IN ('unsent', 'waiting', 'throttled', 'error', 'completed', 'terminated')),
      
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
      
      -- 元数据
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
      avg_time REAL,
      
      -- 错误统计
      network_errors INTEGER DEFAULT 0,
      timeout_errors INTEGER DEFAULT 0,
      rate_limit_errors INTEGER DEFAULT 0,
      terminated_errors INTEGER DEFAULT 0,
      unknown_errors INTEGER DEFAULT 0,
      
      -- 成本分析
      total_cost REAL DEFAULT 0,
      avg_cost_per_task REAL DEFAULT 0,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      
      -- 时间分析
      fast_completion_count INTEGER DEFAULT 0,
      normal_completion_count INTEGER DEFAULT 0,
      slow_completion_count INTEGER DEFAULT 0,
      
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

const GLOBAL_TABLES_V1_2_0 = V1_1_0_GLOBAL_TABLES

// ========== Schema 导出 ==========

export const PROJECT_SCHEMA_V1_2_0: SchemaDefinition = {
  version: '1.2.0',
  tables: PROJECT_TABLES_V1_2_0,
  description: 'Project database schema v1.2.0 - Added LLM Translate support'
}

export const GLOBAL_SCHEMA_V1_2_0: SchemaDefinition = {
  version: '1.2.0',
  tables: GLOBAL_TABLES_V1_2_0,
  description: 'Global database schema v1.2.0'
}

export { PROJECT_TABLES_V1_2_0 as PROJECT_TABLES, GLOBAL_TABLES_V1_2_0 as GLOBAL_TABLES }
