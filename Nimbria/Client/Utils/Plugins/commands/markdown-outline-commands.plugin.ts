/**
 * Markdown 大纲命令插件
 * 职责：提供 Markdown 文件大纲查看、导航等相关命令
 * 
 * 命令列表：
 * - markdown.showOutline: 查看当前 Markdown 文件的大纲
 * - （未来可扩展）markdown.exportOutline: 导出大纲
 * - （未来可扩展）markdown.copyOutline: 复制大纲到剪贴板
 */

import { commandApi } from '@service/CommandPanelRightSidebar/command.api'
import { rightSidebarApi } from '@service/CommandPanelRightSidebar/rightSidebar.api'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import type { Command } from '@stores/projectPage/commandPalette/types'
import { Notify } from 'quasar'
import { ensureOutlinePanelRegistered } from '@utils/Plugins/panels/outline-panel.plugin'

const createMarkdownOutlineCommands = (): Command[] => {
  // 创建动态命令对象
  const showOutlineCommand: Command = {
    id: 'markdown.showOutline',
    category: 'navigate',
    keywords: ['outline', '大纲', 'toc', '目录', 'markdown'],
    icon: 'Document',
    priority: 90,
      action: () => {
        console.log('[Command] Executing: markdown.showOutline')
        try {
          const markdownStore = useMarkdownStore()
          
          // 检查是否有打开的文件
          if (!markdownStore.activeTab) {
            Notify.create({
              type: 'warning',
              message: '请先打开一个 Markdown 文件',
              timeout: 2000
            })
            console.log('[Command] Aborted: No active markdown file')
            return
          }
          
          // 🔥 确保大纲面板已注册（按需注册）
          ensureOutlinePanelRegistered()
          
          // 切换到大纲面板（会自动显示右栏）
          rightSidebarApi.switchTo('outline')
          
          // 显示右侧栏（如果隐藏的话）
          rightSidebarApi.show()
          
          console.log('[Command] Success: markdown.showOutline')
          
          Notify.create({
            type: 'positive',
            message: `正在查看 ${markdownStore.activeTab.fileName} 的大纲`,
            timeout: 1500
          })
        } catch (error) {
          console.error('[Command] Failed: markdown.showOutline', error)
          Notify.create({
            type: 'negative',
            message: '显示大纲失败',
            timeout: 2000
          })
        }
      },
    when: () => {
      // 🎯 仅在有打开的 Markdown 文件时显示此命令
      const markdownStore = useMarkdownStore()
      return markdownStore.activeTab !== null
    },
    // 🎯 动态标签：显示当前文件名
    get label() {
      const markdownStore = useMarkdownStore()
      const fileName = markdownStore.activeTab?.fileName
      return fileName ? `查看 ${fileName} 的大纲` : '查看大纲'
    }
  }
  
  return [
    showOutlineCommand
    
    // 🔮 未来可扩展的命令示例（暂时注释）
    /*
    {
      id: 'markdown.exportOutline',
      label: '导出大纲',
      category: 'file',
      keywords: ['export', '导出', 'outline', '大纲'],
      action: () => {
        // TODO: 实现导出大纲功能
      },
      when: () => {
        const markdownStore = useMarkdownStore()
        return markdownStore.activeTab !== null
      }
    },
    {
      id: 'markdown.copyOutline',
      label: '复制大纲到剪贴板',
      category: 'edit',
      keywords: ['copy', '复制', 'outline', '大纲', 'clipboard'],
      action: () => {
        // TODO: 实现复制大纲功能
      },
      when: () => {
        const markdownStore = useMarkdownStore()
        return markdownStore.activeTab !== null
      }
    }
    */
  ]
}

/**
 * 注册 Markdown 大纲命令插件
 */
export function registerMarkdownOutlineCommands() {
  commandApi.registerBatch(createMarkdownOutlineCommands())
  console.log('[Plugin] Markdown outline commands registered')
}

