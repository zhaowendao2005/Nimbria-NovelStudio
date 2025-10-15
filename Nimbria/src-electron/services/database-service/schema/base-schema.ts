/**
 * 数据库Schema基础类型定义
 */

export interface TableDefinition {
  name: string
  sql: string
  indexes?: string[]
  triggers?: string[]
  constraints?: string[]
}

export interface SchemaDefinition {
  version: string
  tables: TableDefinition[]
  description?: string
  dependencies?: string[]
}

export interface MigrationStep {
  type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'DROP_TABLE' | 'CREATE_INDEX' | 'DROP_INDEX' | 'CUSTOM'
  sql: string
  rollback?: string
  description?: string
  validation?: (db: any) => boolean
}

export interface MigrationDefinition {
  version: string
  fromVersion: string
  toVersion: string
  description: string
  steps: MigrationStep[]
}

