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
  edgeOpacity: number               // 边的透明度
  defaultEdgeWidth: number          // 默认边宽
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
}

// 配置预设
export type ConfigPreset = 'performance' | 'development' | 'production' | 'minimal'
