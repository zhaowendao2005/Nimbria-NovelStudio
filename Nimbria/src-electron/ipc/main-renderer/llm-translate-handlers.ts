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

  // ========== 调度器事件监听器 ==========
  
  llmTranslateService.on('scheduler:status-changed', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:scheduler-status-changed', data)
    })
  })

  llmTranslateService.on('scheduler:completed', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:scheduler-completed', data)
    })
  })

  llmTranslateService.on('scheduler:throttled', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:scheduler-throttled', data)
    })
  })

  llmTranslateService.on('scheduler:recovered', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('llm-translate:scheduler-recovered', data)
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
    config: TranslateConfig
  }) => {
    try {
      const submissionId = await llmTranslateService.submitTasks(args.batchId, args.taskIds, args.config)
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
      console.log(`🔄 [IPC] 重试任务 ${args.taskId}`)
      
      // 使用新的 retryTaskWithPrompt 方法（不修改提示词）
      // 这样可以自动处理 modelId 从 metadata 读取的逻辑
      const submissionId = await llmTranslateService.retryTaskWithPrompt(args.taskId, undefined)
      
      return { success: true, data: { submissionId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 重试任务（带提示词修改）
   */
  ipcMain.handle('llm-translate:retry-task-with-prompt', async (_event, args: { 
    taskId: string
    modifiedSystemPrompt?: string 
  }) => {
    try {
      console.log(`🔄 [IPC] 重发任务（带提示词修改） ${args.taskId}`, {
        hasModifiedPrompt: !!args.modifiedSystemPrompt
      })
      
      // 调用服务层的重试方法
      const submissionId = await llmTranslateService.retryTaskWithPrompt(
        args.taskId, 
        args.modifiedSystemPrompt
      )
      
      return { success: true, data: { submissionId } }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 取消正在执行的任务
   */
  ipcMain.handle('llm-translate:cancel-task', async (_event, args: { taskId: string }) => {
    try {
      console.log(`✂️ [IPC] 取消任务 ${args.taskId}`)
      await llmTranslateService.cancelTask(args.taskId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 取消等待中的任务
   */
  ipcMain.handle('llm-translate:cancel-waiting-task', async (_event, args: { taskId: string }) => {
    try {
      console.log(`✂️ [IPC] 取消等待任务 ${args.taskId}`)
      await llmTranslateService.cancelWaitingTask(args.taskId)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 测试限流状态
   */
  ipcMain.handle('llm-translate:test-throttle', async (_event, args: { 
    modelId: string
    config: { intervalSeconds: number; type: 'quick' | 'api' }
  }) => {
    try {
      console.log(`🔧 [IPC] 测试限流: modelId=${args.modelId}, type=${args.config.type}`)
      const result = await llmTranslateService.testThrottle(args.modelId, args.config)
      return { 
        success: true, 
        status: result.success ? 'ok' : 'throttled',
        responseTime: result.responseTime,
        error: result.error
      }
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

  /**
   * 更新批次配置
   */
  ipcMain.handle('llm-translate:update-batch-config', async (_event, args: {
    batchId: string
    updates: Partial<TranslateConfig>
  }) => {
    try {
      console.log(`📥 [IPC] 收到更新批次配置请求:`, {
        batchId: args.batchId,
        updates: Object.keys(args.updates)
      })
      
      await llmTranslateService.updateBatchConfig(args.batchId, args.updates)
      
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 更新批次配置失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // ========== 🆕 Token换算配置管理 ==========

  // ========== 系统提示词模板管理 ==========

  ipcMain.handle('llm-translate:get-prompt-templates', async () => {
    try {
      console.log(`📥 [IPC] 获取所有系统提示词模板`)
      const result = llmTranslateService.getAllPromptTemplates()
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 获取系统提示词模板失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:get-prompt-template', async (_event, args: { id: string }) => {
    try {
      console.log(`📥 [IPC] 获取系统提示词模板:`, args.id)
      const result = llmTranslateService.getPromptTemplate(args.id)
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 获取系统提示词模板失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:create-prompt-template', async (_event, args: {
    template: { name: string; content: string; category?: string; description?: string }
  }) => {
    try {
      console.log(`📥 [IPC] 创建系统提示词模板:`, args.template.name)
      const result = llmTranslateService.createPromptTemplate(args.template)
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 创建系统提示词模板失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:update-prompt-template', async (_event, args: {
    id: string
    updates: { name?: string; content?: string; category?: string; description?: string }
  }) => {
    try {
      console.log(`📥 [IPC] 更新系统提示词模板:`, args.id)
      llmTranslateService.updatePromptTemplate(args.id, args.updates)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 更新系统提示词模板失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:delete-prompt-template', async (_event, args: { id: string }) => {
    try {
      console.log(`📥 [IPC] 删除系统提示词模板:`, args.id)
      llmTranslateService.deletePromptTemplate(args.id)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 删除系统提示词模板失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:get-prompt-template-categories', async () => {
    try {
      console.log(`📥 [IPC] 获取系统提示词模板分类`)
      const result = llmTranslateService.getPromptTemplateCategories()
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 获取系统提示词模板分类失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // ========== Token换算配置管理 ==========

  ipcMain.handle('llm-translate:create-token-config', async (_event, args: {
    config: { name: string; chineseRatio: number; asciiRatio: number; description?: string }
  }) => {
    try {
      console.log(`📥 [IPC] 创建Token换算配置:`, args.config.name)
      const result = await llmTranslateService.createTokenConfig(args.config)
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 创建Token配置失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:get-token-configs', async () => {
    try {
      console.log(`📥 [IPC] 获取所有Token换算配置`)
      const result = await llmTranslateService.getAllTokenConfigs()
      return { success: true, data: result }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 获取Token配置失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  ipcMain.handle('llm-translate:delete-token-config', async (_event, args: { id: string }) => {
    try {
      console.log(`📥 [IPC] 删除Token换算配置:`, args.id)
      await llmTranslateService.deleteTokenConfig(args.id)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 删除Token配置失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  // ========== 文件保存 ==========

  /**
   * 选择文本文件保存路径
   */
  ipcMain.handle('llm-translate:select-text-save-path', async (_event, args: { 
    defaultPath?: string 
  }) => {
    try {
      const result = await dialog.showSaveDialog({
        title: '保存导出文件',
        defaultPath: args.defaultPath || 'export.txt',
        filters: [
          { name: '文本文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      return { 
        success: true, 
        data: { 
          canceled: result.canceled, 
          filePath: result.filePath 
        } 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 选择保存路径失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 保存文本文件
   */
  ipcMain.handle('llm-translate:save-text-file', async (_event, args: { 
    filePath: string
    content: string 
  }) => {
    try {
      const fs = await import('fs/promises')
      await fs.writeFile(args.filePath, args.content, 'utf-8')
      console.log(`✅ [IPC] 文件已保存: ${args.filePath}`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 保存文件失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  /**
   * 保存 Excel 文件
   */
  ipcMain.handle('llm-translate:save-excel-file', async (_event, args: {
    defaultPath: string
    rows: string[][]  // 二维数组，每行是一个字符串数组
  }) => {
    try {
      // 1. 选择保存路径
      const saveResult = await dialog.showSaveDialog({
        title: '保存 Excel 文件',
        defaultPath: args.defaultPath,
        filters: [
          { name: 'Excel 文件', extensions: ['xlsx'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (saveResult.canceled || !saveResult.filePath) {
        return { 
          success: true, 
          data: { canceled: true } 
        }
      }

      // 2. 生成 Excel 文件
      const XLSX = await import('xlsx')
      
      // Excel 单元格字符限制
      const EXCEL_CELL_LIMIT = 32767
      
      // 处理超长的单元格内容
      const data = args.rows.map((row: string[], rowIndex: number) => {
        return row.map((cell, colIndex) => {
          if (cell && cell.length > EXCEL_CELL_LIMIT) {
            console.warn(`⚠️ [Excel] 第 ${rowIndex + 1} 行第 ${colIndex + 1} 列内容过长 (${cell.length} 字符)，已截断至 ${EXCEL_CELL_LIMIT} 字符`)
            return cell.substring(0, EXCEL_CELL_LIMIT - 20) + '\n\n[内容过长已截断...]'
          }
          return cell || ''
        })
      })

      // 创建工作表
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      
      // 创建工作簿
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Translation')

      // 写入文件
      XLSX.writeFile(workbook, saveResult.filePath)
      
      console.log(`✅ [IPC] Excel 文件已保存: ${saveResult.filePath}`)
      
      return { 
        success: true, 
        data: { 
          canceled: false,
          filePath: saveResult.filePath 
        } 
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ [IPC] 保存 Excel 失败:`, errorMessage)
      return { success: false, error: errorMessage }
    }
  })

  console.log('✅ [IPC] LLM Translate handlers registered')
}

