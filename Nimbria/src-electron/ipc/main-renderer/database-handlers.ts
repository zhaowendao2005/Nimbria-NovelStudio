/**
 * Database IPC Handlers
 * 遵循事件驱动架构范式
 */

import { ipcMain, BrowserWindow } from 'electron'
import type { DatabaseService } from '../../services/database-service/database-service'

export function registerDatabaseHandlers(databaseService: DatabaseService) {
  console.log('📡 [IPC] 注册Database IPC处理器...')
  
  // ========== 事件监听器（只在注册时执行一次） ==========
  
  // 数据库初始化事件
  databaseService.on('database:init-start', (data) => {
    console.log('📢 [IPC] 广播事件: database:init-start')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('database:init-start', data)
    })
  })
  
  databaseService.on('database:init-complete', (data) => {
    console.log('📢 [IPC] 广播事件: database:init-complete')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('database:init-complete', data)
    })
  })
  
  databaseService.on('database:init-error', (data) => {
    console.log('📢 [IPC] 广播事件: database:init-error')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('database:init-error', data)
    })
  })
  
  // 项目数据库创建事件
  databaseService.on('database:project-create-start', (data) => {
    console.log('📢 [IPC] 广播事件: database:project-create-start')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('database:project-create-start', data)
    })
  })
  
  databaseService.on('database:project-created', (data) => {
    console.log('📢 [IPC] 广播事件: database:project-created')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('database:project-created', data)
    })
  })
  
  databaseService.on('database:project-error', (data) => {
    console.log('📢 [IPC] 广播事件: database:project-error')
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('database:project-error', data)
    })
  })
  
  // ========== IPC Handlers（纯调用，立即返回ID） ==========
  
  // 初始化数据库服务
  ipcMain.handle('database:initialize', async (_event) => {
    try {
      console.log('🔵 [IPC] 调用: database:initialize')
      const initId = await databaseService.initialize()
      return { success: true, initId }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:initialize 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  
  // 创建项目数据库
  ipcMain.handle('database:create-project', async (_event, { projectPath }) => {
    try {
      console.log('🔵 [IPC] 调用: database:create-project, 项目路径:', projectPath)
      const operationId = await databaseService.createProjectDatabase(projectPath)
      return { success: true, operationId }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:create-project 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 同步操作：获取项目数据库统计
  ipcMain.handle('database:get-stats', async (_event, { projectPath }) => {
    try {
      console.log('🔵 [IPC] 调用: database:get-stats, 项目路径:', projectPath)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const stats = await projectDb.getStats()
      return { success: true, stats }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:get-stats 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  
  // 同步操作：获取项目元数据
  ipcMain.handle('database:get-metadata', async (_event, { projectPath, key }) => {
    try {
      console.log('🔵 [IPC] 调用: database:get-metadata, key:', key)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const value = await projectDb.getMetadata(key)
      return { success: true, value }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:get-metadata 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  
  // 同步操作：设置项目元数据
  ipcMain.handle('database:set-metadata', async (_event, { projectPath, key, value, type }) => {
    try {
      console.log('🔵 [IPC] 调用: database:set-metadata, key:', key)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      await projectDb.setMetadata(key, value, type)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:set-metadata 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // ========== LLM Chat 数据库操作 ==========

  // 获取对话列表
  ipcMain.handle('database:llm-get-conversations', async (_event, { projectPath }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-get-conversations')
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const conversations = await projectDb.getConversations()
      return { success: true, conversations }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-get-conversations 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取单个对话
  ipcMain.handle('database:llm-get-conversation', async (_event, { projectPath, conversationId }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-get-conversation, conversationId:', conversationId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const conversation = await projectDb.getConversation(conversationId)
      return { success: true, conversation }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-get-conversation 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 创建对话
  ipcMain.handle('database:llm-create-conversation', async (_event, { projectPath, conversation }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-create-conversation')
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      await projectDb.createConversation(conversation)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-create-conversation 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 添加消息
  ipcMain.handle('database:llm-add-message', async (_event, { projectPath, message }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-add-message')
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      await projectDb.addMessage(message)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-add-message 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 删除对话
  ipcMain.handle('database:llm-delete-conversation', async (_event, { projectPath, conversationId }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-delete-conversation, conversationId:', conversationId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      await projectDb.deleteConversation(conversationId)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-delete-conversation 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 更新对话标题
  ipcMain.handle('database:llm-update-conversation-title', async (_event, { projectPath, conversationId, title }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-update-conversation-title')
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      await projectDb.updateConversationTitle(conversationId, title)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-update-conversation-title 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 搜索对话
  ipcMain.handle('database:llm-search-conversations', async (_event, { projectPath, query }) => {
    try {
      console.log('🔵 [IPC] 调用: database:llm-search-conversations, query:', query)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const conversations = await projectDb.searchConversations(query)
      return { success: true, conversations }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:llm-search-conversations 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // ========== SearchAndScraper 批次管理 ==========

  // 创建批次
  ipcMain.handle('database:search-scraper-create-novel-batch', async (_event, { projectPath, data }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-create-novel-batch')
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const batchId = projectDb.createNovelBatch(data)
      return { success: true, batchId }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-create-novel-batch 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取所有批次
  ipcMain.handle('database:search-scraper-get-all-novel-batches', async (_event, { projectPath }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-get-all-novel-batches')
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const batches = projectDb.getAllNovelBatches()
      return { success: true, batches }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-get-all-novel-batches 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取批次详情
  ipcMain.handle('database:search-scraper-get-novel-batch', async (_event, { projectPath, batchId }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-get-novel-batch, batchId:', batchId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const batch = projectDb.getNovelBatch(batchId)
      return { success: true, batch }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-get-novel-batch 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 更新批次统计
  ipcMain.handle('database:search-scraper-update-novel-batch-stats', async (_event, { projectPath, batchId, stats }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-update-novel-batch-stats, batchId:', batchId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      projectDb.updateNovelBatchStats(batchId, stats)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-update-novel-batch-stats 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // ========== 匹配章节管理 ==========

  // 保存匹配章节
  ipcMain.handle('database:search-scraper-save-matched-chapters', async (_event, { projectPath, batchId, chapters, sourcePageUrl }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-save-matched-chapters, batchId:', batchId, 'chapters:', chapters.length)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const savedChapters = projectDb.saveMatchedChapters(batchId, chapters, sourcePageUrl)
      return { success: true, chapters: savedChapters }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-save-matched-chapters 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取匹配章节列表
  ipcMain.handle('database:search-scraper-get-matched-chapters', async (_event, { projectPath, batchId }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-get-matched-chapters, batchId:', batchId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      const chapters = projectDb.getMatchedChapters(batchId)
      return { success: true, chapters }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-get-matched-chapters 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 切换单个章节选中状态
  ipcMain.handle('database:search-scraper-toggle-chapter-selection', async (_event, { projectPath, chapterId, selected }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-toggle-chapter-selection, chapterId:', chapterId, 'selected:', selected)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }
      
      projectDb.toggleChapterSelection(chapterId, selected)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-toggle-chapter-selection 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 全选/取消全选章节
  ipcMain.handle('database:search-scraper-toggle-all-chapters-selection', async (_event, { projectPath, batchId, selected }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-toggle-all-chapters-selection, batchId:', batchId, 'selected:', selected)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }

      projectDb.toggleAllChaptersSelection(batchId, selected)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-toggle-all-chapters-selection 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // ==================== 爬取章节管理（Iteration 3）====================

  // 保存爬取的章节
  ipcMain.handle('database:search-scraper-save-scraped-chapter', async (_event, { projectPath, data }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-save-scraped-chapter, batchId:', data.batchId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }

      projectDb.saveScrapedChapter(data)
      return { success: true }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-save-scraped-chapter 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取批次的爬取章节
  ipcMain.handle('database:search-scraper-get-scraped-chapters', async (_event, { projectPath, batchId }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-get-scraped-chapters, batchId:', batchId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }

      const chapters = projectDb.getScrapedChapters(batchId)
      return { success: true, chapters }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-get-scraped-chapters 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  // 获取批次统计摘要
  ipcMain.handle('database:search-scraper-get-batch-summary', async (_event, { projectPath, batchId }) => {
    try {
      console.log('🔵 [IPC] 调用: database:search-scraper-get-batch-summary, batchId:', batchId)
      const projectDb = databaseService.getProjectDatabase(projectPath)
      if (!projectDb) {
        return { success: false, error: 'Project database not found' }
      }

      const summary = projectDb.getNovelBatchSummary(batchId)
      return { success: true, summary }
    } catch (error: unknown) {
      console.error('❌ [IPC] database:search-scraper-get-batch-summary 失败:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
  
  console.log('✅ [IPC] Database IPC处理器注册完成')
}

