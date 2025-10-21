/**
 * StarChart 渲染域对外接口类型
 */

import type { NodeData, EdgeData, ViewportState } from '../Core'

// ==================== 渲染配置 ====================

export interface RenderConfig {
  nodeRenderMode: 'webgl' | 'canvas' | 'hybrid'
  edgeRenderMode: 'webgl' | 'canvas' | 'hybrid'
  labelRenderMode: 'canvas' | 'texture'
  antialias: boolean
  pixelRatio: number
}

// ==================== 节点样式 ====================

export interface NodeStyle {
  fill: string
  stroke: string
  strokeWidth: number
  size: number
  opacity: number
  shape: 'circle' | 'square' | 'triangle' | 'star' | 'diamond' | string
  icon?: IconStyle
  label?: LabelStyle
}

export interface IconStyle {
  type: 'emoji' | 'image' | 'font'
  content: string
  size: number
  color?: string
}

export interface LabelStyle {
  text: string
  color: string
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  textAlign: 'left' | 'center' | 'right'
  visible: boolean
  background?: BackgroundStyle
}

export interface BackgroundStyle {
  enabled: boolean
  color: string
  padding: number
  borderRadius: number
}

// ==================== 边样式 ====================

export interface EdgeStyle {
  stroke: string
  strokeWidth: number
  opacity: number
  curved: boolean
  dashed: boolean
  dashPattern?: number[]
  arrowSize: number
  arrowType: 'none' | 'single' | 'double'
  label?: LabelStyle
}

// ==================== 渲染统计 ====================

export interface RenderStats {
  fps: number
  nodeCount: number
  edgeCount: number
  visibleNodeCount: number
  visibleEdgeCount: number
  renderTime: number
  memoryUsage: MemoryUsage
}

export interface MemoryUsage {
  textureMemory: number
  bufferMemory: number
  totalMemory: number
}
