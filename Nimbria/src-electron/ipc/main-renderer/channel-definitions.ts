/**
 * IPC 通道定义
 */

export const CHANNELS = {
  // Markdown 文件树操作
  MARKDOWN_SCAN_TREE: 'markdown:scanTree',
  MARKDOWN_READ_FILE: 'markdown:readFile',
  MARKDOWN_WRITE_FILE: 'markdown:writeFile',
  MARKDOWN_BATCH_WRITE: 'markdown:batchWrite',
  
  // Markdown 备份管理
  MARKDOWN_CREATE_BACKUP: 'markdown:createBackup',
  MARKDOWN_LIST_BACKUPS: 'markdown:listBackups',
  MARKDOWN_RESTORE_BACKUP: 'markdown:restoreBackup',
  
  // Markdown 文件监视
  MARKDOWN_WATCH_START: 'markdown:watchStart',
  MARKDOWN_WATCH_STOP: 'markdown:watchStop',
  MARKDOWN_FILE_CHANGED: 'markdown:fileChanged', // 事件推送
  
  // 文件/目录创建
  FILE_CREATE: 'file:create',
  DIRECTORY_CREATE: 'file:createDirectory',
  
  // DocParser Schema 管理
  DOCPARSER_CREATE_SCHEMA: 'docParser:createSchema',
  DOCPARSER_LOAD_SCHEMA: 'docParser:loadSchema',
  DOCPARSER_SAVE_SCHEMA: 'docParser:saveSchema',
  DOCPARSER_LIST_SCHEMAS: 'docParser:listSchemas',
  
  // DocParser 文件选择器
  DOCPARSER_SELECT_SCHEMA_FILE: 'docParser:selectSchemaFile',
  DOCPARSER_SELECT_DOCUMENT_FILE: 'docParser:selectDocumentFile',
  DOCPARSER_SELECT_EXPORT_PATH: 'docParser:selectExportPath',
  
  // DocParser 文档操作
  DOCPARSER_READ_DOCUMENT: 'docParser:readDocument',
  DOCPARSER_SAVE_EXPORT: 'docParser:saveExport',
} as const;

export type ChannelName = typeof CHANNELS[keyof typeof CHANNELS];
