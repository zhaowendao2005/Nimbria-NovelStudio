/**
 * DocParser Service
 * 提供文档解析相关的文件操作服务
 */

import * as fs from 'fs-extra'
import * as path from 'path'
import { dialog } from 'electron'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('DocParserService')

/**
 * 默认 Schema 模板
 */
const SCHEMA_TEMPLATES = {
  excel: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        questionNumber: {
          type: 'string',
          description: '题号',
          'x-parse': {
            pattern: '^\\d+\\.?\\s*',
            mode: 'extract',
            flags: 'm'
          },
          'x-export': {
            columnName: '题号',
            columnOrder: 1,
            columnWidth: 10
          }
        },
        questionContent: {
          type: 'string',
          description: '题目内容',
          'x-parse': {
            pattern: '(?<=^\\d+\\.?\\s*)(.+?)(?=\\n[A-D]\\.|$)',
            mode: 'extract',
            flags: 'ms'
          },
          'x-export': {
            columnName: '题目',
            columnOrder: 2,
            columnWidth: 50
          }
        },
        answer: {
          type: 'string',
          description: '答案',
          'x-parse': {
            pattern: '答案[:\\s]*([A-D])',
            mode: 'extract',
            captureGroups: [1],
            flags: 'i'
          },
          'x-export': {
            columnName: '答案',
            columnOrder: 3,
            columnWidth: 10
          }
        }
      },
      required: ['questionNumber', 'questionContent']
    }
  }
}

/**
 * DocParser Service Class
 */
export class DocParserService {
  /**
   * 创建新的 Schema 文件
   */
  async createSchema(
    projectPath: string,
    schemaName: string,
    template: keyof typeof SCHEMA_TEMPLATES = 'excel'
  ): Promise<string> {
    try {
      // 确保 Schema 目录存在
      const schemaDir = path.join(projectPath, '.docparser', 'schema')
      await fs.ensureDir(schemaDir)
      
      // 生成 Schema 文件路径
      const fileName = `${schemaName}.schema.json`
      const schemaPath = path.join(schemaDir, fileName)
      
      // 检查文件是否已存在
      if (await fs.pathExists(schemaPath)) {
        throw new Error(`Schema 文件已存在: ${fileName}`)
      }
      
      // 获取模板并写入文件
      const schemaContent = SCHEMA_TEMPLATES[template]
      await fs.writeJson(schemaPath, schemaContent, { spaces: 2 })
      
      logger.info(`Schema 创建成功: ${schemaPath}`)
      return schemaPath
    } catch (error) {
      logger.error('创建 Schema 失败:', error)
      throw error
    }
  }
  
  /**
   * 加载 Schema 文件
   */
  async loadSchema(schemaPath: string): Promise<string> {
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(schemaPath)) {
        throw new Error(`Schema 文件不存在: ${schemaPath}`)
      }
      
      // 读取文件内容
      const content = await fs.readFile(schemaPath, 'utf-8')
      
      logger.debug(`Schema 加载成功: ${schemaPath}`)
      return content
    } catch (error) {
      logger.error('加载 Schema 失败:', error)
      throw error
    }
  }
  
  /**
   * 保存 Schema 文件
   */
  async saveSchema(schemaPath: string, content: string): Promise<boolean> {
    try {
      // 验证 JSON 格式
      try {
        JSON.parse(content)
      } catch {
        throw new Error('Schema 内容不是有效的 JSON 格式')
      }
      
      // 确保目录存在
      await fs.ensureDir(path.dirname(schemaPath))
      
      // 写入文件
      await fs.writeFile(schemaPath, content, 'utf-8')
      
      logger.debug(`Schema 保存成功: ${schemaPath}`)
      return true
    } catch (error) {
      logger.error('保存 Schema 失败:', error)
      throw error
    }
  }
  
  /**
   * 列出项目中的所有 Schema 文件
   */
  async listSchemas(projectPath: string): Promise<string[]> {
    try {
      const schemaDir = path.join(projectPath, '.docparser', 'schema')
      
      // 检查目录是否存在
      if (!await fs.pathExists(schemaDir)) {
        return []
      }
      
      // 读取目录
      const files = await fs.readdir(schemaDir)
      
      // 筛选 .schema.json 文件
      const schemaFiles = files
        .filter(file => file.endsWith('.schema.json'))
        .map(file => path.join(schemaDir, file))
      
      logger.debug(`列出 ${schemaFiles.length} 个 Schema 文件`)
      return schemaFiles
    } catch (error) {
      logger.error('列出 Schema 失败:', error)
      throw error
    }
  }
  
  /**
   * 打开 Schema 文件选择器
   */
  async selectSchemaFile(defaultPath?: string): Promise<Electron.OpenDialogReturnValue> {
    try {
      const dialogOptions: Electron.OpenDialogOptions = {
        title: '选择 Schema 文件',
        properties: ['openFile'],
        filters: [
          { name: 'Schema 文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      }
      
      if (defaultPath) {
        dialogOptions.defaultPath = defaultPath
      }
      
      const result = await dialog.showOpenDialog(dialogOptions)
      
      logger.debug('Schema 文件选择结果:', result)
      return result
    } catch (error) {
      logger.error('打开 Schema 文件选择器失败:', error)
      throw error
    }
  }
  
  /**
   * 打开待解析文档选择器
   */
  async selectDocumentFile(defaultPath?: string): Promise<Electron.OpenDialogReturnValue> {
    try {
      const dialogOptions: Electron.OpenDialogOptions = {
        title: '选择待解析文档',
        properties: ['openFile'],
        filters: [
          { name: '文本文件', extensions: ['txt', 'md', 'log', 'csv'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      }
      
      if (defaultPath) {
        dialogOptions.defaultPath = defaultPath
      }
      
      const result = await dialog.showOpenDialog(dialogOptions)
      
      logger.debug('文档文件选择结果:', result)
      return result
    } catch (error) {
      logger.error('打开文档文件选择器失败:', error)
      throw error
    }
  }
  
  /**
   * 打开导出路径选择器
   */
  async selectExportPath(
    defaultPath?: string,
    fileName: string = 'export.xlsx'
  ): Promise<Electron.SaveDialogReturnValue> {
    try {
      const result = await dialog.showSaveDialog({
        title: '选择导出路径',
        defaultPath: defaultPath ? path.join(defaultPath, fileName) : fileName,
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx'] },
          { name: 'CSV 文件', extensions: ['csv'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })
      
      logger.debug('导出路径选择结果:', result)
      return result
    } catch (error) {
      logger.error('打开导出路径选择器失败:', error)
      throw error
    }
  }
  
  /**
   * 读取待解析文档
   */
  async readDocument(filePath: string): Promise<string> {
    try {
      // 检查文件是否存在
      if (!await fs.pathExists(filePath)) {
        throw new Error(`文档文件不存在: ${filePath}`)
      }
      
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8')
      
      logger.debug(`文档读取成功: ${filePath}, 大小: ${content.length} 字节`)
      return content
    } catch (error) {
      logger.error('读取文档失败:', error)
      throw error
    }
  }
  
  /**
   * 保存导出文件
   */
  async saveExport(
    filePath: string,
    data: Buffer | Uint8Array,
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<boolean> {
    try {
      // 确保目录存在
      await fs.ensureDir(path.dirname(filePath))
      
      // 写入文件
      await fs.writeFile(filePath, data)
      
      logger.info(`导出文件保存成功: ${filePath}, 格式: ${format}`)
      return true
    } catch (error) {
      logger.error('保存导出文件失败:', error)
      throw error
    }
  }
}

// 导出单例实例
export const docParserService = new DocParserService()

