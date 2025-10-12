/**
 * 导出逻辑封装
 * Store层调用Service层的导出功能
 */

import { ExcelExporter } from '@service/docParser'
import DataSource from '../DataSource'
import type { ParsedData, ExportConfig } from './docParser.types'
import { ElMessage } from 'element-plus'

/**
 * 导出为Excel
 * @param data 解析后的数据
 * @param config 导出配置
 * @param outputPath 输出路径
 * @param sheetName 工作表名称
 */
export async function exportToExcel(
  data: ParsedData,
  config: ExportConfig,
  outputPath: string,
  sheetName: string = 'Sheet1'
): Promise<boolean> {
  console.log('[Exporter] 开始导出Excel')
  console.log('[Exporter] 输出路径:', outputPath)
  
  try {
    // 1. 验证数据
    if (!data || Object.keys(data).length === 0) {
      ElMessage.error('没有可导出的数据')
      return false
    }
    
    // 2. 验证配置
    if (!config || !config.columns || config.columns.length === 0) {
      ElMessage.error('导出配置无效：缺少列定义')
      return false
    }
    
    // 3. 生成Excel
    const buffer = ExcelExporter.export(data, config, sheetName)
    
    // 4. 保存文件
    const success = await DataSource.saveExportedFile(outputPath, buffer)
    
    if (success) {
      console.log('[Exporter] Excel导出成功')
      ElMessage.success(`Excel已导出到: ${outputPath}`)
      return true
    } else {
      ElMessage.error('保存Excel文件失败')
      return false
    }
    
  } catch (error) {
    const errorMsg = `导出失败: ${error}`
    console.error('[Exporter]', errorMsg)
    ElMessage.error(errorMsg)
    return false
  }
}

/**
 * 导出为CSV
 * @param data 解析后的数据
 * @param config 导出配置
 * @param outputPath 输出路径
 */
export async function exportToCSV(
  data: ParsedData,
  config: ExportConfig,
  outputPath: string
): Promise<boolean> {
  console.log('[Exporter] 开始导出CSV')
  
  try {
    if (!data || Object.keys(data).length === 0) {
      ElMessage.error('没有可导出的数据')
      return false
    }
    
    if (!config || !config.columns || config.columns.length === 0) {
      ElMessage.error('导出配置无效')
      return false
    }
    
    const csvContent = ExcelExporter.exportCSV(data, config)
    const success = await DataSource.saveExportedFile(outputPath, csvContent)
    
    if (success) {
      console.log('[Exporter] CSV导出成功')
      ElMessage.success(`CSV已导出到: ${outputPath}`)
      return true
    } else {
      ElMessage.error('保存CSV文件失败')
      return false
    }
    
  } catch (error) {
    const errorMsg = `导出失败: ${error}`
    console.error('[Exporter]', errorMsg)
    ElMessage.error(errorMsg)
    return false
  }
}

/**
 * 高级导出：支持分组和章节
 * @param data 解析后的数据
 * @param config 导出配置
 * @param outputPath 输出路径
 * @param options 导出选项
 */
export async function exportAdvanced(
  data: ParsedData,
  config: ExportConfig,
  outputPath: string,
  options: {
    sheetName?: string
    groupBy?: string[]
    includeHeaders?: boolean
  } = {}
): Promise<boolean> {
  console.log('[Exporter] 高级导出')
  
  try {
    if (!data || Object.keys(data).length === 0) {
      ElMessage.error('没有可导出的数据')
      return false
    }
    
    const buffer = ExcelExporter.exportAdvanced(data, config, options)
    const success = await DataSource.saveExportedFile(outputPath, buffer)
    
    if (success) {
      console.log('[Exporter] 高级导出成功')
      ElMessage.success(`Excel已导出到: ${outputPath}`)
      return true
    } else {
      ElMessage.error('保存Excel文件失败')
      return false
    }
    
  } catch (error) {
    const errorMsg = `导出失败: ${error}`
    console.error('[Exporter]', errorMsg)
    ElMessage.error(errorMsg)
    return false
  }
}

/**
 * 预览导出数据（不保存文件）
 * @param data 解析后的数据
 * @param config 导出配置
 * @returns 预览的表格数据
 */
export function previewExport(
  data: ParsedData,
  config: ExportConfig
): any[][] {
  console.log('[Exporter] 预览导出数据')
  
  try {
    // 使用Excel Exporter的内部方法展平数据
    // 注意：这里需要暴露flattenData方法或重新实现
    // 简化实现：直接生成再解析
    const buffer = ExcelExporter.export(data, config)
    
    // TODO: 解析buffer为二维数组用于预览
    // 当前简化为只返回提示
    return [['预览功能待实现']]
    
  } catch (error) {
    console.error('[Exporter] 预览失败:', error)
    return [['预览失败']]
  }
}

