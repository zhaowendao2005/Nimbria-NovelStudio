/**
 * 视图命令插件
 * 负责注册视图相关的命令（切换右栏、显示面板等）
 */

import { commandApi } from '@service/CommandPanelRightSidebar/command.api'
import { rightSidebarApi } from '@service/CommandPanelRightSidebar/rightSidebar.api'
import type { Command } from '@stores/projectPage/commandPalette/types'

const createViewCommands = (): Command[] => {
  return [
    {
      id: 'view.toggleRightSidebar',
      label: '切换右侧栏',
      category: 'view',
      keywords: ['sidebar', '侧边栏', '右栏', 'toggle'],
      shortcut: 'Ctrl+B',
      action: () => {
        console.log('[Command] Executing: view.toggleRightSidebar')
        try {
          rightSidebarApi.toggle()
          console.log('[Command] Success: view.toggleRightSidebar')
        } catch (error) {
          console.error('[Command] Failed: view.toggleRightSidebar', error)
        }
      }
    },
    {
      id: 'view.showOutline',
      label: '显示大纲',
      category: 'view',
      keywords: ['outline', '大纲', 'show'],
      action: () => {
        console.log('[Command] Executing: view.showOutline')
        try {
          rightSidebarApi.switchTo('outline')
          console.log('[Command] Success: view.showOutline')
        } catch (error) {
          console.error('[Command] Failed: view.showOutline', error)
        }
      }
    },
    {
      id: 'view.hideRightSidebar',
      label: '隐藏右侧栏',
      category: 'view',
      keywords: ['hide', '隐藏', '右栏'],
      action: () => {
        console.log('[Command] Executing: view.hideRightSidebar')
        try {
          rightSidebarApi.hide()
          console.log('[Command] Success: view.hideRightSidebar')
        } catch (error) {
          console.error('[Command] Failed: view.hideRightSidebar', error)
        }
      }
    },
    {
      id: 'view.showRightSidebar',
      label: '显示右侧栏',
      category: 'view',
      keywords: ['show', '显示', '右栏'],
      action: () => {
        console.log('[Command] Executing: view.showRightSidebar')
        try {
          rightSidebarApi.show()
          console.log('[Command] Success: view.showRightSidebar')
        } catch (error) {
          console.error('[Command] Failed: view.showRightSidebar', error)
        }
      }
    }
  ]
}

/**
 * 注册视图命令插件
 */
export function registerViewCommands() {
  commandApi.registerBatch(createViewCommands())
  console.log('[Plugin] View commands registered')
}

