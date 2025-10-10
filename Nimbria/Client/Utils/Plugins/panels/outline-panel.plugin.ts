/**
 * 大纲面板插件
 * 负责提供大纲面板的注册方法（按需注册，支持多个文件的大纲面板）
 */

import { rightSidebarApi } from '@service/CommandPanelRightSidebar/rightSidebar.api'
import { defineAsyncComponent } from 'vue'

/**
 * 为指定的标签页创建/获取大纲面板
 * @param tabId 标签页 ID
 * @param fileName 文件名（用于显示）
 * @returns 面板 ID
 */
export function ensureOutlinePanelForTab(tabId: string, fileName: string): string {
  // 🔥 每个标签页一个唯一的面板 ID
  const panelId = `outline-${tabId}`
  
  // 检查是否已注册
  const existingPanel = rightSidebarApi.findPanel(panelId)
  
  if (existingPanel) {
    console.log(`[Plugin] Outline panel for "${fileName}" already exists (${panelId})`)
    return panelId
  }
  
  // 注册新的大纲面板
  rightSidebarApi.register({
    id: panelId,
    label: `${fileName} - 大纲`,  // 🔥 显示文件名
    component: defineAsyncComponent(() => 
      import('@components/ProjectPage.Shell/RightSidebar/panels/OutlinePanel.vue')
    ),
    closable: true,   // 可关闭（删除标签页）
    order: 1,         // 排序权重
    props: { tabId }  // 🔥 传递 tabId 给组件
  })
  
  console.log(`[Plugin] Created outline panel for "${fileName}" (${panelId})`)
  return panelId
}

/**
 * 【已废弃】旧的单一大纲面板注册方法
 * 保留用于兼容性，建议使用 ensureOutlinePanelForTab
 * @deprecated
 */
export function ensureOutlinePanelRegistered() {
  console.warn('[Plugin] ensureOutlinePanelRegistered is deprecated, use ensureOutlinePanelForTab instead')
  // 不再使用
}

/**
 * 插件初始化（启动时调用，但不注册面板）
 */
export function registerOutlinePanel() {
  // 不在启动时注册面板，改为按需注册
  console.log('[Plugin] Outline panel plugin initialized (lazy registration)')
}

