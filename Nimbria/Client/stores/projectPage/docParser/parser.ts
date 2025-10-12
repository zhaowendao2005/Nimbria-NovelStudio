/**
 * 文档解析逻辑封装
 * Store层调用Service层的解析功能
 */

import { DocumentParser, SchemaValidator } from '@service/docParser'
import type { DocParserSchema, ParsedData } from './docParser.types'
import { ElMessage } from 'element-plus'

/**
 * 解析文档
 * @param content 文档内容
 * @param schema Schema定义
 * @returns 解析结果
 */
export async function parseDocument(
  content: string,
  schema: DocParserSchema
): Promise<ParsedData> {
  console.log('[Parser] 开始解析文档')
  
  // 1. 验证Schema
  const validation = SchemaValidator.validate(schema)
  if (!validation.valid) {
    const errorMsg = `Schema验证失败: ${validation.errors.join('; ')}`
    ElMessage.error(errorMsg)
    throw new Error(errorMsg)
  }
  
  // 显示警告（如果有）
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
      ElMessage.warning(warning)
    })
  }
  
  // 2. 验证文档内容
  if (!content || content.trim().length === 0) {
    ElMessage.error('文档内容为空')
    throw new Error('文档内容为空')
  }
  
  try {
    // 3. 执行解析
    const result = DocumentParser.parseAdvanced(content, schema)
    
    console.log('[Parser] 解析成功')
    ElMessage.success('文档解析成功')
    
    return result
    
  } catch (error) {
    const errorMsg = `解析失败: ${error}`
    console.error('[Parser]', errorMsg)
    ElMessage.error(errorMsg)
    throw error
  }
}

/**
 * 快速验证：检查是否可以解析
 */
export function canParse(content: string, schema: DocParserSchema): boolean {
  if (!content || content.trim().length === 0) {
    return false
  }
  
  return SchemaValidator.quickValidate(schema)
}

/**
 * 预览解析（限制处理量）
 * @param content 文档内容
 * @param schema Schema定义
 * @param maxLines 最大处理行数
 * @returns 预览结果
 */
export async function previewParse(
  content: string,
  schema: DocParserSchema,
  maxLines: number = 100
): Promise<ParsedData> {
  console.log('[Parser] 预览解析，最大行数:', maxLines)
  
  const lines = content.split('\n')
  const previewContent = lines.slice(0, maxLines).join('\n')
  
  return parseDocument(previewContent, schema)
}

