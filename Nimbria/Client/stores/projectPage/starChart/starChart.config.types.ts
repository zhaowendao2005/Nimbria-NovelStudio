/**
 * StarChart 配置相关类型定义
 * G6原生版本 - 简化配置
 */

// ==================== 数据源与布局 ====================

/**
 * 数据源类型
 */
export type DataSourceType = 'mock-large' | 'mock-normal' | 'mcrecipe-static' | 'gun'

/**
 * 布局类型（仅2个）
 */
export type LayoutType = 'concentric' | 'compact-box'

// ==================== 配置接口 ====================

/**
 * 交互配置
 */
export interface InteractionConfig {
  wheelSensitivity: number           // 滚轮灵敏度 (0.1-20, 默认0.2)
  enableClickActivate: boolean       // 点击激活邻域
  activateDegree: number            // 激活层级 (1-3度)
}

/**
 * 边样式配置
 */
export interface EdgeStyleConfig {
  defaultEdgeWidth: number          // 默认边宽度 (0.5-3)
  edgeOpacity: number              // 平时边透明度 (0.1-1.0)
  arrowShape: 'triangle' | 'none' | 'circle' | 'diamond'  // 箭头形状
}

/**
 * 布局控制配置
 */
export interface LayoutControlConfig {
  // 节点间距修正配置（同心圆专属）
  enableNodeSpacingCorrection: boolean  // 是否启用节点间距修正
  minNodeDistanceMultiplier: number     // 最小节点间距倍数 (1.5-4.0)
  spacingCorrectionStrength: number     // 修正强度 (0.1-1.0)
}

/**
 * 节点样式配置
 */
export interface NodeStyleConfig {
  // 基础设置
  defaultSize: number              // 默认节点大小 (16-48px)
  sizeMultiplier: number           // 节点大小倍数 (0.5-2.0)
  randomSVGSelection: boolean      // 是否随机选择SVG
  selectedSVGIndex: number         // 手动选择的SVG索引 (0-13)
  
  // 填充样式
  fillMode: 'none' | 'transparent'  // 填充模式
  fillOpacity: number             // 填充透明度 (0.02-0.15)
  
  // 边框样式
  strokeWidth: number             // 描边宽度 (1-3)
  
  // 文字设置
  textPosition: 'bottom' | 'center' | 'top'  // 文字位置
  fontSize: number                // 字体大小 (8-16)
}

/**
 * G6 专属配置
 */
export interface G6Config {
  renderer: 'canvas' | 'webgl' | 'svg' | 'auto'  // G6 渲染器类型
  pixelRatio: number               // 设备像素比
  fitView: boolean                 // 自动适应视口
}

/**
 * 完整配置
 */
export interface StarChartConfig {
  interaction: InteractionConfig
  edgeStyle: EdgeStyleConfig
  layout: LayoutControlConfig
  nodeStyle: NodeStyleConfig
  g6: G6Config
}

/**
 * 配置预设
 */
export type ConfigPreset = 'performance' | 'development' | 'production' | 'minimal'
