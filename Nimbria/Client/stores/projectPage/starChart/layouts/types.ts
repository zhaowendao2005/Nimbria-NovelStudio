/**
 * StarChart 布局引擎类型定义 - G6原生版
 */
import type { G6GraphData, G6Node } from '../data/types'

/**
 * 布局类型（简化为2种）
 */
export type LayoutType = 'concentric' | 'compact-box'

/**
 * 布局配置基类
 */
export interface BaseLayoutConfig {
  name: LayoutType
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
 * 紧凑树布局配置（G6内置）
 */
export interface CompactBoxLayoutConfig extends BaseLayoutConfig {
  name: 'compact-box'
  // G6内置布局，由G6处理，无需额外配置
}

/**
 * 所有布局配置的联合类型
 */
export type LayoutConfig = ConcentricLayoutConfig | CompactBoxLayoutConfig

/**
 * 布局引擎接口（G6原生版）
 */
export interface ILayoutEngine {
  readonly name: LayoutType
  
  /**
   * 计算布局（直接修改G6节点的x,y坐标）
   */
  compute(data: G6GraphData, config: LayoutConfig): G6Node[]
}
