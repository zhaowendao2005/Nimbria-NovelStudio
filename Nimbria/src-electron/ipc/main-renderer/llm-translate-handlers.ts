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
  // 前端类型
  TranslateConfig,
  ExportConfig,
  // 后端事件类型
  BatchCreateStartEvent,
  BatchCreatedEvent,
  BatchCreateErrorEvent,
  BatchDeleteStartEvent,
  BatchDeletedEvent,
  BatchDeleteErrorEvent,
  TaskSubmitStartEvent,
  TaskSubmittedEvent,
  TaskDeleteStartEvent,
  TaskDeletedEvent,
  TaskDeleteErrorEvent,
  TaskProgressEvent,
  TaskCompleteEvent,
  TaskErrorEvent,
  BatchPauseEvent,
  BatchResumeEvent,
  ExportStartEvent,
  ExportCompleteEvent,
  ExportErrorEvent
} from '../../types/LlmTranslate'

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

  llmTranslateService.on('batch:delete-start', (data: BatchDeleteStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-delete-start', data)
    })
  })

  llmTranslateService.on('batch:deleted', (data: BatchDeletedEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-deleted', data)
    })
  })

  llmTranslateService.on('batch:delete-error', (data: BatchDeleteErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:batch-delete-error', data)
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

  llmTranslateService.on('task:delete-start', (data: TaskDeleteStartEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-delete-start', data)
    })
  })

  llmTranslateService.on('task:deleted', (data: TaskDeletedEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-deleted', data)
    })
  })

  llmTranslateService.on('task:delete-error', (data: TaskDeleteErrorEvent) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-delete-error', data)
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

  // TaskStateManager 事件监听
  llmTranslateService.on('task:state-changed', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-state-changed', data)
    })
  })

  llmTranslateService.on('task:progress-updated', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-progress-updated', data)
    })
  })

  llmTranslateService.on('task:completed', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-completed', data)
    })
  })

  llmTranslateService.on('task:error-occurred', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:task-error-occurred', data)
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
      const { content } = args.config
      
      // createBatch 返回 batchId 后会异步创建批次并通过事件通知
      const batchId = await llmTranslateService.createBatch(args.config, content)
      
      // 轮询等待批次创建完成（最多等待 5 秒）
      let batch = null
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100)) // 等待 100ms
        batch = await llmTranslateService.getBatch(batchId)
        if (batch) break
      }
      
      if (!batch) {
        throw new Error('批次创建超时')
      }
      
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
   * 暂停任务
   */
  ipcMain.handle('llm-translate:pause-task', async (_event, args: { taskId: string }) => {
    try {
      await llmTranslateService.pauseTask(args.taskId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 重试单个任务
   */
  ipcMain.handle('llm-translate:retry-task', async (_event, args: { taskId: string }) => {
    try {
      // TODO: 实现单个任务重试逻辑
      console.log(`🔄 [IPC] 重试任务 ${args.taskId}`)
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
      if (!filePath) {
        return { success: false, error: '未选择文件' }
      }
      
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
  ipcMain.handle('llm-translate:export-batch', (_event, args: {
    batchId: string
    options: ExportConfig
  }) => {
    try {
      const exportId = llmTranslateService.exportBatch(args.batchId, args.options)
      return { success: true, data: { exportId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 删除批次
   */
  ipcMain.handle('llm-translate:delete-batch', (_event, args: { batchId: string }) => {
    try {
      const operationId = llmTranslateService.deleteBatch(args.batchId)
      return { success: true, data: { operationId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 删除任务
   */
  ipcMain.handle('llm-translate:delete-tasks', async (_event, args: { taskIds: string[] }) => {
    try {
      const operationId = await llmTranslateService.deleteTasks(args.taskIds)
      return { success: true, data: { operationId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  console.log('✅ [IPC] LLM Translate handlers registered')
}

