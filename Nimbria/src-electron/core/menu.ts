import { Menu, type BrowserWindow } from 'electron'
import { getLogger } from '../utils/shared/logger'

const logger = getLogger('Menu')

/**
 * 创建应用菜单（调试模式下启用）
 * 提供开发者工具相关功能
 */
export function createApplicationMenu(isDebugMode: boolean) {
  if (!isDebugMode) {
    logger.info('Not in debug mode, skipping menu creation')
    return
  }

  logger.info('Creating debug menu...')

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '调试',
      submenu: [
        {
          label: '切换开发者工具',
          accelerator: 'F12',
          click: (_menuItem, browserWindow) => {
            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.webContents.toggleDevTools()
              logger.info('DevTools toggled via menu')
            }
          }
        },
        {
          label: '打开开发者工具',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: (_menuItem, browserWindow) => {
            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.webContents.openDevTools()
              logger.info('DevTools opened via menu')
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: (_menuItem, browserWindow) => {
            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.reload()
              logger.info('Window reloaded via menu')
            }
          }
        },
        {
          label: '强制重新加载',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (_menuItem, browserWindow) => {
            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.webContents.reloadIgnoringCache()
              logger.info('Window force reloaded via menu')
            }
          }
        },
        {
          type: 'separator'
        },
        {
          label: '最小化',
          accelerator: 'CmdOrCtrl+M',
          click: (_menuItem, browserWindow) => {
            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.minimize()
            }
          }
        },
        {
          label: '关闭窗口',
          accelerator: 'CmdOrCtrl+W',
          click: (_menuItem, browserWindow) => {
            if (browserWindow && !browserWindow.isDestroyed()) {
              browserWindow.close()
            }
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  
  logger.info('Debug menu created successfully')
}

/**
 * 为窗口添加右键菜单（调试模式）
 */
export function setupContextMenu(window: BrowserWindow, isDebugMode: boolean) {
  if (!isDebugMode) return

  window.webContents.on('context-menu', (_event, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: '检查元素',
        click: () => {
          window.webContents.inspectElement(params.x, params.y)
        }
      },
      {
        type: 'separator'
      },
      {
        label: '重新加载',
        click: () => {
          window.reload()
        }
      }
    ])

    menu.popup()
  })

  logger.info('Context menu set up for window')
}

