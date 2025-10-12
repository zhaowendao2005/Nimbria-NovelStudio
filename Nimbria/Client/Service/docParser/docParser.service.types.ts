/**
 * DocParser Service 类型定义
 */

import type { ParseMetadata, DocParserSchemaField } from '@stores/projectPage/docParser/docParser.types'

/**
 * 正则匹配结果
 */
export interface RegexMatch {
  matched: boolean
  value?: string
  capturedGroups?: string[]
  startIndex?: number
  endIndex?: number
}

/**
 * 正则引擎配置
 */
export interface RegexEngineConfig {
  regex: string
  flags?: string
  mode: 'extract' | 'split' | 'validate'
  captureGroup?: number
  conditions?: {
    lineStart?: boolean
    lineEnd?: boolean
    wholeWord?: boolean
  }
}

/**
 * 文档解析上下文
 */
export interface ParseContext {
  content: string
  currentPosition: number
  lines: string[]
  currentLine: number
}

/**
 * Schema验证结果
 */
export interface SchemaValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 解析结果节点
 */
export interface ParseResultNode {
  path: string[]
  value: any
  sourceRange?: {
    start: number
    end: number
  }
}

/**
 * Excel单元格格式
 */
export interface CellFormat {
  bold?: boolean
  italic?: boolean
  fontSize?: number
  alignment?: 'left' | 'center' | 'right'
  background?: string
  textColor?: string
  border?: boolean
}

/**
 * Excel列配置
 */
export interface ExcelColumnConfig {
  field: string[]
  name: string
  width: number
  format?: CellFormat
}

/**
 * Excel导出选项
 */
export interface ExcelExportOptions {
  sheetName?: string
  columns: ExcelColumnConfig[]
  includeHeaders?: boolean
  freezeHeader?: boolean
}

