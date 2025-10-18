/**
 * StarChart 配置相关类型定义
 */

export type LogLevel = 'silent' | 'minimal' | 'normal' | 'verbose'

// WebGL 配置
export interface WebGLConfig {
  enabled: boolean                    // 启用WebGL加速
  showFps: boolean                   // 显示FPS
  debug: boolean                     // WebGL调试信息
  texSize: number                    // 纹理大小 (默认4096)
  texRows: number                    // 纹理行数 (默认32)
  batchSize: number                  // 批处理大小 (默认4000)
  texPerBatch: number               // 每批次纹理数 (默认16)
}

// 性能监控配置
export interface PerformanceMonitoringConfig {
  enabled: boolean                   // 启用性能监控
  detailedEventTracking: boolean     // 详细事件跟踪
  longFrameMonitoring: boolean       // 长帧检测
  summaryInterval: number            // 性能总结输出间隔 (ms)
  longFrameThreshold: number         // 长帧阈值 (ms, 默认50)
  enablePerformanceSummary: boolean  // 定期性能总结
}

// 日志控制配置
export interface LoggingConfig {
  level: LogLevel                    // 日志级别
  enableConsoleLog: boolean          // 控制台日志
  enableEventTracking: boolean       // 事件跟踪日志
  enablePerformanceWarnings: boolean // 性能警告
  enableDevToolsMarks: boolean       // DevTools性能标记
  enableInitializationLogs: boolean  // 初始化日志
  enableLayoutLogs: boolean          // 布局日志
  enableHighlightLogs: boolean       // 高亮日志
}

// 交互配置
export interface InteractionConfig {
  wheelSensitivity: number           // 滚轮灵敏度 (默认0.2)
  minZoom: number                    // 最小缩放 (默认0.05)
  maxZoom: number                    // 最大缩放 (默认5)  
  autoungrabify: boolean             // 允许拖动节点
  autounselectify: boolean           // 允许选择节点
  boxSelectionEnabled: boolean       // 框选功能
  selectionType: 'single' | 'multiple' // 选择类型
}

// 边样式配置
export interface EdgeStyleConfig {
  curveStyle: 'straight' | 'bezier' | 'unbundled-bezier' | 'haystack' | 'segments' | 'taxi'  // 边的形状
  controlPointDistance: number       // 贝塞尔曲线控制点距离
  controlPointWeight: number         // 贝塞尔曲线控制点权重
  edgeOpacity: number               // 平时边的透明度
  highlightEdgeOpacity: number      // 高亮时边的透明度
  defaultEdgeWidth: number          // 默认边宽度 (可在配置面板调节)
  highlightEdgeWidth: number        // 高亮时边宽度
  arrowShape: 'triangle' | 'none' | 'tee' | 'square' | 'circle' | 'diamond' | 'vee'  // 箭头形状
  arrowSize: number                 // 箭头大小
  edgeColor: string                 // 默认边颜色
  selectedEdgeColor: string         // 选中边颜色
}

// 渲染优化配置
export interface RenderOptimizationConfig {
  hideEdgesOnViewport: boolean       // 视口移动时隐藏边
  textureOnViewport: boolean         // 视口移动时使用纹理
  motionBlur: boolean                // 动态模糊
  hideLabelsOnViewport: boolean      // 视口移动时隐藏标签
  pixelRatio: 'auto' | number        // 像素比
  motionBlurOpacity: number          // 动态模糊透明度
  styleEnabled: boolean              // 样式计算开关
  headless: boolean                  // 无头模式
}

// 布局控制配置
export interface LayoutControlConfig {
  autoLayout: boolean                // 自动布局
  manualOnly: boolean               // 仅手动模式
  firstTimeAutoFit: boolean         // 首次自动适应
  animate: boolean                  // 布局动画
  randomize: boolean                // 随机化布局
  avoidWheelSensitivityReinit: boolean // 避免滚轮灵敏度变化时重新初始化
  
  // 节点间距修正配置
  enableNodeSpacingCorrection: boolean  // 是否启用节点间距修正
  minNodeDistanceMultiplier: number     // 最小节点间距倍数 (1.5-4.0, 默认2.5)
  spacingCorrectionStrength: number     // 修正强度 (0.1-1.0, 默认0.7)
}

// 节流配置
export interface ThrottleConfig {
  viewportChange: number             // 视口变化节流 (ms, 默认16)
  renderTracking: number             // 渲染跟踪节流 (ms, 默认200)
  styleUpdate: number                // 样式更新节流 (ms, 默认100)
  viewportTracking: number           // 视口跟踪节流 (ms, 默认500)
  highlightUpdate: number            // 高亮更新节流 (ms, 默认50)
  resetHighlight: number             // 重置高亮节流 (ms, 默认100)
}

// 节点样式配置
export interface NodeStyleConfig {
  // 基础设置
  defaultSize: number              // 默认节点大小 (20-40px)
  sizeMultiplier: number           // 节点大小倍数 (0.5-2.0, 默认1.0)
  randomSVGSelection: boolean      // 是否随机选择SVG
  selectedSVGIndex: number         // 手动选择的SVG索引 (0-13)
  
  // 不同级别节点大小 (相对于defaultSize * sizeMultiplier)
  selectedNodeSize: number         // 选中节点大小倍数 (默认1.2)
  firstDegreeNodeSize: number      // 一级邻居节点大小倍数 (默认1.1)
  secondDegreeNodeSize: number     // 二级邻居节点大小倍数 (默认1.0)
  fadedNodeSize: number            // 淡化节点大小倍数 (默认0.8)
  
  // 填充样式 (关键：空心或极淡填充)
  fillMode: 'none' | 'transparent'  // 填充模式：无填充或半透明
  fillOpacity: number             // 填充透明度 (0.02-0.15)
  fillColor: string               // 填充颜色
  
  // 边框样式
  strokeWidth: number             // 描边宽度 (1-3)
  strokeOpacity: number           // 描边透明度 (0.6-1.0)
  strokeColor: string             // 描边颜色
  
  // 文字设置
  textPosition: 'bottom' | 'center' | 'top'  // 文字位置
  textMargin: number              // 文字边距
  fontSize: number                // 字体大小
  textColor: string               // 文字颜色
  
  // 高级设置
  enableSVGCache: boolean         // 启用SVG缓存优化
  nodeTypeMapping: boolean        // 根据节点类型自动选择SVG
}

// 完整配置
export interface StarChartConfig {
  webgl: WebGLConfig
  performance: PerformanceMonitoringConfig
  logging: LoggingConfig
  interaction: InteractionConfig
  rendering: RenderOptimizationConfig
  layout: LayoutControlConfig
  throttle: ThrottleConfig
  edgeStyle: EdgeStyleConfig
  nodeStyle: NodeStyleConfig
  g6: G6Config                    // 🆕 G6 专属配置
}

// 配置预设
export type ConfigPreset = 'performance' | 'development' | 'production' | 'minimal'

/**
 * 数据源类型
 */
export type DataSourceType = 'mock-large' | 'mock-normal' | 'gun'

/**
 * 布局类型
 */
export type LayoutType = 'concentric' | 'force-directed'

// ==================== G6 渲染引擎相关类型 ====================

/**
 * 渲染引擎类型
 */
export type RenderEngine = 'cytoscape' | 'g6'

/**
 * G6 渲染器类型
 */
export type G6RendererType = 'canvas' | 'webgl' | 'svg' | 'auto'

/**
 * 渲染引擎特性定义
 */
export interface RenderEngineFeatures {
  supportWebGL: boolean         // 支持 WebGL 加速
  supportLargeGraph: boolean    // 支持大规模图 (10000+ 节点)
  supportCustomNode: boolean    // 支持自定义节点
  supportAnimation: boolean     // 支持动画
  supportSVG: boolean          // 支持 SVG 导出
  maxNodes: number             // 性能上限（节点数）
}

/**
 * G6 专属配置
 */
export interface G6Config {
  renderer: G6RendererType       // G6 渲染器类型
  pixelRatio: number             // 设备像素比（默认 auto）
  fitView: boolean               // 自动适应视口
  groupByTypes: boolean          // 按类型分组渲染
  enableOptimize: boolean        // 启用性能优化
  layeredRendering: boolean      // 分层渲染（主画布 WebGL + 交互层 Canvas）
}

/**
 * 配置兼容性映射
 * 定义哪些配置项是特定渲染引擎专属的
 */
export interface ConfigCompatibility {
  cytoscapeOnly: string[]        // Cytoscape 专属配置路径
  g6Only: string[]              // G6 专属配置路径
  shared: string[]              // 通用配置路径
}