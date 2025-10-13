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
  // 🆕 Word 导出配置
  wordExport?: {
    enabled?: boolean           // 启用 Word 导出检测
    retainInExcel?: boolean     // 导出到 Word 时是否在 Excel 中保留
    detectImages?: boolean      // 检测图片（默认 true）
    detectTables?: boolean      // 检测表格（默认 true）
    replacementText?: string    // Excel 中的替代文本（默认："详见 Word 文档"）
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
  // 🆕 Word 导出配置
  wordExport?: {
    enabled: boolean              // 全局启用 Word 导出
    outputPath?: string           // Word 文档输出路径
    filename?: string             // Word 文档文件名
    includeChapters?: boolean     // 是否包含章节信息
    imageHandling?: 'keep' | 'reference' | 'remove'  // 图片处理方式
  }
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
      // 🆕 Word 导出标记
      needsWordExport?: boolean     // 是否需要导出到 Word
      hasImages?: boolean           // 是否包含图片
      hasTables?: boolean           // 是否包含表格
      wordExportReason?: string[]   // 导出原因列表
    }>
  }>
  // 🆕 Word 导出标记（通用）
  needsWordExport?: boolean
  hasImages?: boolean
  hasTables?: boolean
  wordExportReason?: string[]
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

// ==================== Word 导出相关工具类型 ====================

// 内容检测结果
export interface ContentDetectionResult {
  hasImages: boolean
  hasTables: boolean
  imageCount: number
  tableCount: number
  imageReferences: string[]   // 图片引用列表
  detectionReasons: string[]  // 检测到的具体原因
}

// Word 导出选项
export interface WordExportOptions {
  filename: string
  includeImages: boolean
  includeChapters: boolean
  imageHandling: 'keep' | 'reference' | 'remove'
  replacementText: string
}

// Word 导出结果
export interface WordExportResult {
  success: boolean
  wordPath?: string
  excelPath?: string
  exportedItemCount: number
  retainedInExcelCount: number
  errors?: string[]
}

