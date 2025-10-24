/**
 * RightPanel 类型定义
 */

import type { Component } from 'vue'

/**
 * Tab项配置
 */
export interface TabItem {
  /** 唯一标识 */
  id: string
  
  /** 显示标签 */
  label: string
  
  /** 图标组件（Element Plus图标） */
  icon?: Component
  
  /** Badge数字（可选） */
  badge?: number | string
  
  /** 是否是组的第一个（显示分割线） */
  groupStart?: boolean
  
  /** 是否禁用 */
  disabled?: boolean
}

/**
 * Tab内容组件配置
 */
export interface TabContentConfig {
  /** Tab ID */
  id: string
  
  /** 内容组件 */
  component: Component
  
  /** 传递给组件的props */
  props?: Record<string, any>
}
