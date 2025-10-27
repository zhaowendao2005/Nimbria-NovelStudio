/**
 * Workflow 工作流 IPC 处理器
 */

import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import { getBrowserViewManager } from './search-scraper-handlers'
import { GetTextExecutor } from '../../services/workflow-executor/executors/get-text-executor'
import { GetLinksExecutor } from '../../services/workflow-executor/executors/get-links-executor'
import type { 
  WorkflowNode, 
  WorkflowExecutionContext, 
  NodeExecutionResult 
} from '../../services/workflow-executor/types'

/**
 * 设置 Workflow IPC 处理器
 */
export function setupWorkflowHandlers(): void {
  
  console.log('[WorkflowHandlers] Registering workflow IPC handlers...')
  
  // ==================== 节点执行 ====================
  
  /**
   * 执行单个节点
   */
  ipcMain.handle('workflow:execute-node', async (
    _event: IpcMainInvokeEvent,
    request: {
      node: WorkflowNode
      context: WorkflowExecutionContext
      input?: any
    }
  ): Promise<NodeExecutionResult> => {
    const browserViewManager = getBrowserViewManager()
    
    if (!browserViewManager) {
      return {
        nodeId: request.node.id,
        success: false,
        error: 'BrowserViewManager not initialized. Please open SearchAndScraper first.',
        executedAt: Date.now()
      }
    }

    console.log(`[WorkflowHandlers] Executing node: ${request.node.id} (type: ${request.node.type})`)
    
    try {
      // 🔥 根据节点类型选择执行器
      switch (request.node.type) {
        case 'get-text': {
          const executor = new GetTextExecutor(browserViewManager)
          return await executor.execute(request.node, request.context, request.input)
        }
        
        case 'get-links': {
          const executor = new GetLinksExecutor(browserViewManager)
          return await executor.execute(request.node, request.context, request.input)
        }
        
        case 'operation': {
          // TODO: 实现OperationExecutor
          return {
            nodeId: request.node.id,
            success: false,
            error: 'Operation executor not implemented yet',
            executedAt: Date.now()
          }
        }
        
        default: {
          return {
            nodeId: request.node.id,
            success: false,
            error: `Unknown node type: ${request.node.type}`,
            executedAt: Date.now()
          }
        }
      }
    } catch (error) {
      console.error('[WorkflowHandlers] Node execution failed:', error)
      return {
        nodeId: request.node.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: Date.now()
      }
    }
  })
  
  // ==================== 浏览器配置 ====================
  
  /**
   * 🔥 自动检测可用的Chromium浏览器（Edge/Chrome）
   */
  ipcMain.handle('workflow:detect-browsers', async (): Promise<{
    success: boolean
    browsers?: Array<{
      name: string
      type: 'edge' | 'chrome'
      path: string
    }>
    error?: string
  }> => {
    try {
      const browsers = GetTextExecutor.detectAllBrowsers()
      console.log(`[WorkflowHandlers] Detected ${browsers.length} browser(s):`, browsers)
      
      return {
        success: true,
        browsers
      }
    } catch (error) {
      console.error('[WorkflowHandlers] Browser detection failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
  
  /**
   * 🔥 设置用户配置的浏览器路径
   */
  ipcMain.handle('workflow:set-browser-path', async (
    _event: IpcMainInvokeEvent,
    { path }: { path: string | null }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      GetTextExecutor.setUserBrowserPath(path)
      console.log(`[WorkflowHandlers] User browser path set to: ${path || '(auto-detect)'}`)
      
      return { success: true }
    } catch (error) {
      console.error('[WorkflowHandlers] Failed to set browser path:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
  
  /**
   * 🔥 获取用户配置的浏览器路径
   */
  ipcMain.handle('workflow:get-browser-path', async (): Promise<{
    success: boolean
    path?: string | null
    error?: string
  }> => {
    try {
      const path = (global as any).userBrowserPath || null
      console.log(`[WorkflowHandlers] Current user browser path: ${path || '(auto-detect)'}`)
      
      return {
        success: true,
        path
      }
    } catch (error) {
      console.error('[WorkflowHandlers] Failed to get browser path:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })
  
  console.log('[WorkflowHandlers] Workflow IPC handlers registered successfully')
}

