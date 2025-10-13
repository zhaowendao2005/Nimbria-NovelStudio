/**
 * 内容检测服务
 * 用于检测题目和答案中的图片、表格等需要单独导出到Word的内容
 */

import type { ContentDetectionResult } from '@stores/projectPage/docParser/docParser.types'

export class ContentDetector {
  /**
   * 检测文本内容中的图片和表格
   */
  static detect(content: string): ContentDetectionResult {
    const result: ContentDetectionResult = {
      hasImages: false,
      hasTables: false,
      imageCount: 0,
      tableCount: 0,
      imageReferences: [],
      detectionReasons: []
    }

    if (!content || typeof content !== 'string') {
      return result
    }

    // 检测图片
    this.detectImages(content, result)
    
    // 检测表格
    this.detectTables(content, result)

    return result
  }

  /**
   * 检测图片引用
   */
  private static detectImages(content: string, result: ContentDetectionResult): void {
    // Markdown 图片格式: ![alt](src) 或 ![alt](src "title")
    const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    
    // HTML img 标签: <img ...>
    const htmlImageRegex = /<img[^>]+>/gi
    
    // HTML img 标签中的 src 属性
    const imgSrcRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi

    let match: RegExpExecArray | null

    // 检测 Markdown 图片
    while ((match = markdownImageRegex.exec(content)) !== null) {
      result.hasImages = true
      result.imageCount++
      result.imageReferences.push(match[2]) // src 部分
      result.detectionReasons.push(`Markdown图片: ${match[0]}`)
    }

    // 检测 HTML 图片
    while ((match = htmlImageRegex.exec(content)) !== null) {
      result.hasImages = true
      result.imageCount++
      result.detectionReasons.push(`HTML图片: ${match[0]}`)
      
      // 提取 src 属性
      const srcMatch = imgSrcRegex.exec(match[0])
      if (srcMatch) {
        result.imageReferences.push(srcMatch[1])
      }
    }
  }

  /**
   * 检测表格
   */
  private static detectTables(content: string, result: ContentDetectionResult): void {
    // Markdown 表格格式检测
    // 至少包含表头分隔行 (如: |---|---|)
    const markdownTableRegex = /^\s*\|.*\|\s*\n\s*\|[\s\-:]+\|\s*$/gm
    
    // HTML 表格标签
    const htmlTableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi

    let match: RegExpExecArray | null

    // 检测 Markdown 表格
    while ((match = markdownTableRegex.exec(content)) !== null) {
      result.hasTables = true
      result.tableCount++
      result.detectionReasons.push(`Markdown表格: 发现表格分隔符`)
    }

    // 检测 HTML 表格
    while ((match = htmlTableRegex.exec(content)) !== null) {
      result.hasTables = true
      result.tableCount++
      result.detectionReasons.push(`HTML表格: ${match[0].substring(0, 50)}...`)
    }
  }

  /**
   * 批量检测多个字段的内容
   */
  static detectInFields(data: Record<string, any>, fieldsToCheck: string[] = []): ContentDetectionResult {
    const combinedResult: ContentDetectionResult = {
      hasImages: false,
      hasTables: false,
      imageCount: 0,
      tableCount: 0,
      imageReferences: [],
      detectionReasons: []
    }

    // 如果没有指定字段，检测所有字符串字段
    const fields = fieldsToCheck.length > 0 
      ? fieldsToCheck 
      : Object.keys(data).filter(key => typeof data[key] === 'string')

    fields.forEach(field => {
      const content = data[field]
      if (typeof content === 'string' && content.trim()) {
        const fieldResult = this.detect(content)
        
        // 合并结果
        if (fieldResult.hasImages) {
          combinedResult.hasImages = true
          combinedResult.imageCount += fieldResult.imageCount
          combinedResult.imageReferences.push(...fieldResult.imageReferences)
        }
        
        if (fieldResult.hasTables) {
          combinedResult.hasTables = true
          combinedResult.tableCount += fieldResult.tableCount
        }
        
        // 添加字段前缀到检测原因
        combinedResult.detectionReasons.push(
          ...fieldResult.detectionReasons.map(reason => `${field}: ${reason}`)
        )
      }
    })

    return combinedResult
  }

  /**
   * 检查是否需要导出到 Word
   */
  static needsWordExport(
    content: string | Record<string, any>,
    options: {
      detectImages?: boolean
      detectTables?: boolean
      fieldsToCheck?: string[]
    } = {}
  ): boolean {
    const { detectImages = true, detectTables = true, fieldsToCheck = [] } = options

    let result: ContentDetectionResult

    if (typeof content === 'string') {
      result = this.detect(content)
    } else {
      result = this.detectInFields(content, fieldsToCheck)
    }

    return (detectImages && result.hasImages) || (detectTables && result.hasTables)
  }
}
