/**
 * Database Schema v1.2.4
 * 新增系统提示词模板管理系统
 * 
 * 变更：
 * 1. 新增 Llmtranslate_system_prompt_templates 表
 *    - 用于存储系统提示词模板
 *    - 支持分类管理（通用/技术/文学/学术/自定义）
 *    - 内置4个默认模板，用户可自定义扩展
 * 2. Llmtranslate_batches.config_json 字段支持新的配置项：
 *    - systemPromptTemplateId: 系统提示词模板ID（可选）
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_SCHEMA_V1_2_3,
  GLOBAL_SCHEMA_V1_2_3
} from './v1.2.3.schema'

// ========== 新增：系统提示词模板表 ==========

const SYSTEM_PROMPT_TEMPLATE_TABLE: TableDefinition = {
  name: 'Llmtranslate_system_prompt_templates',
  sql: `CREATE TABLE IF NOT EXISTS Llmtranslate_system_prompt_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    category TEXT,
    description TEXT,
    is_builtin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_prompt_template_name 
     ON Llmtranslate_system_prompt_templates(name)`,
    `CREATE INDEX IF NOT EXISTS idx_prompt_template_category 
     ON Llmtranslate_system_prompt_templates(category)`
  ]
}

// ========== Schema 定义 ==========

export const PROJECT_TABLES: TableDefinition[] = [
  ...PROJECT_SCHEMA_V1_2_3.tables,
  SYSTEM_PROMPT_TEMPLATE_TABLE
]

export const GLOBAL_TABLES: TableDefinition[] = GLOBAL_SCHEMA_V1_2_3.tables

export const PROJECT_SCHEMA_V1_2_4: SchemaDefinition = {
  version: '1.2.4',
  tables: PROJECT_TABLES,
  description: '项目数据库 Schema v1.2.4 - 新增系统提示词模板表'
}

export const GLOBAL_SCHEMA_V1_2_4: SchemaDefinition = {
  version: '1.2.4',
  tables: GLOBAL_TABLES,
  description: '全局数据库 Schema v1.2.4 - 保持不变'
}

// ========== 迁移脚本：v1.2.3 → v1.2.4 ==========

export const MIGRATION_1_2_3_TO_1_2_4 = {
  from: '1.2.3',
  to: '1.2.4',
  description: '新增系统提示词模板表并初始化默认模板',
  sql: `
    -- 创建系统提示词模板表
    CREATE TABLE IF NOT EXISTS Llmtranslate_system_prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL,
      category TEXT,
      description TEXT,
      is_builtin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_prompt_template_name 
    ON Llmtranslate_system_prompt_templates(name);
    
    CREATE INDEX IF NOT EXISTS idx_prompt_template_category 
    ON Llmtranslate_system_prompt_templates(category);
    
    -- 插入默认模板
    INSERT OR IGNORE INTO Llmtranslate_system_prompt_templates 
    (id, name, content, category, description, is_builtin, created_at, updated_at) VALUES
    (
      'default-general',
      '通用翻译',
      '你是一位专业的翻译助手。请将用户输入的文本翻译成目标语言，保持原文的语气和风格。注意：
- 保持专业术语的准确性
- 尊重原文的格式和结构
- 翻译要自然流畅，符合目标语言习惯',
      '通用',
      '适用于大多数翻译场景的通用模板',
      1,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    (
      'default-technical',
      '技术文档翻译',
      '你是一位精通技术文档翻译的专家。请将以下技术文档翻译成目标语言。要求：
- 保持技术术语的准确性，必要时保留英文原文
- 保留代码块、命令、API名称等技术元素不翻译
- 确保逻辑清晰，专业严谨
- 符合技术文档的表达习惯',
      '技术',
      '适用于API文档、技术手册、代码注释等',
      1,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    (
      'default-literary',
      '文学作品翻译',
      '你是一位资深的文学翻译家。请将以下文学作品翻译成目标语言。要求：
- 保持原作的文学风格和意境
- 注重语言的美感和韵律
- 传达作者的情感和深层含义
- 可以适当意译以符合目标语言的文学表达',
      '文学',
      '适用于小说、诗歌、散文等文学作品',
      1,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    ),
    (
      'default-academic',
      '学术论文翻译',
      '你是一位学术翻译专家。请将以下学术内容翻译成目标语言。要求：
- 保持学术用语的准确性和专业性
- 保留引用、参考文献格式
- 确保逻辑严密，论证清晰
- 符合学术写作规范',
      '学术',
      '适用于学术论文、研究报告等',
      1,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  `
}

