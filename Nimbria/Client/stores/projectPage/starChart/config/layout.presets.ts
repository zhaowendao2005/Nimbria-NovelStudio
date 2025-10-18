/**
 * 布局配置预设
 */
import type { ConcentricLayoutConfig, ForceDirectedLayoutConfig, HierarchicalLODLayoutConfig } from '../layouts/types'

/**
 * 同心圆布局 - 默认配置
 */
export const DEFAULT_CONCENTRIC_LAYOUT: ConcentricLayoutConfig = {
  name: 'concentric',
  animate: false,
  randomize: false,
  outerRadius: 3000,
  innerRadius: 2000,
  clusterRadius: 150,
  minGroupDistance: 450,
  innerGroupCount: 8,
  outerGroupCount: 12,
  enableNodeSpacingCorrection: true,
  minNodeDistanceMultiplier: 2.5,
  spacingCorrectionStrength: 0.7,
  scatterRatio: 0.1
}

/**
 * 同心圆布局 - 紧凑模式
 */
export const COMPACT_CONCENTRIC_LAYOUT: ConcentricLayoutConfig = {
  name: 'concentric',
  animate: false,
  randomize: false,
  outerRadius: 2000,
  innerRadius: 1000,
  clusterRadius: 100,
  minGroupDistance: 300,
  innerGroupCount: 8,
  outerGroupCount: 12,
  enableNodeSpacingCorrection: true,
  minNodeDistanceMultiplier: 2.0,
  spacingCorrectionStrength: 0.8,
  scatterRatio: 0.05
}

/**
 * 力导向布局 - 默认配置
 */
export const DEFAULT_FORCE_LAYOUT: ForceDirectedLayoutConfig = {
  name: 'force-directed',
  animate: true,
  randomize: false,
  quality: 'default',
  nodeSeparation: 75,
  idealEdgeLength: 50,
  nodeRepulsion: 4500,
  gravity: 0.25,
  gravityRange: 3.8
}

/**
 * 力导向布局 - 紧密模式
 */
export const COMPACT_FORCE_LAYOUT: ForceDirectedLayoutConfig = {
  name: 'force-directed',
  animate: true,
  randomize: false,
  quality: 'default',
  nodeSeparation: 50,
  idealEdgeLength: 30,
  nodeRepulsion: 3000,
  gravity: 0.4,
  gravityRange: 3.0
}

/**
 * 力导向布局 - 宽松模式
 */
export const LOOSE_FORCE_LAYOUT: ForceDirectedLayoutConfig = {
  name: 'force-directed',
  animate: true,
  randomize: false,
  quality: 'default',
  nodeSeparation: 100,
  idealEdgeLength: 80,
  nodeRepulsion: 6000,
  gravity: 0.15,
  gravityRange: 4.5
}

/**
 * 分层LOD布局 - 默认配置
 */
export const DEFAULT_HIERARCHICAL_LOD_LAYOUT: HierarchicalLODLayoutConfig = {
  name: 'hierarchical-lod',
  animate: false,
  randomize: false,
  
  // 分区配置
  zones: {
    enabled: true,
    shape: 'hexagon',
    boundaryPadding: 50,
    autoDetect: true
  },
  
  // LOD层级配置
  lodLevels: {
    zoneOnly: { minZoom: 0, maxZoom: 0.5 },
    zoneBoundary: { minZoom: 0.5, maxZoom: 1.5 },
    zoneExpanded: { minZoom: 1.5, maxZoom: 5 },
    fullDetail: { minZoom: 5, maxZoom: 10 }
  },
  
  // 节点约束
  constraints: {
    enableBoundaryNodes: true,
    enableInternalNodes: true,
    allowDragOutside: false
  },
  
  // 递归展开
  expansion: {
    enabled: true,
    maxDepth: 3,
    animationDuration: 800,
    layoutStrategy: 'radial'
  }
}

