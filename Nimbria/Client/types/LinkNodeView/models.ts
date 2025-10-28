/**
 * LinkNodeView 数据模型
 * 
 * 定义链接项、相似度分析结果、布局配置等核心数据结构
 */

/**
 * 链接项
 */
export interface LinkItem {
  id: string
  title: string
  url: string
}

/**
 * 相似度分析结果
 */
export interface SimilarityResult {
  mainNode: LinkItem | null
  clusters: Map<string, LinkItem[]>
  mainClusterPattern: string
}

/**
 * 布局节点
 */
export interface LayoutNode {
  id: string
  isMain: boolean
}

/**
 * 布局配置
 */
export interface LayoutConfig {
  mainNodeId: string | null
  nodes: LayoutNode[]
  canvasWidth: number
  canvasHeight: number
}

/**
 * 节点位置
 */
export interface NodePosition {
  x: number
  y: number
}

