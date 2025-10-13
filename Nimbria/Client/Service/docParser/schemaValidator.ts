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
    
    // 支持三种模式：object（单对象）、array（对象数组）和 multi-region（多区域）
    if (schema.type !== 'object' && schema.type !== 'array' && schema.type !== 'multi-region') {
      const currentType = schema.type || '未定义'
      result.errors.push(`❌ [根节点.type] 必须是 "object"、"array" 或 "multi-region"，当前值: "${String(currentType)}"`)
      result.valid = false
      return result
    }
    
    // 验证不同类型的Schema结构
    if (schema.type === 'array') {
      // array 类型，验证 items
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
      
    } else if (schema.type === 'multi-region') {
      // multi-region 类型，验证 regions 和 postProcessors
      if (!schema.regions || !Array.isArray(schema.regions) || schema.regions.length === 0) {
        result.errors.push('❌ [根节点.regions] multi-region 类型的 Schema 必须包含至少一个 region')
        result.valid = false
        return result
      }
      
      // 验证每个 region
      schema.regions.forEach((region, index) => {
        this.validateRegion(region, index, result)
      })
      
      // 验证 postProcessors（可选）
      if (schema.postProcessors && Array.isArray(schema.postProcessors)) {
        schema.postProcessors.forEach((processor, index) => {
          this.validatePostProcessor(processor, index, result)
        })
      }
      
    } else {
      // object 类型，验证 properties
      if (!schema.properties || typeof schema.properties !== 'object') {
        result.errors.push('❌ [根节点.properties] object 类型的 Schema 必须包含 properties 字段')
        result.valid = false
        return result
      }
      
      // 验证 properties
      this.validateProperties(schema.properties, [], result)
    }
    
    // 3. 验证导出配置（multi-region类型不需要根级导出配置）
    if (schema.type !== 'multi-region') {
      this.validateExportConfig(schema, result)
    }
    
    result.valid = result.errors.length === 0
    
    return result
  }
  
  /**
   * 验证 region 配置
   */
  private static validateRegion(
    region: any,
    index: number,
    result: SchemaValidationResult
  ): void {
    const path = `regions[${index}]`
    
    // 验证 name（必填）
    if (!region.name || typeof region.name !== 'string') {
      result.errors.push(`❌ [${path}.name] region 必须有一个字符串类型的 name`)
      return
    }
    
    // 验证提取方式（range 或 marker 二选一）
    const hasRange = region.range && typeof region.range === 'object'
    const hasMarker = region.marker && typeof region.marker === 'object'
    
    if (!hasRange && !hasMarker) {
      result.errors.push(`❌ [${path}] region 必须指定 range 或 marker 其中之一`)
      return
    }
    
    if (hasRange && hasMarker) {
      result.warnings.push(`⚠️ [${path}] region 同时指定了 range 和 marker，将优先使用 range`)
    }
    
    // 验证 range 配置
    if (hasRange) {
      if (typeof region.range.start !== 'number' || region.range.start < 1) {
        result.errors.push(`❌ [${path}.range.start] 必须是大于等于1的整数`)
      }
      if (typeof region.range.end !== 'number' || region.range.end < 1) {
        result.errors.push(`❌ [${path}.range.end] 必须是大于等于1的整数`)
      }
      if (region.range.start && region.range.end && region.range.start > region.range.end) {
        result.errors.push(`❌ [${path}.range] start (${region.range.start}) 不能大于 end (${region.range.end})`)
      }
    }
    
    // 验证 marker 配置
    if (hasMarker) {
      if (!region.marker.start || typeof region.marker.start !== 'string') {
        result.errors.push(`❌ [${path}.marker.start] 必须是非空字符串`)
      }
      if (region.marker.end !== undefined && typeof region.marker.end !== 'string') {
        result.errors.push(`❌ [${path}.marker.end] 必须是字符串类型`)
      }
    }
    
    // 验证 schema（必填）
    if (!region.schema || typeof region.schema !== 'object') {
      result.errors.push(`❌ [${path}.schema] region 必须包含一个 schema 对象`)
      return
    }
    
    // 递归验证 region 的 schema（但不支持嵌套 multi-region）
    if (region.schema.type === 'multi-region') {
      result.errors.push(`❌ [${path}.schema] region 的 schema 不能是 multi-region 类型`)
      return
    }
    
    // 使用主验证逻辑验证 region 的 schema
    const regionSchemaValidation = SchemaValidator.validate(region.schema)
    if (!regionSchemaValidation.valid) {
      regionSchemaValidation.errors.forEach(error => {
        result.errors.push(`❌ [${path}.schema] ${error}`)
      })
    }
    regionSchemaValidation.warnings.forEach(warning => {
      result.warnings.push(`⚠️ [${path}.schema] ${warning}`)
    })
  }
  
  /**
   * 验证 postProcessor 配置
   */
  private static validatePostProcessor(
    processor: any,
    index: number,
    result: SchemaValidationResult
  ): void {
    const path = `postProcessors[${index}]`
    
    // 验证 type（必填）
    const validTypes = ['merge-lookup', 'cross-reference', 'transform']
    if (!processor.type || !validTypes.includes(processor.type)) {
      result.errors.push(`❌ [${path}.type] 必须是 ${validTypes.map(t => `"${t}"`).join('、')} 之一，当前值: "${processor.type || '未定义'}"`)
      return
    }
    
    // 验证 merge-lookup 特有配置
    if (processor.type === 'merge-lookup') {
      if (!processor.sourceRegion || typeof processor.sourceRegion !== 'string') {
        result.errors.push(`❌ [${path}.sourceRegion] merge-lookup 类型必须指定 sourceRegion`)
      }
      if (!processor.lookupRegion || typeof processor.lookupRegion !== 'string') {
        result.errors.push(`❌ [${path}.lookupRegion] merge-lookup 类型必须指定 lookupRegion`)
      }
      if (!processor.matchFields || typeof processor.matchFields !== 'object') {
        result.errors.push(`❌ [${path}.matchFields] merge-lookup 类型必须指定 matchFields`)
      } else {
        if (!processor.matchFields.source || typeof processor.matchFields.source !== 'string') {
          result.errors.push(`❌ [${path}.matchFields.source] 必须是字符串类型`)
        }
        if (!processor.matchFields.lookup || typeof processor.matchFields.lookup !== 'string') {
          result.errors.push(`❌ [${path}.matchFields.lookup] 必须是字符串类型`)
        }
      }
      
      // 验证可选字段
      if (processor.strategy) {
        const validStrategies = ['exact', 'fuzzy', 'position-based']
        if (!validStrategies.includes(processor.strategy)) {
          result.warnings.push(`⚠️ [${path}.strategy] 推荐使用 ${validStrategies.map(s => `"${s}"`).join('、')} 之一，当前值: "${processor.strategy}"`)
        }
      }
      
      if (processor.mergeMode) {
        const validModes = ['extend', 'nest']
        if (!validModes.includes(processor.mergeMode)) {
          result.warnings.push(`⚠️ [${path}.mergeMode] 推荐使用 ${validModes.map(m => `"${m}"`).join('、')} 之一，当前值: "${processor.mergeMode}"`)
        }
      }
    }
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
      // 支持 object、array 和 multi-region 三种类型
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
      
      if (schema.type === 'multi-region') {
        return schema.regions 
          && Array.isArray(schema.regions) 
          && schema.regions.length > 0
          && schema.regions.every(region => 
            region.name 
            && (region.range || region.marker)
            && region.schema
          )
      }
      
      return false
    } catch {
      return false
    }
  }
}

