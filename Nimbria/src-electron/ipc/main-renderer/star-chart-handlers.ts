// src-electron/ipc/main-renderer/star-chart-handlers.ts
import { ipcMain, BrowserWindow } from 'electron'
import type { StarChartService } from '../../services/star-chart-service/star-chart-service'

export function registerStarChartHandlers(starChartService: StarChartService) {
  // ========== 事件监听器（只注册一次） ==========
  
  starChartService.on('starchart:init-start', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:init-start', data)
    })
  })

  starChartService.on('starchart:init-complete', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:init-complete', data)
    })
  })

  starChartService.on('starchart:init-error', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:init-error', data)
    })
  })
  
  starChartService.on('starchart:project-create-start', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:project-create-start', data)
    })
  })
  
  starChartService.on('starchart:project-created', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:project-created', data)
    })
  })
  
  starChartService.on('starchart:project-error', (data) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('starchart:project-error', data)
    })
  })
  
  // ========== IPC Handlers ==========
  
  ipcMain.handle('starchart:initialize', async () => {
    try {
      // ✅ 全局初始化 StarChart 服务（只需调用一次）
      const initId = await starChartService.initialize()
      return { success: true, initId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ✅ 为当前项目创建 StarChart 数据库
  ipcMain.handle('starchart:create-project', async (_event, { projectPath }) => {
    try {
      const operationId = await starChartService.createProjectStarChart(projectPath)
      return { success: true, operationId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // ✅ 测试：读取项目 StarChart 的元数据
  ipcMain.handle('starchart:get-metadata', async (_event, { projectPath }) => {
    try {
      const gun = starChartService.getProjectStarChart(projectPath)
      if (!gun) {
        return { success: false, error: 'StarChart not found for this project' }
      }
      
      return new Promise((resolve) => {
        gun.get('metadata').once((data: any) => {
          resolve({ success: true, metadata: data })
        })
      })
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  console.log('StarChart IPC handlers registered')
}

