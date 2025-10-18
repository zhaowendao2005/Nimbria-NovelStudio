/**
 * StarChart 布局引擎类型定义
 */
import type { RawGraphData, LayoutedNode } from '../data/types'

/**
 * 布局类型
 */
export type LayoutType = 'concentric' | 'force-directed' | 'hierarchical-lod'

/**
 * 布局数据要求
 * 定义布局引擎对输入数据的要求
 */
export interface LayoutDataRequirement {
  // 节点要求
  nodeRequirements: {
    requiredFields: string[]  // 必需字段：['id', 'name']
    optionalFields?: string[]  // 可选字段：['color', 'size', 'icon']
    customFields?: Record<string, 'string' | 'number' | 'boolean' | 'object'>
  }
  
  // 边要求
  edgeRequirements: {
    requiredFields: string[]
    optionalFields?: string[]
  }
  
  // 元数据要求
  metadataRequirements?: {
    zones?: boolean  // 需要分区信息
    hierarchy?: boolean  // 需要层级信息
    groups?: boolean  // 需要分组信息
  }
}

/**
 * 布局配置基类
 */
export interface BaseLayoutConfig {
  name: LayoutType
  animate?: boolean
  randomize?: boolean
  
  // 布局要求（可选）
  requirements?: LayoutDataRequirement
  
  // 布局特性
  features?: {
    supportsLOD?: boolean  // 支持LOD
    supportsZones?: boolean  // 支持分区
    supportsConstraints?: boolean  // 支持约束
    supportsExpansion?: boolean  // 支持展开/收起
  }
}

/**
 * 同心圆布局配置
 */
export interface ConcentricLayoutConfig extends BaseLayoutConfig {
  name: 'concentric'
  
  // 圈层配置
  outerRadius: number           // 外圈半径（默认3000）
  innerRadius: number           // 内圈半径（默认2000）
  clusterRadius: number         // 组内半径（默认150）
  minGroupDistance: number      // 组间最小距离（默认450）
  
  // 分组配置
  innerGroupCount: number       // 内圈组数（默认8）
  outerGroupCount: number       // 外圈组数（默认12）
  
  // 节点距离修正
  enableNodeSpacingCorrection: boolean
  minNodeDistanceMultiplier: number
  spacingCorrectionStrength: number
  
  // 分散策略
  scatterRatio: number          // 跨组分散比例（默认0.1）
}

/**
 * 力导向布局配置
 */
export interface ForceDirectedLayoutConfig extends BaseLayoutConfig {
  name: 'force-directed'
  
  // fcose 参数
  quality: 'default' | 'draft' | 'proof'
  nodeSeparation: number        // 节点间距（默认75）
  idealEdgeLength: number       // 理想边长（默认50）
  nodeRepulsion: number         // 节点排斥力（默认4500）
  gravity: number               // 重力（默认0.25）
  gravityRange: number          // 重力范围（默认3.8）
}

/**
 * 分层LOD布局配置
 * 支持大规模数据的分区、LOD渲染和递归展开
 */
export interface HierarchicalLODLayoutConfig extends BaseLayoutConfig {
  name: 'hierarchical-lod'
  
  // 分区配置
  zones: {
    enabled: boolean
    shape: 'hexagon' | 'circle' | 'rectangle'  // 分区形状
    boundaryPadding: number                     // 边界内边距
    autoDetect: boolean                         // 自动检测分区（基于modid等）
    manualZones?: ZoneDefinition[]              // 手动定义的分区
  }
  
  // LOD层级配置
  lodLevels: {
    zoneOnly: { minZoom: number; maxZoom: number }       // 只显示大区
    zoneBoundary: { minZoom: number; maxZoom: number }   // 大区+边缘节点
    zoneExpanded: { minZoom: number; maxZoom: number }   // 大区展开
    fullDetail: { minZoom: number; maxZoom: number }     // 完整细节
  }
  
  // 节点约束
  constraints: {
    enableBoundaryNodes: boolean  // 启用边缘节点
    enableInternalNodes: boolean  // 启用内部节点
    allowDragOutside: boolean     // 允许拖出边界
  }
  
  // 递归展开
  expansion: {
    enabled: boolean
    maxDepth: number              // 最大展开深度
    animationDuration: number     // 展开动画时长
    layoutStrategy: 'radial' | 'tree' | 'force'  // 展开时的布局策略
  }
}

/**
 * 分区定义
 */
export interface ZoneDefinition {
  id: string
  name: string
  color: string
  nodeIds: string[]
  parentZone?: string  // 父分区（支持嵌套）
  level: number        // 层级
}

/**
 * 所有布局配置的联合类型
 */
export type LayoutConfig = ConcentricLayoutConfig | ForceDirectedLayoutConfig | HierarchicalLODLayoutConfig

/**
 * 布局引擎接口
 */
export interface ILayoutEngine {
  readonly name: LayoutType
  
  /**
   * 计算布局（返回带位置的节点）
   */
  compute(data: RawGraphData, config: LayoutConfig): LayoutedNode[]
  
  /**
   * 是否需要Cytoscape计算（力导向需要，同心圆不需要）
   */
  needsCytoscapeCompute(): boolean
  
  /**
   * 获取Cytoscape布局配置（如果需要的话）
   */
  getCytoscapeLayoutConfig?(config: LayoutConfig): any
}

