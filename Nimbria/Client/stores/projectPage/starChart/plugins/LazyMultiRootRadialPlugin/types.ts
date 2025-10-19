/**
 * 懒加载插件专用类型
 */

import type { G6Node, G6Edge } from '../types'

/**
 * 懒加载节点数据
 */
export interface LazyNodeData extends G6Node {
  data: G6Node['data'] & {
    collapsed?: boolean       // 是否折叠
    hasChildren?: boolean     // 是否有子节点
    childrenIds?: string[]    // 子节点ID列表（未加载时）
    _lazyLoaded?: boolean     // 是否已加载子节点
  }
}

/**
 * 懒加载图数据
 */
export interface LazyGraphData {
  nodes: LazyNodeData[]
  edges: G6Edge[]
  rootIds: string[]
  fullNodesMap: Map<string, LazyNodeData>    // 完整节点映射
  childrenMap: Map<string, string[]>         // 父子关系映射
}

/**
 * 插件配置
 */
export interface LazyPluginConfig {
  initialLoadRootsOnly: boolean    // 是否只加载根节点（默认 true）
  autoCollapse: boolean             // 是否自动折叠（默认 true）
  maxInitialDepth: number           // 初始加载的最大深度（默认 0=仅根节点）
}

