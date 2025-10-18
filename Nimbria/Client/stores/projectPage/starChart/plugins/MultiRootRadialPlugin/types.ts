/**
 * 多根径向树布局插件专用类型定义
 */

/**
 * 径向布局配置
 */
export interface RadialLayoutConfig {
  // 环形分布参数
  baseRadiusMultiplier: number      // 根节点环形半径系数（5-15倍节点直径）
  minArcLengthMultiplier: number    // 最小弧长系数（2-6倍节点直径）
  maxArcLengthMultiplier: number    // 最大弧长系数（3-8倍节点直径）
  
  // 径向扩散参数
  baseDistance: number               // 第一层起始距离（40-400px）
  hierarchyStep: number              // 层级步进距离（30-150px）
  angleSpread: number                // 子节点扇形角度（弧度值）
  randomOffset: number               // 随机偏移量（0-50px）
}

/**
 * 根节点位置信息
 */
export interface RootPosition {
  x: number
  y: number
  angle: number  // 在环上的角度位置（弧度）
}

/**
 * 层级样式定义
 */
export interface HierarchyStyle {
  size: number
  fill: string
  opacity: number
}

/**
 * 布局计算选项
 */
export interface LayoutCalculateOptions extends RadialLayoutConfig {
  width: number
  height: number
  rootIds: string[]
}

