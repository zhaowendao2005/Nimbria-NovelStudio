/**
 * DocParser IPC Handlers
 * 注册 DocParser 相关的 IPC 处理器
 */

import { ipcMain } from 'electron'
import { CHANNELS } from './channel-definitions'
import { docParserService } from '../../services/docParser/docParser-service'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('DocParserHandlers')

/**
 * 注册所有 DocParser IPC Handlers
 */
export function registerDocParserHandlers() {
  logger.info('Registering DocParser IPC handlers')

  // 创建 Schema
  ipcMain.handle(
    CHANNELS.DOCPARSER_CREATE_SCHEMA,
    async (_event, params: { projectPath: string; schemaName: string; template?: string }) => {
      try {
        logger.debug('IPC: docParser:createSchema', params)
        const schemaPath = await docParserService.createSchema(
          params.projectPath,
          params.schemaName,
          params.template as 'excel' | undefined
        )
        return { success: true, data: schemaPath }
      } catch (error) {
        logger.error('IPC: docParser:createSchema failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 加载 Schema
  ipcMain.handle(CHANNELS.DOCPARSER_LOAD_SCHEMA, async (_event, params: { schemaPath: string }) => {
    try {
      logger.debug('IPC: docParser:loadSchema', params.schemaPath)
      const content = await docParserService.loadSchema(params.schemaPath)
      return { success: true, data: content }
    } catch (error) {
      logger.error('IPC: docParser:loadSchema failed', error)
      return { success: false, error: String(error) }
    }
  })

  // 保存 Schema
  ipcMain.handle(
    CHANNELS.DOCPARSER_SAVE_SCHEMA,
    async (_event, params: { schemaPath: string; content: string }) => {
      try {
        logger.debug('IPC: docParser:saveSchema', params.schemaPath)
        const result = await docParserService.saveSchema(params.schemaPath, params.content)
        return { success: result, data: result }
      } catch (error) {
        logger.error('IPC: docParser:saveSchema failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 列出 Schema 文件
  ipcMain.handle(
    CHANNELS.DOCPARSER_LIST_SCHEMAS,
    async (_event, params: { projectPath: string }) => {
      try {
        logger.debug('IPC: docParser:listSchemas', params.projectPath)
        const schemas = await docParserService.listSchemas(params.projectPath)
        return { success: true, data: schemas }
      } catch (error) {
        logger.error('IPC: docParser:listSchemas failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 选择 Schema 文件
  ipcMain.handle(
    CHANNELS.DOCPARSER_SELECT_SCHEMA_FILE,
    async (_event, params: { defaultPath?: string }) => {
      try {
        logger.debug('IPC: docParser:selectSchemaFile', params.defaultPath)
        const result = await docParserService.selectSchemaFile(params.defaultPath)
        return { success: true, data: result }
      } catch (error) {
        logger.error('IPC: docParser:selectSchemaFile failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 选择待解析文档
  ipcMain.handle(
    CHANNELS.DOCPARSER_SELECT_DOCUMENT_FILE,
    async (_event, params: { defaultPath?: string }) => {
      try {
        logger.debug('IPC: docParser:selectDocumentFile', params.defaultPath)
        const result = await docParserService.selectDocumentFile(params.defaultPath)
        return { success: true, data: result }
      } catch (error) {
        logger.error('IPC: docParser:selectDocumentFile failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 选择导出路径
  ipcMain.handle(
    CHANNELS.DOCPARSER_SELECT_EXPORT_PATH,
    async (_event, params: { defaultPath?: string; fileName?: string }) => {
      try {
        logger.debug('IPC: docParser:selectExportPath', params)
        const result = await docParserService.selectExportPath(params.defaultPath, params.fileName)
        return { success: true, data: result }
      } catch (error) {
        logger.error('IPC: docParser:selectExportPath failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 读取待解析文档
  ipcMain.handle(
    CHANNELS.DOCPARSER_READ_DOCUMENT,
    async (_event, params: { filePath: string }) => {
      try {
        logger.debug('IPC: docParser:readDocument', params.filePath)
        const content = await docParserService.readDocument(params.filePath)
        return { success: true, data: content }
      } catch (error) {
        logger.error('IPC: docParser:readDocument failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // 保存导出文件
  ipcMain.handle(
    CHANNELS.DOCPARSER_SAVE_EXPORT,
    async (_event, params: { filePath: string; data: Uint8Array; format?: string }) => {
      try {
        logger.debug('IPC: docParser:saveExport', params.filePath, params.format)
        const buffer = Buffer.from(params.data)
        const result = await docParserService.saveExport(
          params.filePath,
          buffer,
          (params.format as 'xlsx' | 'csv') || 'xlsx'
        )
        return { success: result, data: result }
      } catch (error) {
        logger.error('IPC: docParser:saveExport failed', error)
        return { success: false, error: String(error) }
      }
    }
  )

  logger.info('DocParser IPC handlers registered successfully')
}

/**
 * 卸载所有 DocParser IPC Handlers
 */
export function unregisterDocParserHandlers() {
  logger.info('Unregistering DocParser IPC handlers')

  ipcMain.removeHandler(CHANNELS.DOCPARSER_CREATE_SCHEMA)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_LOAD_SCHEMA)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_SAVE_SCHEMA)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_LIST_SCHEMAS)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_SELECT_SCHEMA_FILE)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_SELECT_DOCUMENT_FILE)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_SELECT_EXPORT_PATH)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_READ_DOCUMENT)
  ipcMain.removeHandler(CHANNELS.DOCPARSER_SAVE_EXPORT)

  logger.info('DocParser IPC handlers unregistered')
}

