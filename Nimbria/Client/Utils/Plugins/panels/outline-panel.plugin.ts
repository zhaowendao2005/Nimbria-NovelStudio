/**
 * 大纲面板插件
 * 负责提供大纲面板的注册方法（按需注册，不在启动时注册）
 */

import { rightSidebarApi } from '@service/CommandPanelRightSidebar/rightSidebar.api'
import { defineAsyncComponent } from 'vue'

/**
 * 注册大纲面板到右侧栏（由命令调用）
 */
export function ensureOutlinePanelRegistered() {
  // 检查是否已注册
  const existingPanel = rightSidebarApi.findPanel('outline')
  
  if (existingPanel) {
    console.log('[Plugin] Outline panel already registered')
    return
  }
  
  // 注册大纲面板
  rightSidebarApi.register({
    id: 'outline',
    label: '大纲',
    component: defineAsyncComponent(() => 
      import('@components/ProjectPage.Shell/RightSidebar/panels/OutlinePanel.vue')
    ),
    closable: true,   // 可关闭（删除标签页）
    order: 1          // 排序权重
  })
  
  console.log('[Plugin] Outline panel registered')
}

/**
 * 插件初始化（启动时调用，但不注册面板）
 */
export function registerOutlinePanel() {
  // 不在启动时注册面板，改为按需注册
  console.log('[Plugin] Outline panel plugin initialized (lazy registration)')
}

