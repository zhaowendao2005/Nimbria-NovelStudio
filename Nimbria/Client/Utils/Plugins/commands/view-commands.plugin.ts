/**
 * 视图命令插件
 * 负责注册视图相关的命令（切换右栏、显示面板等）
 */

import { commandApi } from '@/Service/CommandPanelRightSidebar/command.api'
import { rightSidebarApi } from '@/Service/CommandPanelRightSidebar/rightSidebar.api'
import type { Command } from '@/stores/projectPage/commandPalette/types'

const createViewCommands = (): Command[] => {
  return [
    {
      id: 'view.toggleRightSidebar',
      label: '切换右侧栏',
      category: 'view',
      keywords: ['sidebar', '侧边栏', '右栏', 'toggle'],
      shortcut: 'Ctrl+B',
      action: () => {
        rightSidebarApi.toggle()
      }
    },
    {
      id: 'view.showOutline',
      label: '显示大纲',
      category: 'view',
      keywords: ['outline', '大纲', 'show'],
      action: () => {
        rightSidebarApi.switchTo('outline')
      }
    },
    {
      id: 'view.hideRightSidebar',
      label: '隐藏右侧栏',
      category: 'view',
      keywords: ['hide', '隐藏', '右栏'],
      action: () => {
        rightSidebarApi.hide()
      }
    },
    {
      id: 'view.showRightSidebar',
      label: '显示右侧栏',
      category: 'view',
      keywords: ['show', '显示', '右栏'],
      action: () => {
        rightSidebarApi.show()
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

