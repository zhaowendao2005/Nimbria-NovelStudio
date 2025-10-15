/**
 * Database Schema v1.1.0
 * 添加 LLM Chat 支持
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_TABLES as V1_0_0_TABLES,
  GLOBAL_TABLES as V1_0_0_GLOBAL_TABLES
} from './v1.0.0.schema'

// ========== LLM Chat 相关表 ==========

const LLM_CHAT_TABLES: TableDefinition[] = [
  {
    name: 'llm_conversations',
    sql: `CREATE TABLE IF NOT EXISTS llm_conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      model_id TEXT NOT NULL,
      settings_json TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llm_conversations_model ON llm_conversations(model_id)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_conversations_updated ON llm_conversations(updated_at)`
    ]
  },
  {
    name: 'llm_messages',
    sql: `CREATE TABLE IF NOT EXISTS llm_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
      content TEXT NOT NULL,
      metadata_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES llm_conversations(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llm_messages_conversation ON llm_messages(conversation_id)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_messages_role ON llm_messages(role)`,
      `CREATE INDEX IF NOT EXISTS idx_llm_messages_created ON llm_messages(created_at)`
    ]
  },
  {
    name: 'llm_conversation_stats',
    sql: `CREATE TABLE IF NOT EXISTS llm_conversation_stats (
      conversation_id TEXT PRIMARY KEY,
      message_count INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES llm_conversations(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_llm_stats_activity ON llm_conversation_stats(last_activity)`
    ]
  }
]

// ========== 合并所有表 ==========

const PROJECT_TABLES_V1_1_0: TableDefinition[] = [
  ...V1_0_0_TABLES,
  ...LLM_CHAT_TABLES
]

// ========== Schema导出 ==========

export const GLOBAL_SCHEMA_V1_1_0: SchemaDefinition = {
  version: '1.1.0',
  tables: V1_0_0_GLOBAL_TABLES,
  description: 'Global database schema v1.1.0'
}

export const PROJECT_SCHEMA_V1_1_0: SchemaDefinition = {
  version: '1.1.0',
  tables: PROJECT_TABLES_V1_1_0,
  description: 'Project database schema v1.1.0 - Added LLM Chat support'
}

// 导出表定义供其他模块使用
export { PROJECT_TABLES_V1_1_0 as PROJECT_TABLES }
export { V1_0_0_GLOBAL_TABLES as GLOBAL_TABLES }

