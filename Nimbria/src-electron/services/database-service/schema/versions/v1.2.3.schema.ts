/**
 * Database Schema v1.2.3
 * 新增 Token 换算配置系统
 * 
 * 变更：
 * 1. 新增 Llmtranslate_token_conversion_configs 表
 *    - 用于存储 Token 换算配置
 *    - 支持自定义中文和ASCII字符的token换算比例
 * 2. Llmtranslate_batches.config_json 字段支持新的配置项：
 *    - tokenConversionConfigId: Token换算配置ID
 *    - taskTotalTimeout: 任务总超时
 *    - streamFirstTokenTimeout: 流式首字超时
 *    - schedulerConfig.timedInterval: 定时调度间隔
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_SCHEMA_V1_2_2,
  GLOBAL_SCHEMA_V1_2_2
} from './v1.2.2.schema'

// ========== 新增：Token 换算配置表 ==========

const TOKEN_CONVERSION_TABLE: TableDefinition = {
  name: 'Llmtranslate_token_conversion_configs',
  sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_token_conversion_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    chinese_ratio REAL NOT NULL,
    ascii_ratio REAL NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_token_conversion_name 
      ON Llmtranslate_token_conversion_configs(name)`
  ]
}

// ========== 项目数据库表（v1.2.3） ==========

export const PROJECT_TABLES: TableDefinition[] = [
  ...PROJECT_SCHEMA_V1_2_2.tables,
  TOKEN_CONVERSION_TABLE
]

// ========== 全局数据库表（v1.2.3） ==========

export const GLOBAL_TABLES: TableDefinition[] = GLOBAL_SCHEMA_V1_2_2.tables

// ========== Schema 定义 ==========

export const PROJECT_SCHEMA_V1_2_3: SchemaDefinition = {
  version: '1.2.3',
  tables: PROJECT_TABLES,
  description: '项目数据库 Schema v1.2.3 - 新增 Token 换算配置系统'
}

export const GLOBAL_SCHEMA_V1_2_3: SchemaDefinition = {
  version: '1.2.3',
  tables: GLOBAL_TABLES,
  description: '全局数据库 Schema v1.2.3 - 保持不变'
}

// ========== 迁移脚本：v1.2.2 → v1.2.3 (UP) ==========

export const MIGRATION_1_2_2_TO_1_2_3 = {
  from: '1.2.2',
  to: '1.2.3',
  description: '新增 Token 换算配置表',
  sql: `
    -- 创建 Token 换算配置表
    CREATE TABLE IF NOT EXISTS Llmtranslate_token_conversion_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      chinese_ratio REAL NOT NULL,
      ascii_ratio REAL NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_token_conversion_name 
      ON Llmtranslate_token_conversion_configs(name);
    
    -- 插入默认配置
    INSERT OR IGNORE INTO Llmtranslate_token_conversion_configs (id, name, chinese_ratio, ascii_ratio, description) VALUES
      ('default-balanced', '通用配置（平衡）', 2.5, 1.0, '适用于大多数模型的平衡配置'),
      ('gemini-chinese', 'Gemini中文优化', 4.0, 1.0, 'Gemini模型对中文的token换算'),
      ('claude-optimized', 'Claude优化', 2.0, 0.8, 'Claude模型的token换算'),
      ('openai-optimized', 'OpenAI优化', 2.0, 1.0, 'OpenAI模型的token换算');
  `
}

// ========== 迁移脚本：v1.2.3 → v1.2.2 (DOWN / 回滚) ==========

export const MIGRATION_1_2_3_TO_1_2_2 = {
  from: '1.2.3',
  to: '1.2.2',
  description: '删除 Token 换算配置表（回滚到 v1.2.2）',
  sql: `
    -- 删除索引
    DROP INDEX IF EXISTS idx_token_conversion_name;
    
    -- 删除表
    DROP TABLE IF EXISTS Llmtranslate_token_conversion_configs;
  `
}

