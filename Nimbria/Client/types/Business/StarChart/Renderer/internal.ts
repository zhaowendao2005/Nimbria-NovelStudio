/**
 * StarChart 渲染域内部类型
 */

import type { NodeStyle, EdgeStyle } from './public'

// ==================== 渲染状态 ====================

export interface RenderLayerState {
  layerId: string
  visible: boolean
  opacity: number
  blendMode: string
  zIndex: number
}

// ==================== WebGL 缓冲 ====================

export interface GLBuffer {
  id: WebGLBuffer | null
  data: Float32Array | Uint32Array
  size: number
  usage: GLenum
}

export interface GLShader {
  program: WebGLProgram | null
  vertexShader: WebGLShader | null
  fragmentShader: WebGLShader | null
}

// ==================== 样式缓存 ====================

export interface StyleCache {
  nodeStyles: Map<string, NodeStyle>
  edgeStyles: Map<string, EdgeStyle>
  lastUpdateTime: number
}
