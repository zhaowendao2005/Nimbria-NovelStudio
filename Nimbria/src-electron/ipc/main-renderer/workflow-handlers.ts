/**
 * Workflow 工作流 IPC 处理器
 */

import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import { getBrowserViewManager } from './search-scraper-handlers'
import { GetTextExecutor } from '../../services/workflow-executor/executors/get-text-executor'
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
          // TODO: 实现GetLinksExecutor
          return {
            nodeId: request.node.id,
            success: false,
            error: 'GetLinks executor not implemented yet',
            executedAt: Date.now()
          }
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
  
  console.log('[WorkflowHandlers] Workflow IPC handlers registered successfully')
}

