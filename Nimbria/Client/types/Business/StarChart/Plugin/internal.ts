/**
 * StarChart 插件系统内部类型
 * 这些类型仅供插件系统内部使用
 */

import type { StarChartPlugin } from './public'

// ==================== 插件注册内部状态 ====================

export interface PluginRegistryState {
  plugins: Map<string, StarChartPlugin>
  installedPlugins: Map<string, PluginInstance>
  pluginOrder: string[]
}

export interface PluginInstance {
  plugin: StarChartPlugin
  context: any
  installedAt: number
  metadata?: Record<string, any>
}

// ==================== 依赖图 ====================

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: Map<string, string[]>
}

export interface DependencyNode {
  pluginId: string
  version: string
  dependencies: string[]
}

// ==================== 插件加载状态 ====================

export interface PluginLoadState {
  pluginId: string
  status: 'pending' | 'loading' | 'loaded' | 'error'
  error?: Error
  module?: { default: StarChartPlugin }
}

// ==================== 插件生命周期 ====================

export interface PluginLifecycleHooks {
  beforeInstall?: () => Promise<void> | void
  afterInstall?: () => Promise<void> | void
  beforeUninstall?: () => Promise<void> | void
  afterUninstall?: () => Promise<void> | void
}

// ==================== 插件元数据 ====================

export interface PluginMetadata {
  id: string
  name: string
  version: string
  author?: string
  description?: string
  repository?: string
  license?: string
  tags?: string[]
  keywords?: string[]
}
