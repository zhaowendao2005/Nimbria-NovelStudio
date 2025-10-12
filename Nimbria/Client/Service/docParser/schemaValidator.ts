/**
 * Schema验证器
 * 验证DocParser Schema的合法性
 */

import type { DocParserSchema, DocParserSchemaField } from '@stores/projectPage/docParser/docParser.types'
import type { SchemaValidationResult } from './docParser.service.types'
import { RegexEngine } from './regexEngine'

/**
 * Schema验证器
 */
export class SchemaValidator {
  /**
   * 验证Schema
   */
  static validate(schema: DocParserSchema): SchemaValidationResult {
    const result: SchemaValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    }
    
    // 1. 基本结构验证
    if (!schema || typeof schema !== 'object') {
      result.errors.push('Schema必须是一个对象')
      result.valid = false
      return result
    }
    
    if (schema.type !== 'object') {
      result.errors.push('Schema根节点type必须是object')
      result.valid = false
    }
    
    if (!schema.properties || typeof schema.properties !== 'object') {
      result.errors.push('Schema必须包含properties字段')
      result.valid = false
      return result
    }
    
    // 2. 递归验证所有字段
    this.validateProperties(schema.properties, [], result)
    
    // 3. 验证导出配置
    this.validateExportConfig(schema, result)
    
    result.valid = result.errors.length === 0
    
    return result
  }
  
  /**
   * 验证properties
   */
  private static validateProperties(
    properties: Record<string, DocParserSchemaField>,
    path: string[],
    result: SchemaValidationResult
  ): void {
    Object.entries(properties).forEach(([key, field]) => {
      const currentPath = [...path, key]
      const pathStr = currentPath.join('.')
      
      // 验证字段基本结构
      if (!field.type) {
        result.errors.push(`${pathStr}: 缺少type字段`)
        return
      }
      
      // 验证x-parse配置
      if (field['x-parse']) {
        this.validateParseMetadata(field['x-parse'], pathStr, result)
      }
      
      // 验证x-export配置
      if (field['x-export']) {
        this.validateExportMetadata(field['x-export'], pathStr, result)
      }
      
      // 递归验证子字段
      if (field.type === 'object' && field.properties) {
        this.validateProperties(field.properties, currentPath, result)
      }
      
      if (field.type === 'array' && field.items) {
        if (typeof field.items === 'object' && !Array.isArray(field.items)) {
          const items = field.items as DocParserSchemaField
          if (items.type === 'object' && items.properties) {
            this.validateProperties(items.properties, [...currentPath, '[]'], result)
          }
        }
      }
    })
  }
  
  /**
   * 验证x-parse配置
   */
  private static validateParseMetadata(
    metadata: any,
    path: string,
    result: SchemaValidationResult
  ): void {
    // 验证regex
    if (!metadata.regex) {
      result.errors.push(`${path}: x-parse缺少regex字段`)
      return
    }
    
    // 验证正则表达式是否有效
    if (!RegexEngine.validateRegex(metadata.regex, metadata.flags)) {
      result.errors.push(`${path}: x-parse中的正则表达式无效`)
    }
    
    // 验证mode
    if (!metadata.mode || !['extract', 'split', 'validate'].includes(metadata.mode)) {
      result.errors.push(`${path}: x-parse的mode必须是extract、split或validate之一`)
    }
    
    // 验证captureGroup
    if (metadata.captureGroup !== undefined) {
      if (typeof metadata.captureGroup !== 'number' || metadata.captureGroup < 0) {
        result.errors.push(`${path}: x-parse的captureGroup必须是非负整数`)
      }
    }
    
    // 警告：如果是extract模式但没有指定captureGroup
    if (metadata.mode === 'extract' && metadata.captureGroup === undefined) {
      result.warnings.push(`${path}: extract模式建议指定captureGroup`)
    }
  }
  
  /**
   * 验证x-export配置
   */
  private static validateExportMetadata(
    metadata: any,
    path: string,
    result: SchemaValidationResult
  ): void {
    // 验证type
    if (!metadata.type || !['column', 'section-header', 'skip'].includes(metadata.type)) {
      result.errors.push(`${path}: x-export的type必须是column、section-header或skip之一`)
    }
    
    // column类型的验证
    if (metadata.type === 'column') {
      if (!metadata.columnName) {
        result.warnings.push(`${path}: column类型建议指定columnName`)
      }
      
      if (metadata.order !== undefined && typeof metadata.order !== 'number') {
        result.errors.push(`${path}: x-export的order必须是数字`)
      }
      
      if (metadata.width !== undefined && typeof metadata.width !== 'number') {
        result.errors.push(`${path}: x-export的width必须是数字`)
      }
    }
    
    // section-header类型的验证
    if (metadata.type === 'section-header') {
      if (metadata.mergeCols !== undefined && typeof metadata.mergeCols !== 'number') {
        result.errors.push(`${path}: x-export的mergeCols必须是数字`)
      }
    }
  }
  
  /**
   * 验证导出配置的完整性
   */
  private static validateExportConfig(
    schema: DocParserSchema,
    result: SchemaValidationResult
  ): void {
    const exportFields = this.collectExportFields(schema.properties)
    
    if (exportFields.length === 0) {
      result.warnings.push('Schema中没有定义任何导出字段(x-export)')
    }
    
    // 检查column的order是否有冲突
    const orders = exportFields
      .filter(f => f.type === 'column' && f.order !== undefined)
      .map(f => f.order)
    
    const duplicateOrders = orders.filter((order, index) => orders.indexOf(order) !== index)
    if (duplicateOrders.length > 0) {
      result.warnings.push(`导出列order存在重复: ${[...new Set(duplicateOrders)].join(', ')}`)
    }
  }
  
  /**
   * 收集所有导出字段
   */
  private static collectExportFields(
    properties: Record<string, DocParserSchemaField>,
    path: string[] = []
  ): Array<{ path: string[], type: string, order?: number }> {
    const fields: Array<{ path: string[], type: string, order?: number }> = []
    
    Object.entries(properties).forEach(([key, field]) => {
      const currentPath = [...path, key]
      
      if (field['x-export']) {
        fields.push({
          path: currentPath,
          type: field['x-export'].type,
          order: field['x-export'].order
        })
      }
      
      if (field.type === 'object' && field.properties) {
        fields.push(...this.collectExportFields(field.properties, currentPath))
      }
      
      if (field.type === 'array' && field.items) {
        if (typeof field.items === 'object' && !Array.isArray(field.items)) {
          const items = field.items as DocParserSchemaField
          if (items.type === 'object' && items.properties) {
            fields.push(...this.collectExportFields(items.properties, [...currentPath, '[]']))
          }
        }
      }
    })
    
    return fields
  }
  
  /**
   * 快速验证：仅检查是否可用
   */
  static quickValidate(schema: DocParserSchema): boolean {
    try {
      return schema 
        && schema.type === 'object' 
        && schema.properties 
        && Object.keys(schema.properties).length > 0
    } catch {
      return false
    }
  }
}

