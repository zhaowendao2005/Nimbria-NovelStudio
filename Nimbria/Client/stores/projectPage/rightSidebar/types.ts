/**
 * 右侧栏类型定义
 */

import type { Component } from 'vue'

/** 右侧栏面板定义 */
export interface RightSidebarPanel {
  id: string                    // 唯一标识
  label: string                 // 标签文本
  component: Component          // Vue组件
  icon?: string                 // 图标（Element Plus icon name）
  closable?: boolean            // 是否可关闭（默认true）
  order?: number                // 排序权重（数值越小越靠前）
  when?: () => boolean          // 显示条件
  props?: Record<string, unknown>   // 🔥 传递给组件的 props
}

/** Store状态 */
export interface RightSidebarState {
  panels: RightSidebarPanel[]   // 注册的面板列表
  activeId: string | null       // 当前激活的面板ID
  visible: boolean              // 是否可见
  width: string                 // 宽度（如 '280px'）
}

