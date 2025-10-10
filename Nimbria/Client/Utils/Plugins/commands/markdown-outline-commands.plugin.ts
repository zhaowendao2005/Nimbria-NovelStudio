/**
 * Markdown 大纲命令插件
 * 职责：提供 Markdown 文件大纲查看、导航等相关命令
 * 
 * 命令列表：
 * - markdown.showOutline.{tabId}: 查看指定标签页的大纲（每个打开的标签页一个）
 * - （未来可扩展）markdown.exportOutline: 导出大纲
 * - （未来可扩展）markdown.copyOutline: 复制大纲到剪贴板
 */

import { watch } from 'vue'
import { commandApi } from '@service/CommandPanelRightSidebar/command.api'
import { rightSidebarApi } from '@service/CommandPanelRightSidebar/rightSidebar.api'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import type { Command } from '@stores/projectPage/commandPalette/types'
import type { MarkdownTab } from '@stores/projectPage/Markdown/types'
import { Notify } from 'quasar'
import { ensureOutlinePanelRegistered } from '@utils/Plugins/panels/outline-panel.plugin'

/**
 * 已注册的命令ID集合（用于清理旧命令）
 */
const registeredCommandIds = new Set<string>()

/**
 * 为单个标签页创建大纲命令
 */
const createOutlineCommandForTab = (tab: MarkdownTab): Command => {
  return {
    id: `markdown.showOutline.${tab.id}`,
    label: `查看 ${tab.fileName} 的大纲`,
    category: 'navigate',
    keywords: ['outline', '大纲', 'toc', '目录', 'markdown', tab.fileName],
    icon: 'Document',
    priority: 90,
    action: () => {
      console.log(`[Command] Executing: markdown.showOutline for ${tab.fileName} (${tab.id})`)
      try {
        const markdownStore = useMarkdownStore()
        
        // 🔥 先切换到这个标签页（如果不是当前激活的）
        if (markdownStore.activeTabId !== tab.id) {
          markdownStore.switchTab(tab.id)
          console.log(`[Command] Switched to tab: ${tab.fileName}`)
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
          message: `正在查看 ${tab.fileName} 的大纲`,
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
      // 🎯 检查这个标签页是否还存在
      const markdownStore = useMarkdownStore()
      return markdownStore.openTabs.some(t => t.id === tab.id)
    }
  }
}

/**
 * 创建所有大纲命令（为每个打开的标签页创建一个）
 */
const createMarkdownOutlineCommands = (): Command[] => {
  const markdownStore = useMarkdownStore()
  const commands: Command[] = []
  
  // 🔥 为每个打开的标签页生成一个命令
  markdownStore.openTabs.forEach(tab => {
    commands.push(createOutlineCommandForTab(tab))
  })
  
  console.log(`[Plugin] Created ${commands.length} outline command(s) for ${markdownStore.openTabs.length} tab(s)`)
  
  return commands
}

/**
 * 更新大纲命令列表
 * 注销旧命令，注册新命令
 */
const updateOutlineCommands = () => {
  // 1. 注销所有旧的大纲命令
  registeredCommandIds.forEach(commandId => {
    commandApi.unregister(commandId)
  })
  registeredCommandIds.clear()
  
  // 2. 生成新的命令
  const newCommands = createMarkdownOutlineCommands()
  
  // 3. 注册新命令
  commandApi.registerBatch(newCommands)
  
  // 4. 记录新的命令ID
  newCommands.forEach(cmd => {
    registeredCommandIds.add(cmd.id)
  })
  
  console.log(`[Plugin] Updated outline commands: ${registeredCommandIds.size} command(s) registered`)
}

/**
 * 注册 Markdown 大纲命令插件
 * 🔥 会动态监听标签页变化，自动更新命令列表
 */
export function registerMarkdownOutlineCommands() {
  const markdownStore = useMarkdownStore()
  
  // 初始注册
  updateOutlineCommands()
  console.log('[Plugin] Markdown outline commands registered (initial)')
  
  // 🔥 监听 openTabs 变化，动态更新命令
  watch(
    () => markdownStore.openTabs.length,
    () => {
      console.log('[Plugin] openTabs changed, updating outline commands')
      updateOutlineCommands()
    }
  )
  
  console.log('[Plugin] Watching openTabs for dynamic command updates')
}

