/**
 * Excel导出器
 * 将解析后的JSON数据导出为Excel文件
 */

import * as XLSX from 'xlsx'
import type { ParsedData, ExportConfig, ExportMetadata } from '@stores/projectPage/docParser/docParser.types'
import type { ExcelExportOptions, ExcelColumnConfig, CellFormat } from './docParser.service.types'

/**
 * Excel导出器
 */
export class ExcelExporter {
  /**
   * 导出为Excel
   * @param data 解析后的数据
   * @param config 导出配置
   * @param sheetName 工作表名称
   * @returns ArrayBuffer
   */
  static export(
    data: ParsedData,
    config: ExportConfig,
    sheetName: string = 'Sheet1'
  ): ArrayBuffer {
    console.log('[ExcelExporter] 开始导出Excel')
    console.log('[ExcelExporter] 配置:', config)
    console.log('[ExcelExporter] 数据:', data)
    
    // 1. 将嵌套JSON展平为表格行
    const rows = this.flattenData(data, config)
    console.log('[ExcelExporter] 展平后行数:', rows.length)
    
    // 2. 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 3. 创建工作表
    const worksheet = this.createWorksheet(rows, config)
    
    // 4. 应用样式（如果支持）
    this.applyStyles(worksheet, rows, config)
    
    // 5. 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    // 6. 生成ArrayBuffer
    const buffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx'
    })
    
    console.log('[ExcelExporter] Excel导出完成，大小:', buffer.byteLength)
    return buffer as ArrayBuffer
  }
  
  /**
   * 展平嵌套数据为表格行
   */
  private static flattenData(data: ParsedData, config: ExportConfig): any[][] {
    const rows: any[][] = []
    
    // 1. 添加表头
    const headers = config.columns.map(col => col.name)
    rows.push(headers)
    
    // 2. 递归提取数据
    const extractRows = (obj: any, parentPath: string[] = []): any[][] => {
      const results: any[][] = []
      
      // 检查是否为数组
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          const itemRows = extractRows(item, parentPath)
          results.push(...itemRows)
        })
      } else if (typeof obj === 'object' && obj !== null) {
        // 检查当前对象是否应该作为一行
        const hasLeafData = config.columns.some(col => {
          const value = this.getValueByPath(obj, col.field, parentPath)
          return value !== undefined && value !== null
        })
        
        if (hasLeafData) {
          // 创建一行
          const row = config.columns.map(col => {
            return this.getValueByPath(obj, col.field, parentPath) || ''
          })
          results.push(row)
        }
        
        // 检查子对象
        Object.entries(obj).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            const childRows = extractRows(value, [...parentPath, key])
            results.push(...childRows)
          }
        })
      }
      
      return results
    }
    
    const dataRows = extractRows(data)
    rows.push(...dataRows)
    
    return rows
  }
  
  /**
   * 根据路径获取值
   */
  private static getValueByPath(obj: any, path: string[], parentPath: string[] = []): any {
    let current = obj
    const fullPath = [...parentPath, ...path]
    
    for (const key of fullPath) {
      if (key === '[]') {
        // 跳过数组标记
        continue
      }
      
      if (current === undefined || current === null) {
        return undefined
      }
      
      if (Array.isArray(current) && current.length > 0) {
        // 如果当前是数组，取第一个元素（后续会递归处理所有元素）
        current = current[0]
      }
      
      current = current[key]
    }
    
    return current
  }
  
  /**
   * 创建工作表
   */
  private static createWorksheet(rows: any[][], config: ExportConfig): XLSX.WorkSheet {
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    
    // 设置列宽
    const colWidths = config.columns.map(col => ({
      wch: col.width || 15
    }))
    worksheet['!cols'] = colWidths
    
    // 冻结首行（表头）
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    return worksheet
  }
  
  /**
   * 应用样式
   * 注意：标准xlsx库不支持样式，需要使用xlsx-style或类似库
   * 这里先留空，后续可扩展
   */
  private static applyStyles(
    worksheet: XLSX.WorkSheet,
    rows: any[][],
    config: ExportConfig
  ): void {
    // TODO: 实现样式应用
    // 目前xlsx库的基础版本不支持样式
    // 可以考虑使用 xlsx-js-style 或 exceljs 库
    
    console.log('[ExcelExporter] 样式应用（占位）')
  }
  
  /**
   * 导出为CSV（作为备选方案）
   */
  static exportCSV(data: ParsedData, config: ExportConfig): string {
    console.log('[ExcelExporter] 开始导出CSV')
    
    const rows = this.flattenData(data, config)
    
    const csvContent = rows.map(row => 
      row.map(cell => {
        // 转义包含逗号或引号的单元格
        const cellStr = String(cell || '')
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(',')
    ).join('\n')
    
    console.log('[ExcelExporter] CSV导出完成')
    return csvContent
  }
  
  /**
   * 高级导出：支持章节分组
   */
  static exportAdvanced(
    data: ParsedData,
    config: ExportConfig,
    options: {
      groupBy?: string[]
      sheetName?: string
      includeHeaders?: boolean
    } = {}
  ): ArrayBuffer {
    console.log('[ExcelExporter] 高级导出')
    
    const workbook = XLSX.utils.book_new()
    const sheetName = options.sheetName || 'Sheet1'
    
    // 创建主工作表
    const rows = this.flattenData(data, config)
    const worksheet = this.createWorksheet(rows, config)
    
    // 如果有章节标题字段，添加分组
    if (config.sectionHeaders && config.sectionHeaders.length > 0) {
      this.addSectionHeaders(worksheet, rows, config)
    }
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    const buffer = XLSX.write(workbook, {
      type: 'array',
      bookType: 'xlsx'
    })
    
    return buffer as ArrayBuffer
  }
  
  /**
   * 添加章节标题
   */
  private static addSectionHeaders(
    worksheet: XLSX.WorkSheet,
    rows: any[][],
    config: ExportConfig
  ): void {
    // TODO: 实现章节标题插入
    // 需要在数据行之间插入章节标题行
    console.log('[ExcelExporter] 添加章节标题（占位）')
  }
}

