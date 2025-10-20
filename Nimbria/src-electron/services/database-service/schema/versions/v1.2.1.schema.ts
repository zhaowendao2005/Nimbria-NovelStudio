/**
 * Database Schema v1.2.1
 * 升级 LLM Translate 系统表结构
 * 
 * 变更：
 * 1. Llmtranslate_tasks 表的 status 字段增加 'queued' 状态
 * 2. 确保所有字段与新类型系统一致
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_TABLES as V1_2_0_TABLES,
  GLOBAL_TABLES as V1_2_0_GLOBAL_TABLES
} from './v1.2.0.schema'

// ========== LLM Translate 表（更新版） ==========

const LLM_TRANSLATE_TABLES_V1_2_1: TableDefinition[] = [
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
      
      -- 任务状态（添加 'queued' 状态）
      status TEXT NOT NULL CHECK (status IN ('unsent', 'queued', 'waiting', 'throttled', 'error', 'completed', 'terminated')),
      
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

// ========== 迁移脚本 ==========

/**
 * 从 v1.2.0 升级到 v1.2.1 的迁移脚本
 */
export const MIGRATION_1_2_0_TO_1_2_1 = {
  from: '1.2.0',
  to: '1.2.1',
  scripts: [
    {
      description: '为 Llmtranslate_tasks 表添加 queued 状态支持',
      sql: `
        -- SQLite 不支持直接修改 CHECK 约束
        -- 需要重建表来添加新状态
        
        -- 1. 创建临时表
        CREATE TABLE IF NOT EXISTS Llmtranslate_tasks_new (
          id TEXT PRIMARY KEY,
          batch_id TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('unsent', 'queued', 'waiting', 'throttled', 'error', 'completed', 'terminated')),
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
  ]
}

// ========== 合并所有表（排除旧的 LLM Translate 表） ==========

const PROJECT_TABLES_V1_2_1: TableDefinition[] = [
  // 保留 v1.2.0 的非 LLM Translate 表
  ...V1_2_0_TABLES.filter(table => !table.name.startsWith('Llmtranslate_')),
  // 使用新版本的 LLM Translate 表
  ...LLM_TRANSLATE_TABLES_V1_2_1
]

const GLOBAL_TABLES_V1_2_1 = V1_2_0_GLOBAL_TABLES

// ========== Schema 导出 ==========

export const PROJECT_SCHEMA_V1_2_1: SchemaDefinition = {
  version: '1.2.1',
  tables: PROJECT_TABLES_V1_2_1,
  description: 'Project database schema v1.2.1 - Updated LLM Translate task status support'
}

export const GLOBAL_SCHEMA_V1_2_1: SchemaDefinition = {
  version: '1.2.1',
  tables: GLOBAL_TABLES_V1_2_1,
  description: 'Global database schema v1.2.1'
}

export { PROJECT_TABLES_V1_2_1 as PROJECT_TABLES, GLOBAL_TABLES_V1_2_1 as GLOBAL_TABLES }

