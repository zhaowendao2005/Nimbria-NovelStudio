/**
 * 大纲面板插件
 * 负责注册大纲面板到右侧栏
 */

import { rightSidebarApi } from '@service/CommandPanelRightSidebar/rightSidebar.api'
import { defineAsyncComponent } from 'vue'

/**
 * 注册大纲面板插件
 */
export function registerOutlinePanel() {
  rightSidebarApi.register({
    id: 'outline',
    label: '大纲',
    component: defineAsyncComponent(() => 
      import('@components/ProjectPage.Shell/RightSidebar/panels/OutlinePanel.vue')
    ),
    closable: true,   // 可关闭
    order: 1          // 排序权重
  })
  
  console.log('[Plugin] Outline panel registered')
}

