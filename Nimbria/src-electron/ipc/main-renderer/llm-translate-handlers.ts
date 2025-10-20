/**
 * LLM Translate IPC 处理器
 * 主进程监听来自渲染进程的 IPC 消息，调用 LlmTranslateService 执行业务逻辑
 * 通过事件驱动架构向所有渲染窗口广播进度反馈
 * 
 * 架构说明：
 * - 无后端服务器，无网络请求
 * - 所有数据操作在主进程本地完成
 * - 通过 IPC 与渲染进程通信
 * - 使用 EventEmitter 实现事件驱动
 */

import { ipcMain, BrowserWindow, dialog } from 'electron'
import type { LlmTranslateService } from '../../services/llm-translate-service/llm-translate-service'
import type {
  TranslateConfig,
  ExportOptions,
  BatchCreateStartEvent,
  BatchCreatedEvent,
  BatchCreateErrorEvent,
  TaskSubmitStartEvent,
  TaskSubmittedEvent,
  TaskProgressEvent,
  TaskCompleteEvent,
  TaskErrorEvent,
  BatchPauseEvent,
  BatchResumeEvent,
  ExportStartEvent,
  ExportCompleteEvent,
  ExportErrorEvent
} from '../../services/llm-translate-service/types'

export function registerLlmTranslateHandlers(llmTranslateService: LlmTranslateService) {
  
  // ========== 事件监听器（只注册一次） ==========
  
  llmTranslateService.on('batch:create-start', (data: BatchCreateStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-create-start', data)
    })
  })

  llmTranslateService.on('batch:created', (data: BatchCreatedEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-created', data)
    })
  })

  llmTranslateService.on('batch:create-error', (data: BatchCreateErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-create-error', data)
    })
  })

  llmTranslateService.on('task:submit-start', (data: TaskSubmitStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-submit-start', data)
    })
  })

  llmTranslateService.on('task:submitted', (data: TaskSubmittedEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-submitted', data)
    })
  })

  llmTranslateService.on('task:progress', (data: TaskProgressEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-progress', data)
    })
  })

  llmTranslateService.on('task:complete', (data: TaskCompleteEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-complete', data)
    })
  })

  llmTranslateService.on('task:error', (data: TaskErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-error', data)
    })
  })

  llmTranslateService.on('batch:paused', (data: BatchPauseEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-paused', data)
    })
  })

  llmTranslateService.on('batch:resumed', (data: BatchResumeEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-resumed', data)
    })
  })

  llmTranslateService.on('export:start', (data: ExportStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:export-start', data)
    })
  })

  llmTranslateService.on('export:complete', (data: ExportCompleteEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:export-complete', data)
    })
  })

  llmTranslateService.on('export:error', (data: ExportErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:export-error', data)
    })
  })

  // ========== IPC Handlers（纯调用） ==========

  /**
   * 创建批次
   */
  ipcMain.handle('llm-translate:create-batch', async (_event, args: {
    config: TranslateConfig
  }) => {
    try {
      // 从 config 中提取 content
      const { content, ...configWithoutContent } = args.config
      
      // createBatch 返回 batchId 后会异步创建批次并通过事件通知
      const batchId = await llmTranslateService.createBatch(args.config, content)
      
      // 等待批次创建完成（通过事件或轮询）
      // 我们这里采用简单的等待策略：监听一次 batch:created 事件
      const batch = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error('批次创建超时'))
        }, 30000) // 30秒超时
        
        const onCreated = (data: BatchCreatedEvent) => {
          if (data.batchId === batchId) {
            cleanup()
            resolve(data.batch)
          }
        }
        
        const onError = (data: BatchCreateErrorEvent) => {
          if (data.batchId === batchId) {
            cleanup()
            reject(new Error(data.error))
          }
        }
        
        const cleanup = () => {
          clearTimeout(timeout)
          llmTranslateService.off('batch:created', onCreated)
          llmTranslateService.off('batch:create-error', onError)
        }
        
        llmTranslateService.once('batch:created', onCreated)
        llmTranslateService.once('batch:create-error', onError)
      })
      
      return { success: true, data: { batch } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 获取批次列表
   */
  ipcMain.handle('llm-translate:get-batches', async () => {
    try {
      const result = await llmTranslateService.getBatches()
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 获取批次的任务列表
   */
  ipcMain.handle('llm-translate:get-tasks', async (_event, args: { batchId: string }) => {
    try {
      const result = await llmTranslateService.getTasks(args.batchId)
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 获取单个任务
   */
  ipcMain.handle('llm-translate:get-task', async (_event, args: { taskId: string }) => {
    try {
      const task = await llmTranslateService.getTask(args.taskId)
      return { success: true, data: task }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 提交任务
   */
  ipcMain.handle('llm-translate:submit-tasks', async (_event, args: {
    batchId: string
    taskIds: string[]
  }) => {
    try {
      const submissionId = await llmTranslateService.submitTasks(args.batchId, args.taskIds)
      return { success: true, data: { submissionId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 重试失败任务
   */
  ipcMain.handle('llm-translate:retry-failed-tasks', async (_event, args: { batchId: string }) => {
    try {
      const submissionId = await llmTranslateService.retryFailedTasks(args.batchId)
      return { success: true, data: { submissionId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 暂停批次
   */
  ipcMain.handle('llm-translate:pause-batch', async (_event, args: { batchId: string }) => {
    try {
      await llmTranslateService.pauseBatch(args.batchId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 恢复批次
   */
  ipcMain.handle('llm-translate:resume-batch', async (_event, args: { batchId: string }) => {
    try {
      await llmTranslateService.resumeBatch(args.batchId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 选择文件路径（文件上传）
   */
  ipcMain.handle('llm-translate:select-file', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('Window not found')

      const result = await dialog.showOpenDialog(win, {
        title: '选择待翻译文件',
        properties: ['openFile'],
        filters: [
          { name: '文本文件', extensions: ['txt', 'md', 'json', 'xml'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const filePath = result.filePaths[0]
      
      // 读取文件内容
      const fs = await import('fs/promises')
      const content = await fs.readFile(filePath, 'utf-8')
      const stats = await fs.stat(filePath)

      return {
        success: true,
        data: {
          filePath,
          fileName: filePath.split(/[/\\]/).pop() || '',
          fileSize: stats.size,
          content
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 选择输出目录（导出）
   */
  ipcMain.handle('llm-translate:select-output-dir', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) throw new Error('Window not found')

      const result = await dialog.showOpenDialog(win, {
        title: '选择输出目录',
        properties: ['openDirectory', 'createDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      return { success: true, data: { outputDir: result.filePaths[0] } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 导出批次
   */
  ipcMain.handle('llm-translate:export-batch', async (_event, args: {
    batchId: string
    options: ExportOptions
  }) => {
    try {
      const exportId = await llmTranslateService.exportBatch(args.batchId, args.options)
      return { success: true, data: { exportId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  console.log('✅ [IPC] LLM Translate handlers registered')
}

