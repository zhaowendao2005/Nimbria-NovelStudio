/**
 * StarChart 布局引擎类型定义
 */
import type { RawGraphData, LayoutedNode } from '../data/types'

/**
 * 布局类型
 */
export type LayoutType = 'concentric' | 'force-directed'

/**
 * 布局配置基类
 */
export interface BaseLayoutConfig {
  name: LayoutType
  animate?: boolean
  randomize?: boolean
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
 * 所有布局配置的联合类型
 */
export type LayoutConfig = ConcentricLayoutConfig | ForceDirectedLayoutConfig

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

