/**
 * Database Schema v1.2.5
 * 新增 SearchAndScraper 小说批次管理系统
 * 
 * 变更：
 * 1. 项目数据库新增表：
 *    - SearchAndScraper_novel_batch：批次表（简化版，不绑定URL）
 * 2. 全局数据库新增表：
 *    - SearchAndScraper_novel_site_selectors：网站选择器表（为后续迭代准备）
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_SCHEMA_V1_2_4,
  GLOBAL_SCHEMA_V1_2_4
} from './v1.2.4.schema'

// ========== 项目数据库：批次表（简化版）==========

const SEARCH_AND_SCRAPER_NOVEL_BATCH_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_batch',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_batch (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
    total_matched INTEGER DEFAULT 0,
    total_scraped INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_novel_batch_updated ON SearchAndScraper_novel_batch(updated_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_novel_batch_name ON SearchAndScraper_novel_batch(name)`
  ]
}

// ========== 全局数据库：网站选择器表（为 Iteration 2-4 准备）==========

const SEARCH_AND_SCRAPER_NOVEL_SITE_SELECTORS_TABLE: TableDefinition = {
  name: 'SearchAndScraper_novel_site_selectors',
  sql: `CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_site_selectors (
    id TEXT PRIMARY KEY,
    site_domain TEXT NOT NULL UNIQUE,
    site_name TEXT NOT NULL,
    
    chapter_list_selector TEXT,
    chapter_content_selector TEXT,
    
    special_logic TEXT,
    
    success_count INTEGER DEFAULT 0,
    last_used_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_site_selectors_domain ON SearchAndScraper_novel_site_selectors(site_domain)`,
    `CREATE INDEX IF NOT EXISTS idx_site_selectors_last_used ON SearchAndScraper_novel_site_selectors(last_used_at DESC)`
  ]
}

// ========== Schema 定义 ==========

export const PROJECT_TABLES: TableDefinition[] = [
  ...PROJECT_SCHEMA_V1_2_4.tables,
  SEARCH_AND_SCRAPER_NOVEL_BATCH_TABLE
]

export const GLOBAL_TABLES: TableDefinition[] = [
  ...GLOBAL_SCHEMA_V1_2_4.tables,
  SEARCH_AND_SCRAPER_NOVEL_SITE_SELECTORS_TABLE
]

export const PROJECT_SCHEMA_V1_2_5: SchemaDefinition = {
  version: '1.2.5',
  tables: PROJECT_TABLES,
  description: '项目数据库 Schema v1.2.5 - 新增 SearchAndScraper 批次表'
}

export const GLOBAL_SCHEMA_V1_2_5: SchemaDefinition = {
  version: '1.2.5',
  tables: GLOBAL_TABLES,
  description: '全局数据库 Schema v1.2.5 - 新增网站选择器表'
}

// ========== 迁移脚本：v1.2.4 → v1.2.5 ==========

export const MIGRATION_1_2_4_TO_1_2_5 = {
  from: '1.2.4',
  to: '1.2.5',
  description: '新增 SearchAndScraper 批次表和网站选择器表',
  sql: `
    -- 项目数据库：创建批次表
    CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_batch (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      total_matched INTEGER DEFAULT 0,
      total_scraped INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- 项目数据库：创建索引
    CREATE INDEX IF NOT EXISTS idx_novel_batch_updated ON SearchAndScraper_novel_batch(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_novel_batch_name ON SearchAndScraper_novel_batch(name);
    
    -- 全局数据库：创建网站选择器表
    CREATE TABLE IF NOT EXISTS SearchAndScraper_novel_site_selectors (
      id TEXT PRIMARY KEY,
      site_domain TEXT NOT NULL UNIQUE,
      site_name TEXT NOT NULL,
      chapter_list_selector TEXT,
      chapter_content_selector TEXT,
      special_logic TEXT,
      success_count INTEGER DEFAULT 0,
      last_used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    -- 全局数据库：创建索引
    CREATE INDEX IF NOT EXISTS idx_site_selectors_domain ON SearchAndScraper_novel_site_selectors(site_domain);
    CREATE INDEX IF NOT EXISTS idx_site_selectors_last_used ON SearchAndScraper_novel_site_selectors(last_used_at DESC);
  `
}

