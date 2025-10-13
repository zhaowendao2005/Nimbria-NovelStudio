/**
 * 导出协调器
 * 统一管理 Excel 和 Word 的联合导出逻辑
 */

import type { 
  ParsedData, 
  ExportConfig, 
  WordExportResult,
  WordExportOptions 
} from '@stores/projectPage/docParser/docParser.types'

import { ExcelExporter } from './excelExporter'
import { WordExporter } from './wordExporter'

export interface CombinedExportOptions {
  excelPath: string
  wordPath?: string
  excelSheetName?: string
  wordOptions?: Partial<WordExportOptions>
}

export interface CombinedExportResult {
  success: boolean
  excelPath?: string
  wordPath?: string
  excelSize?: number
  wordSize?: number
  stats: {
    totalItems: number
    excelItems: number
    wordItems: number
    retainedInExcelItems: number
  }
  errors?: string[]
}

/**
 * 导出协调器
 */
export class ExportCoordinator {
  /**
   * 执行联合导出（Excel + Word）
   */
  static async exportCombined(
    data: ParsedData[],
    config: ExportConfig,
    options: CombinedExportOptions
  ): Promise<CombinedExportResult> {
    console.log('[ExportCoordinator] 开始联合导出')
    console.log('[ExportCoordinator] 数据项数:', data.length)
    console.log('[ExportCoordinator] Word 导出启用:', config.wordExport?.enabled)

    const result: CombinedExportResult = {
      success: false,
      stats: {
        totalItems: data.length,
        excelItems: 0,
        wordItems: 0,
        retainedInExcelItems: 0
      },
      errors: []
    }

    try {
      // 1. 分析数据，计算统计信息
      this.analyzeData(data, result.stats)
      
      // 2. 导出 Excel（始终执行）
      const excelResult = await this.exportExcel(data, config, options)
      if (excelResult.success) {
        result.excelPath = excelResult.path
        result.excelSize = excelResult.size
      } else {
        result.errors!.push(...(excelResult.errors || []))
      }

      // 3. 如果启用了 Word 导出，无论是否有需要导出的内容都生成 Word（作为附属文件）
      if (config.wordExport?.enabled) {
        const wordResult = await this.exportWord(data, config, options)
        if (wordResult.success) {
          result.wordPath = wordResult.wordPath
          result.wordSize = wordResult.wordPath ? 0 : undefined // TODO: 获取真实大小
        } else {
          result.errors!.push(...(wordResult.errors || []))
        }
      }

      // 4. 确定整体成功状态
      result.success = excelResult.success && (
        !config.wordExport?.enabled || 
        result.stats.wordItems === 0 ||
        result.wordPath !== undefined
      )

      console.log('[ExportCoordinator] 联合导出完成:', {
        success: result.success,
        excelPath: result.excelPath,
        wordPath: result.wordPath,
        stats: result.stats
      })

      return result

    } catch (error) {
      console.error('[ExportCoordinator] 联合导出失败:', error)
      result.errors!.push(error instanceof Error ? error.message : String(error))
      return result
    }
  }

  /**
   * 分析数据，计算统计信息
   */
  private static analyzeData(data: ParsedData[], stats: CombinedExportResult['stats']): void {
    stats.totalItems = data.length
    stats.wordItems = data.filter(item => item.needsWordExport === true).length
    stats.excelItems = data.length // Excel 始终包含所有项目
    
    // TODO: 基于具体配置计算 retainedInExcelItems
    // 现在先假设所有需要 Word 导出的项目都会在 Excel 中保留
    stats.retainedInExcelItems = stats.wordItems
  }

  /**
   * 导出 Excel
   */
  private static async exportExcel(
    data: ParsedData[],
    config: ExportConfig,
    options: CombinedExportOptions
  ): Promise<{ success: boolean; path?: string; size?: number; errors?: string[] }> {
    try {
      console.log('[ExportCoordinator] 导出 Excel 到:', options.excelPath)
      
      // 使用现有的 ExcelExporter
      const buffer = ExcelExporter.export(data, config, options.excelSheetName)
      
      // TODO: 保存文件（需要调用 DataSource 或 IPC）
      console.log('[ExportCoordinator] Excel 文件已生成，大小:', buffer.byteLength, 'bytes')
      
      return {
        success: true,
        path: options.excelPath,
        size: buffer.byteLength
      }
    } catch (error) {
      console.error('[ExportCoordinator] Excel 导出失败:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      }
    }
  }

  /**
   * 导出 Word
   */
  private static async exportWord(
    data: ParsedData[],
    config: ExportConfig,
    options: CombinedExportOptions
  ): Promise<WordExportResult> {
    if (!options.wordPath) {
      // 如果没有指定 Word 路径，自动生成
      options.wordPath = this.generateWordPath(options.excelPath)
    }

    console.log('[ExportCoordinator] 导出 Word 到:', options.wordPath)

    const wordOptions: WordExportOptions = {
      filename: options.wordPath,
      includeImages: options.wordOptions?.includeImages !== false,
      includeChapters: options.wordOptions?.includeChapters !== false,
      imageHandling: options.wordOptions?.imageHandling || 'reference',
      replacementText: options.wordOptions?.replacementText || '详见 Word 文档',
      ...options.wordOptions
    }

    return WordExporter.export(data, config, wordOptions)
  }

  /**
   * 根据 Excel 路径生成 Word 路径
   */
  private static generateWordPath(excelPath: string): string {
    // 命名规则：{excelname}.附件.docx
    // 例如：C:\a\b\export.xlsx -> C:\a\b\export.附件.docx
    const lastDot = excelPath.lastIndexOf('.')
    if (lastDot <= 0) return `${excelPath}.附件.docx`
    const base = excelPath.substring(0, lastDot)
    return `${base}.附件.docx`
  }

  /**
   * 获取导出预览信息
   */
  static getExportPreview(data: ParsedData[], config: ExportConfig): {
    totalItems: number
    wordItems: number
    excelItems: number
    wordEnabled: boolean
    previewItems: Array<{
      id: string
      needsWordExport: boolean
      hasImages: boolean
      hasTables: boolean
      wordExportReason?: string[]
    }>
  } {
    const wordItems = data.filter(item => item.needsWordExport === true)
    
    return {
      totalItems: data.length,
      wordItems: wordItems.length,
      excelItems: data.length,
      wordEnabled: config.wordExport?.enabled || false,
      previewItems: data.slice(0, 10).map((item, index) => ({
        id: `item-${index}`,
        needsWordExport: item.needsWordExport || false,
        hasImages: item.hasImages || false,
        hasTables: item.hasTables || false,
        wordExportReason: item.wordExportReason
      }))
    }
  }

  /**
   * 验证导出配置
   */
  static validateExportConfig(config: ExportConfig): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查基本配置
    if (!config.columns || config.columns.length === 0) {
      errors.push('缺少列配置')
    }

    // 检查 Word 导出配置
    if (config.wordExport?.enabled) {
      if (!WordExporter.isSupported()) {
        warnings.push('Word 导出功能需要安装 docx 库')
      }
      
      if (!config.wordExport.filename) {
        warnings.push('未指定 Word 文档文件名，将使用默认名称')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}
