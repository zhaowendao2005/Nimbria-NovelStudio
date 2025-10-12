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
      result.errors.push('❌ [根节点] Schema必须是一个对象')
      result.valid = false
      return result
    }
    
    // 支持两种模式：object（单对象）和 array（对象数组）
    if (schema.type !== 'object' && schema.type !== 'array') {
      const currentType = schema.type || '未定义'
      result.errors.push(`❌ [根节点.type] 必须是 "object" 或 "array"，当前值: "${String(currentType)}"`)
      result.valid = false
      return result
    }
    
    // 如果是 array 类型，验证 items
    if (schema.type === 'array') {
      if (!schema.items || typeof schema.items !== 'object' || Array.isArray(schema.items)) {
        result.errors.push('❌ [根节点.items] array 类型的 Schema 必须包含 items 字段，且 items 必须是对象')
        result.valid = false
        return result
      }
      
      const items = schema.items as DocParserSchemaField
      if (items.type !== 'object') {
        result.errors.push(`❌ [根节点.items.type] 必须是 "object"，当前值: "${items.type || '未定义'}"`)
        result.valid = false
        return result
      }
      
      if (!items.properties || typeof items.properties !== 'object') {
        result.errors.push('❌ [根节点.items.properties] array 类型 Schema 的 items 必须包含 properties 字段')
        result.valid = false
        return result
      }
      
      // 验证 items 中的 properties
      this.validateProperties(items.properties, ['items'], result)
    } 
    // 如果是 object 类型，验证 properties
    else {
      if (!schema.properties || typeof schema.properties !== 'object') {
        result.errors.push('❌ [根节点.properties] object 类型的 Schema 必须包含 properties 字段')
        result.valid = false
        return result
      }
      
      // 验证 properties
      this.validateProperties(schema.properties, [], result)
    }
    
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
      const pathStr = currentPath.length > 0 ? currentPath.join('.') : '根节点'
      
      // 验证字段基本结构
      if (!field.type) {
        result.errors.push(`❌ [${pathStr}.type] 缺少 type 字段`)
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
      if (field.type === 'object') {
        if (!field.properties) {
          result.errors.push(`❌ [${pathStr}.properties] object 类型字段必须包含 properties`)
        } else {
          this.validateProperties(field.properties, currentPath, result)
        }
      }
      
      if (field.type === 'array' && field.items) {
        if (typeof field.items === 'object' && !Array.isArray(field.items)) {
          const items = field.items as DocParserSchemaField
          if (items.type === 'object') {
            if (!items.properties) {
              result.errors.push(`❌ [${pathStr}.items.properties] array 的 items 为 object 类型时必须包含 properties`)
            } else {
              this.validateProperties(items.properties, [...currentPath, 'items'], result)
            }
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
    // 验证 pattern（正则表达式）
    if (!metadata.pattern) {
      result.errors.push(`❌ [${path}["x-parse"].pattern] 缺少 pattern 字段（正则表达式）`)
      return
    }
    
    // 验证正则表达式是否有效
    if (!RegexEngine.validateRegex(metadata.pattern, metadata.flags)) {
      result.errors.push(`❌ [${path}["x-parse"].pattern] 正则表达式无效: "${metadata.pattern}"`)
    }
    
    // 验证mode
    if (!metadata.mode || !['extract', 'split', 'validate'].includes(metadata.mode)) {
      result.errors.push(`❌ [${path}["x-parse"].mode] 必须是 "extract"、"split" 或 "validate" 之一，当前值: "${metadata.mode || '未定义'}"`)
    }
    
    // 验证 captureGroup 或 captureGroups
    if (metadata.captureGroup !== undefined) {
      if (typeof metadata.captureGroup !== 'number' || metadata.captureGroup < 0) {
        result.errors.push(`❌ [${path}["x-parse"].captureGroup] 必须是非负整数，当前值: ${metadata.captureGroup}`)
      }
    }
    
    if (metadata.captureGroups !== undefined) {
      if (!Array.isArray(metadata.captureGroups)) {
        result.errors.push(`❌ [${path}["x-parse"].captureGroups] 必须是数组，当前类型: ${typeof metadata.captureGroups}`)
      } else if (metadata.captureGroups.some((g: any) => typeof g !== 'number' || g < 0)) {
        result.errors.push(`❌ [${path}["x-parse"].captureGroups] 数组中的值必须是非负整数`)
      }
    }
    
    // 警告：如果是extract模式但没有指定captureGroup或captureGroups
    if (metadata.mode === 'extract' && !metadata.captureGroup && !metadata.captureGroups) {
      result.warnings.push(`⚠️ [${path}["x-parse"]] extract 模式建议指定 captureGroup 或 captureGroups`)
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
    if (!metadata.type || !['column', 'section-header', 'skip', 'ignore', 'merged-row'].includes(metadata.type)) {
      result.errors.push(`❌ [${path}["x-export"].type] 必须是 "column"、"section-header" 或 "ignore" 之一，当前值: "${metadata.type || '未定义'}"`)
    }
    
    // column类型的验证
    if (metadata.type === 'column') {
      if (!metadata.columnName) {
        result.warnings.push(`⚠️ [${path}["x-export"].columnName] column 类型建议指定 columnName`)
      }
      
      if (metadata.columnOrder !== undefined && typeof metadata.columnOrder !== 'number') {
        result.errors.push(`❌ [${path}["x-export"].columnOrder] 必须是数字，当前类型: ${typeof metadata.columnOrder}`)
      }
      
      if (metadata.columnWidth !== undefined && typeof metadata.columnWidth !== 'number') {
        result.errors.push(`❌ [${path}["x-export"].columnWidth] 必须是数字，当前类型: ${typeof metadata.columnWidth}`)
      }
    }
    
    // section-header类型的验证
    if (metadata.type === 'section-header') {
      if (metadata.mergeCols !== undefined && typeof metadata.mergeCols !== 'number') {
        result.errors.push(`❌ [${path}["x-export"].mergeCols] 必须是数字，当前类型: ${typeof metadata.mergeCols}`)
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
    // 获取实际的 properties（支持 object 和 array 类型）
    let properties: Record<string, DocParserSchemaField> | undefined
    
    if (schema.type === 'array' && schema.items) {
      const items = schema.items as DocParserSchemaField
      properties = items.properties
    } else {
      properties = schema.properties
    }
    
    if (!properties) {
      return
    }
    
    const exportFields = this.collectExportFields(properties)
    
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
      // 支持 object 和 array 两种类型
      if (schema.type === 'object') {
        return schema.properties && Object.keys(schema.properties).length > 0
      }
      
      if (schema.type === 'array') {
        const items = schema.items as DocParserSchemaField
        return items 
          && items.type === 'object' 
          && items.properties 
          && Object.keys(items.properties).length > 0
      }
      
      return false
    } catch {
      return false
    }
  }
}

