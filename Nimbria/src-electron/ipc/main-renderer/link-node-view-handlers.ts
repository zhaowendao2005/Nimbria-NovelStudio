/**
 * LinkNodeView IPC Handlers
 * 
 * 职责：
 * - 处理创建节点视图窗口的请求
 * - 处理删除链接的同步
 */

import { ipcMain, BrowserWindow, app } from 'electron'
import path from 'path'
import type {
  OpenLinkNodeViewWindowRequest,
  OpenLinkNodeViewWindowResponse,
  DeleteLinksRequest
} from '../../types/LinkNodeView'

/**
 * 解析 preload 脚本路径
 */
function resolvePreloadPath(): string {
  const isDev = !!process.env.DEV || !!process.env.DEBUGGING
  
  if (isDev) {
    return path.join(app.getAppPath(), 'preload', 'project-preload.cjs')
  }

  const preloadFolder = process.env.QUASAR_ELECTRON_PRELOAD_FOLDER || 'electron-preload'
  const preloadExtension = process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION || '.cjs'
  return path.join(app.getAppPath(), preloadFolder, `project-preload${preloadExtension}`)
}

/**
 * 注册 LinkNodeView 相关的 IPC handlers
 */
export function registerLinkNodeViewHandlers(): void {
  /**
   * 创建链接节点视图窗口（独立子窗口）
   */
  ipcMain.handle(
    'link-node-view:open-window',
    async (event, request: OpenLinkNodeViewWindowRequest): Promise<OpenLinkNodeViewWindowResponse> => {
      try {
        const transferId = `link-view-${Date.now()}`

        // 创建子窗口
        const nodeViewWindow = new BrowserWindow({
          width: 1400,
          height: 900,
          minWidth: 800,
          minHeight: 600,
          title: '链接节点视图',
          titleBarStyle: 'hidden',
          backgroundColor: '#1e1e1e',
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: resolvePreloadPath()
          },
          parent: BrowserWindow.fromWebContents(event.sender) || undefined,
          modal: false
        })

        // 构建URL参数
        const params = new URLSearchParams({
          transferId,
          tabId: request.tabId,
          projectPath: request.projectPath,
          linksData: encodeURIComponent(JSON.stringify(request.links))
        })

        // 加载页面
        if (process.env.DEV) {
          await nodeViewWindow.loadURL(`${process.env.APP_URL}/#/link-node-view?${params}`)
        } else {
          await nodeViewWindow.loadFile('index.html', {
            hash: `/link-node-view?${params}`
          })
        }

        return { success: true, windowId: nodeViewWindow.id, transferId }
      } catch (error) {
        return {
          success: false,
          error: { message: (error as Error).message }
        }
      }
    }
  )

  /**
   * 删除链接（同步到主窗口）
   */
  ipcMain.on('link-node-view:delete-links', (_event, request: DeleteLinksRequest) => {
    // 找到父窗口（主窗口）
    const allWindows = BrowserWindow.getAllWindows()
    const parentWindow = allWindows.find(win => !win.isModal())

    if (parentWindow) {
      parentWindow.webContents.send('link-node-view:sync-delete', {
        tabId: request.tabId,
        linkIds: request.linkIds
      })
    }
  })
}

