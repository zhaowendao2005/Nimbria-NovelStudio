/**
 * DocParser 类型定义
 * 基于 JiuZhang 项目的 JsonSchema 基础上扩展
 */

// ==================== 扩展的 Schema 类型 ====================

export interface DocParserSchema {
  $schema?: string
  type: 'object' | 'array'
  title?: string
  description?: string
  properties?: Record<string, DocParserSchemaField>
  items?: DocParserSchemaField | DocParserSchemaField[]
  required?: string[]
}

export interface DocParserSchemaField {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'
  title?: string
  description?: string
  properties?: Record<string, DocParserSchemaField>
  items?: DocParserSchemaField | DocParserSchemaField[]
  required?: string[]
  default?: any
  enum?: any[]
  
  // 🆕 解析规则（正则）
  'x-parse'?: ParseMetadata
  
  // 🆕 导出配置
  'x-export'?: ExportMetadata
}

// 为了兼容性，也导出一个 JsonSchema 类型
export type JsonSchema = DocParserSchema

// ==================== 解析规则 ====================

export interface ParseMetadata {
  // 正则表达式（字符串形式）- 使用 pattern 符合 JSON Schema 规范
  pattern?: string
  
  // 正则 flags
  flags?: string  // 如 'gi', 'gm'
  
  // 匹配模式
  mode?: 'extract' | 'split' | 'validate'
  
  // 提取组（用于 extract 模式）- 支持单个或多个捕获组
  captureGroup?: number     // 单个捕获组: 1, 2, 3...
  captureGroups?: number[]  // 多个捕获组: [1, 2, 3]
  
  // 前置条件（可选）
  conditions?: {
    previousMatch?: string  // 前一个匹配的标识
    lineStart?: boolean     // 必须在行首
    afterEmpty?: boolean    // 必须在空行之后
  }
  
  // 示例（用于 UI 提示）
  examples?: string[]
}

// ==================== 导出配置 ====================

export interface ExportMetadata {
  type: 'column' | 'section-header' | 'merged-row' | 'ignore'
  columnName?: string
  columnOrder?: number  // 列顺序
  order?: number
  columnWidth?: number  // 列宽度
  width?: number
  mergeCols?: number  // 合并列数
  format?: {
    bold?: boolean
    fontSize?: number
    alignment?: 'left' | 'center' | 'right'
    background?: string
    border?: boolean
  }
}

// ==================== 导出配置结果 ====================

export interface ExportConfig {
  columns: Array<{
    field: string[]      // 字段路径
    name: string
    order: number
    width: number
    format?: ExportMetadata['format']
  }>
  sectionHeaders: Array<{
    field: string[]
    mergeCols: number
    format?: ExportMetadata['format']
  }>
}

// ==================== 解析结果 ====================

export interface ParsedData {
  [key: string]: any
  chapters?: Array<{
    chapterTitle?: string
    questions?: Array<{
      questionNumber?: string
      questionContent?: string
      answer?: string
    }>
  }>
}

// ==================== 树节点数据（从 JiuZhang 精简） ====================

export interface TreeNodeData {
  fieldName: string
  fieldPath: string
  type: JsonSchemaType
  items?: JsonSchemaType | null
  isRequired: boolean
  description?: string
  
  // 验证约束
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  enum?: any[]
}

export type JsonSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array' | 'null'

// 从JiuZhang项目兼容的类型
export type { JsonSchema, JsonSchemaField } from '@types/shared'

