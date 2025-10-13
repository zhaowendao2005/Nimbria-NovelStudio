/**
 * 文档解析器
 * 根据Schema和正则规则解析文档
 */

import type { DocParserSchema, DocParserSchemaField, ParsedData } from '@stores/projectPage/docParser/docParser.types'
import type { ParseContext } from './docParser.service.types'
import { RegexEngine } from './regexEngine'
import { ContentDetector } from './contentDetector'

/**
 * 文档解析器
 */
export class DocumentParser {
  /**
   * 解析文档
   * @param content 文档内容
   * @param schema Schema定义
   * @returns 解析后的JSON数据
   */
  static parse(content: string, schema: DocParserSchema): ParsedData {
    console.log('[DocumentParser] 开始解析文档')
    console.log('[DocumentParser] 文档长度:', content.length)
    console.log('[DocumentParser] Schema 类型:', schema.type)
    
    const context: ParseContext = {
      content,
      currentPosition: 0,
      lines: content.split('\n'),
      currentLine: 0
    }
    
    try {
      let result: any
      
      // 根据 Schema 的根节点类型选择解析方式
      if (schema.type === 'array') {
        // array 类型：解析为数组
        result = this.parseArray(context, schema, [])
      } else {
        // object 类型：解析为对象
        result = this.parseObject(context, schema, [])
      }
      
      console.log('[DocumentParser] 解析完成，结果数量:', Array.isArray(result) ? result.length : 1)
      
      // 🆕 添加内容检测和 Word 导出标记
      const processedResult = this.addWordExportMarkers(result, schema)
      
      return processedResult as ParsedData
    } catch (error) {
      console.error('[DocumentParser] 解析失败:', error)
      throw error
    }
  }
  
  /**
   * 解析对象类型
   */
  private static parseObject(
    context: ParseContext,
    schema: DocParserSchemaField,
    path: string[]
  ): Record<string, any> {
    const result: Record<string, any> = {}
    
    if (!schema.properties) {
      return result
    }
    
    Object.entries(schema.properties).forEach(([key, fieldSchema]) => {
      const fieldPath = [...path, key]
      const fieldValue = this.parseField(context, fieldSchema, fieldPath)
      
      if (fieldValue !== undefined) {
        result[key] = fieldValue
      }
    })
    
    return result
  }
  
  /**
   * 解析字段
   */
  private static parseField(
    context: ParseContext,
    schema: DocParserSchemaField,
    path: string[]
  ): any {
    const pathStr = path.join('.')
    console.log(`[DocumentParser] 解析字段: ${pathStr}, type: ${schema.type}`)
    
    switch (schema.type) {
      case 'array':
        return this.parseArray(context, schema, path)
      
      case 'object':
        return this.parseObject(context, schema, path)
      
      case 'string':
      case 'number':
      case 'boolean':
        return this.parsePrimitive(context, schema, path)
      
      default:
        console.warn(`[DocumentParser] 未知字段类型: ${schema.type}`)
        return undefined
    }
  }
  
  /**
   * 解析数组类型
   */
  private static parseArray(
    context: ParseContext,
    schema: DocParserSchemaField,
    path: string[]
  ): any[] {
    const result: any[] = []
    
    if (!schema.items || Array.isArray(schema.items)) {
      console.warn('[DocumentParser] 不支持的items格式')
      return result
    }
    
    const itemSchema = schema.items as DocParserSchemaField
    
    // 如果数组项有x-parse规则，使用正则查找所有匹配项
    if (itemSchema['x-parse']) {
      const parseConfig = RegexEngine.fromParseMetadata(itemSchema['x-parse'])
      const matches = RegexEngine.executeGlobal(context.content, parseConfig)
      
      console.log(`[DocumentParser] 数组匹配到 ${matches.length} 项`)
      
      matches.forEach((match, index) => {
        if (itemSchema.type === 'object') {
          // 为每个匹配项创建一个上下文
          const itemContext: ParseContext = {
            content: match.value || '',
            currentPosition: match.startIndex || 0,
            lines: (match.value || '').split('\n'),
            currentLine: 0
          }
          
          const item = this.parseObject(itemContext, itemSchema, [...path, `[${index}]`])
          result.push(item)
        } else {
          // 基本类型直接使用匹配值
          result.push(this.convertValue(match.value, itemSchema.type))
        }
      })
    } else if (itemSchema.type === 'object') {
      // 如果没有x-parse但是对象类型，尝试解析其子字段
      // 这种情况下，我们需要查找对象内部字段的x-parse规则来分割
      const item = this.parseObject(context, itemSchema, [...path, '[0]'])
      if (Object.keys(item).length > 0) {
        result.push(item)
      }
    }
    
    return result
  }
  
  /**
   * 解析基本类型
   */
  private static parsePrimitive(
    context: ParseContext,
    schema: DocParserSchemaField,
    path: string[]
  ): any {
    if (!schema['x-parse']) {
      console.warn(`[DocumentParser] ${path.join('.')} 缺少x-parse配置`)
      return undefined
    }
    
    const parseConfig = RegexEngine.fromParseMetadata(schema['x-parse'])
    const match = RegexEngine.execute(context.content, parseConfig)
    
    if (!match.matched) {
      console.log(`[DocumentParser] ${path.join('.')} 未匹配`)
      return undefined
    }
    
    console.log(`[DocumentParser] ${path.join('.')} 匹配值: ${match.value}`)
    
    return this.convertValue(match.value, schema.type)
  }
  
  /**
   * 类型转换
   */
  private static convertValue(value: any, targetType: string): any {
    if (value === undefined || value === null) {
      return undefined
    }
    
    switch (targetType) {
      case 'string':
        return String(value).trim()
      
      case 'number':
        const num = Number(value)
        return isNaN(num) ? undefined : num
      
      case 'boolean':
        if (typeof value === 'boolean') return value
        const str = String(value).toLowerCase().trim()
        return str === 'true' || str === '1' || str === 'yes'
      
      default:
        return value
    }
  }
  
  /**
   * 智能解析：自动识别文档结构
   * 使用改进的算法，从外到内逐层解析
   */
  static parseAdvanced(content: string, schema: DocParserSchema): ParsedData {
    console.log('[DocumentParser] 开始智能解析，Schema 类型:', schema.type)
    
    // 支持 array 类型的 Schema
    if (schema.type === 'array') {
      const items = schema.items as DocParserSchemaField
      
      if (!items || items.type !== 'object' || !items.properties) {
        console.warn('[DocumentParser] array 类型的 Schema 无效，使用基础解析')
        return this.parse(content, schema)
      }
      
      // 查找 items 中是否有 x-parse 规则用于分割文档
      if (items['x-parse']) {
        // 如果 items 本身有 x-parse 规则，用它来分割文档
        const parseConfig = RegexEngine.fromParseMetadata(items['x-parse'])
        const segments = this.splitByRegex(content, parseConfig)
        
        console.log(`[DocumentParser] 文档分割为 ${segments.length} 段`)
        
        const parsedItems = segments.map((segment, index) => {
          const itemContext: ParseContext = {
            content: segment,
            currentPosition: 0,
            lines: segment.split('\n'),
            currentLine: 0
          }
          
          return this.parseObject(itemContext, items, [`[${index}]`])
        })
        
        return parsedItems as ParsedData
      } else {
        // 没有 x-parse 规则，使用基础解析
        return this.parse(content, schema)
      }
    }
    
    // object 类型的处理逻辑（原有逻辑）
    // 首先找到最外层的分隔符（通常是章节）
    const topLevelFields = Object.entries(schema.properties || {})
      .filter(([_, field]) => field.type === 'array')
    
    if (topLevelFields.length === 0) {
      // 没有数组字段，直接解析
      return this.parse(content, schema)
    }
    
    const result: Record<string, any> = {}
    
    topLevelFields.forEach(([key, arraySchema]) => {
      const items = arraySchema.items as DocParserSchemaField
      
      if (!items || !items['x-parse']) {
        return
      }
      
      // 使用数组项的x-parse规则分割文档
      const parseConfig = RegexEngine.fromParseMetadata(items['x-parse'])
      const segments = this.splitByRegex(content, parseConfig)
      
      console.log(`[DocumentParser] ${key} 分割为 ${segments.length} 段`)
      
      const parsedItems = segments.map((segment, index) => {
        const itemContext: ParseContext = {
          content: segment,
          currentPosition: 0,
          lines: segment.split('\n'),
          currentLine: 0
        }
        
        if (items.type === 'object') {
          return this.parseObject(itemContext, items, [key, `[${index}]`])
        } else {
          return segment
        }
      })
      
      result[key] = parsedItems
    })
    
    return result as ParsedData
  }
  
  /**
   * 使用正则分割文本
   */
  private static splitByRegex(text: string, config: any): string[] {
    const regex = new RegExp(config.regex, config.flags || '')
    const matches = text.matchAll(regex)
    const segments: string[] = []
    let lastIndex = 0
    
    for (const match of matches) {
      if (match.index !== undefined && match.index > lastIndex) {
        segments.push(text.substring(lastIndex, match.index))
      }
      lastIndex = (match.index || 0) + match[0].length
    }
    
    if (lastIndex < text.length) {
      segments.push(text.substring(lastIndex))
    }
    
    return segments.filter(s => s.trim().length > 0)
  }

  /**
   * 🆕 为解析结果添加 Word 导出标记
   */
  private static addWordExportMarkers(result: any, schema: DocParserSchema): any {
    console.log('[DocumentParser] 开始添加 Word 导出标记')
    
    if (Array.isArray(result)) {
      // 数组类型：对每个项目进行检测
      return result.map((item, index) => this.processItemForWordExport(item, schema, index))
    } else if (typeof result === 'object' && result !== null) {
      // 对象类型：直接检测
      return this.processItemForWordExport(result, schema, 0)
    }
    
    return result
  }

  /**
   * 🆕 处理单个项目的 Word 导出检测
   */
  private static processItemForWordExport(item: any, schema: DocParserSchema, index: number): any {
    if (!item || typeof item !== 'object') {
      return item
    }

    // 获取需要检测的字段配置
    const fieldsWithWordExport = this.getFieldsWithWordExportConfig(schema)
    
    if (fieldsWithWordExport.length === 0) {
      // 没有配置 Word 导出的字段，使用默认检测
      return this.addDefaultWordExportDetection(item, index)
    }

    // 基于配置进行检测
    let needsWordExport = false
    let hasImages = false
    let hasTables = false
    const wordExportReasons: string[] = []

    fieldsWithWordExport.forEach(fieldConfig => {
      const fieldValue = this.getFieldValue(item, fieldConfig.fieldPath)
      
      if (typeof fieldValue === 'string' && fieldValue.trim()) {
        const detection = ContentDetector.detect(fieldValue)
        const wordConfig = fieldConfig.wordExport

        // 检查是否需要导出到 Word
        const shouldDetectImages = wordConfig?.detectImages !== false
        const shouldDetectTables = wordConfig?.detectTables !== false

        if (shouldDetectImages && detection.hasImages) {
          hasImages = true
          needsWordExport = true
          wordExportReasons.push(`${fieldConfig.fieldPath.join('.')}: 检测到${detection.imageCount}个图片`)
        }

        if (shouldDetectTables && detection.hasTables) {
          hasTables = true
          needsWordExport = true
          wordExportReasons.push(`${fieldConfig.fieldPath.join('.')}: 检测到${detection.tableCount}个表格`)
        }
      }
    })

    // 添加标记
    const processedItem = { ...item }
    if (needsWordExport) {
      processedItem.needsWordExport = true
      processedItem.hasImages = hasImages
      processedItem.hasTables = hasTables
      processedItem.wordExportReason = wordExportReasons
      
      console.log(`[DocumentParser] 项目 ${index} 标记为需要 Word 导出:`, wordExportReasons)
    }

    return processedItem
  }

  /**
   * 🆕 获取配置了 Word 导出的字段
   */
  private static getFieldsWithWordExportConfig(schema: DocParserSchema): Array<{
    fieldPath: string[]
    wordExport?: any
  }> {
    const fields: Array<{ fieldPath: string[], wordExport?: any }> = []
    
    if (schema.type === 'array' && schema.items && !Array.isArray(schema.items)) {
      // 数组项是对象
      this.collectWordExportFields(schema.items, fields, [])
    } else if (schema.type === 'object' && schema.properties) {
      // 根对象
      this.collectWordExportFields(schema, fields, [])
    }
    
    return fields
  }

  /**
   * 🆕 递归收集配置了 Word 导出的字段
   */
  private static collectWordExportFields(
    schemaField: DocParserSchemaField, 
    fields: Array<{ fieldPath: string[], wordExport?: any }>, 
    currentPath: string[]
  ): void {
    if (!schemaField.properties) return

    Object.entries(schemaField.properties).forEach(([key, field]) => {
      const fieldPath = [...currentPath, key]
      
      // 检查当前字段是否配置了 Word 导出
      if (field['x-export']?.wordExport?.enabled) {
        fields.push({
          fieldPath,
          wordExport: field['x-export'].wordExport
        })
      }
      
      // 递归检查子字段
      if (field.type === 'object' && field.properties) {
        this.collectWordExportFields(field, fields, fieldPath)
      }
    })
  }

  /**
   * 🆕 添加默认的 Word 导出检测（当没有配置时）
   */
  private static addDefaultWordExportDetection(item: any, index: number): any {
    // 默认检测常见的题目和答案字段
    const commonFields = ['questionContent', 'answer', 'content', 'text', 'description']
    const fieldsToCheck = commonFields.filter(field => 
      typeof item[field] === 'string' && item[field].trim()
    )
    
    if (fieldsToCheck.length === 0) {
      return item
    }

    const detection = ContentDetector.detectInFields(item, fieldsToCheck)
    
    if (detection.hasImages || detection.hasTables) {
      const processedItem = { ...item }
      processedItem.needsWordExport = true
      processedItem.hasImages = detection.hasImages
      processedItem.hasTables = detection.hasTables
      processedItem.wordExportReason = detection.detectionReasons
      
      console.log(`[DocumentParser] 项目 ${index} 默认检测标记为需要 Word 导出:`, detection.detectionReasons)
      return processedItem
    }
    
    return item
  }

  /**
   * 🆕 根据字段路径获取值
   */
  private static getFieldValue(obj: any, path: string[]): any {
    let current = obj
    for (const key of path) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key]
      } else {
        return undefined
      }
    }
    return current
  }
}

