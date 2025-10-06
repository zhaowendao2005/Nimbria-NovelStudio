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
} as const;

export type ChannelName = typeof CHANNELS[keyof typeof CHANNELS];
