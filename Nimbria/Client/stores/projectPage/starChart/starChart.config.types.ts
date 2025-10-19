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
 * 布局类型
 */
export type LayoutType = 'multi-root-radial'

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
 * WebGL 优化配置
 */
export interface WebGLOptimizationConfig {
  // 渲染优化
  enableInstancedRendering: boolean     // 启用实例化渲染
  enableFrustumCulling: boolean        // 启用视锥剔除
  enableDirtyRectangleRendering: boolean // 启用脏矩形渲染
  enableCulling: boolean               // 启用剔除优化
  
  // LOD (Level of Detail) 系统
  enableLOD: boolean                   // 启用 LOD 系统
  lodZoomThresholds: {
    low: number                        // 低细节阈值 (< 0.1)
    medium: number                     // 中等细节阈值 (< 0.5)
    high: number                       // 高细节阈值 (>= 0.5)
  }
  
  // 几何体优化
  nodeSegments: {
    low: number                        // 低细节节点段数 (4-6)
    medium: number                     // 中等细节节点段数 (8-12)
    high: number                       // 高细节节点段数 (16-32)
  }
  
  // 批处理优化
  enableBatching: boolean              // 启用几何体批处理
  batchSize: number                    // 批处理大小 (1000-10000)
  
  // 交互优化
  interactionThrottle: number          // 交互事件节流 (16-100ms)
  enableSpatialIndex: boolean          // 启用空间索引
  
  // 内存优化
  enableTextureAtlas: boolean          // 启用纹理图集
  enableGeometryCompression: boolean   // 启用几何体压缩
  maxVisibleNodes: number              // 最大可见节点数 (1000-50000)
  
  // 性能监控
  enablePerformanceMonitoring: boolean // 启用性能监控
  fpsTarget: number                    // 目标帧率 (30-60)
}

/**
 * G6 专属配置
 */
export interface G6Config {
  renderer: 'canvas' | 'webgl' | 'svg'  // G6 渲染器类型（手动选择）
  pixelRatio: number               // 设备像素比
  fitView: boolean                 // 自动适应视口
  webglOptimization: WebGLOptimizationConfig  // WebGL 优化配置
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
