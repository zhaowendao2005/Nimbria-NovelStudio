/**
 * Database Schema v1.0.0
 * 基础版本Schema定义
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'

// ========== 全局数据库表 ==========

const GLOBAL_TABLES: TableDefinition[] = [
  {
    name: 'app_settings',
    sql: `CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'string',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key)`
    ]
  },
  {
    name: 'recent_projects',
    sql: `CREATE TABLE IF NOT EXISTS recent_projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_path TEXT UNIQUE NOT NULL,
      project_name TEXT,
      last_opened DATETIME DEFAULT CURRENT_TIMESTAMP,
      open_count INTEGER DEFAULT 1,
      is_favorite BOOLEAN DEFAULT FALSE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_recent_projects_path ON recent_projects(project_path)`,
      `CREATE INDEX IF NOT EXISTS idx_recent_projects_last_opened ON recent_projects(last_opened)`
    ]
  },
  {
    name: 'user_preferences',
    sql: `CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'string',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(category, key)
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_user_preferences_category ON user_preferences(category)`
    ]
  }
]

// ========== 项目数据库表 ==========

const PROJECT_TABLES: TableDefinition[] = [
  {
    name: 'project_metadata',
    sql: `CREATE TABLE IF NOT EXISTS project_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      type TEXT DEFAULT 'string',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_project_metadata_key ON project_metadata(key)`
    ]
  },
  {
    name: 'documents',
    sql: `CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      title TEXT,
      content_hash TEXT,
      word_count INTEGER DEFAULT 0,
      character_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path)`,
      `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`,
      `CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at)`,
      `CREATE INDEX IF NOT EXISTS idx_documents_word_count ON documents(word_count)`
    ]
  },
  {
    name: 'chapters',
    sql: `CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      title TEXT NOT NULL,
      order_index INTEGER DEFAULT 0,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_chapters_document ON chapters(document_id)`,
      `CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(order_index)`,
      `CREATE INDEX IF NOT EXISTS idx_chapters_status ON chapters(status)`
    ]
  },
  {
    name: 'tags',
    sql: `CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT DEFAULT '#666666',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name)`
    ]
  },
  {
    name: 'document_tags',
    sql: `CREATE TABLE IF NOT EXISTS document_tags (
      document_id INTEGER,
      tag_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (document_id, tag_id),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_document_tags_document ON document_tags(document_id)`,
      `CREATE INDEX IF NOT EXISTS idx_document_tags_tag ON document_tags(tag_id)`
    ]
  },
  {
    name: 'project_stats',
    sql: `CREATE TABLE IF NOT EXISTS project_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_words INTEGER DEFAULT 0,
      total_characters INTEGER DEFAULT 0,
      documents_count INTEGER DEFAULT 0,
      chapters_count INTEGER DEFAULT 0,
      writing_time_minutes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_project_stats_date ON project_stats(date)`
    ]
  },
  {
    name: 'writing_sessions',
    sql: `CREATE TABLE IF NOT EXISTS writing_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      words_written INTEGER DEFAULT 0,
      characters_written INTEGER DEFAULT 0,
      session_type TEXT DEFAULT 'writing',
      notes TEXT,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_writing_sessions_document ON writing_sessions(document_id)`,
      `CREATE INDEX IF NOT EXISTS idx_writing_sessions_start_time ON writing_sessions(start_time)`
    ]
  }
]

// ========== Schema导出 ==========

export const GLOBAL_SCHEMA_V1_0_0: SchemaDefinition = {
  version: '1.0.0',
  tables: GLOBAL_TABLES,
  description: 'Global database schema v1.0.0'
}

export const PROJECT_SCHEMA_V1_0_0: SchemaDefinition = {
  version: '1.0.0',
  tables: PROJECT_TABLES,
  description: 'Project database schema v1.0.0'
}

