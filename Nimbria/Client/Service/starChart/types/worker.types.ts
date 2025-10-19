/**
 * StarChart 初始化 Worker 通信类型定义
 * 
 * 定义主线程与 Worker 之间的通信协议
 */

import type { G6GraphData, TreeNodeData } from '@stores/projectPage/starChart/types/g6.types'
import type { LayoutOptions, LayoutResult } from '@stores/projectPage/starChart/plugins/types'

/**
 * G6 配置（简化版，仅包含必要信息）
 */
export interface GraphConfig {
  width: number
  height: number
  renderer: 'canvas' | 'webgl' | 'svg'
  webglOptimization?: WebGLOptimizationConfig
}

/**
 * WebGL 优化配置
 */
export interface WebGLOptimizationConfig {
  enableInstancedRendering: boolean
  enableFrustumCulling: boolean
  enableDirtyRectangleRendering: boolean
  enableCulling: boolean
  enableLOD: boolean
  enableBatching: boolean
  enableSpatialIndex: boolean
  enableTextureAtlas: boolean
  enableGeometryCompression: boolean
  enablePerformanceMonitoring: boolean
  lodZoomThresholds: {
    low: number
    medium: number
    high: number
  }
  nodeSegments: {
    low: number
    medium: number
    high: number
  }
  batchSize: number
  interactionThrottle: number
  maxVisibleNodes: number
  fpsTarget: number
}

/**
 * 用户配置
 */
export interface UserStyleConfigData {
  nodeStyle?: Record<string, unknown>
  edgeStyle?: Record<string, unknown>
  interaction?: Record<string, unknown>
}

// ==================== Worker 消息类型 ====================

/**
 * Worker 初始化消息（主线程 → Worker）
 */
export interface InitializationWorkerMessage {
  // 消息类型
  command: 'start-init' | 'cancel' | 'pause' | 'resume'
  
  // 插件标识
  pluginName: string
  
  // 初始化数据
  data: {
    graphData: G6GraphData | TreeNodeData
    layoutOptions: LayoutOptions
    containerWidth: number
    containerHeight: number
    rendererType: 'canvas' | 'webgl' | 'svg'
    webglOptimization?: WebGLOptimizationConfig
  }
  
  // 可选：用户配置
  userConfig?: UserStyleConfigData
}

/**
 * 初始化阶段
 */
export type InitializationStage = 
  | 'data-adapt'    // 数据适配
  | 'layout-calc'   // 布局计算（零碰撞预分配）
  | 'style-gen'     // 样式生成
  | 'g6-init'       // G6初始化（主线程执行）
  | 'rendering'     // 渲染（主线程执行）
  | 'completed'     // 完成
  | 'error'         // 错误

/**
 * Worker 初始化进度消息（Worker → 主线程）
 */
/**
 * 各阶段独立进度状态（简化为3个阶段）
 */
export interface StageProgressState {
  dataAdapt: number      // 0-100，数据适配进度
  layoutCalc: number     // 0-100，布局计算进度（零碰撞）
  styleGen: number       // 0-100，样式生成进度
}

export interface InitializationProgressMessage {
  // 消息类型标识
  type: 'progress'
  
  // 当前进度阶段
  stage: InitializationStage
  
  // 各阶段独立进度（4个独立的进度条）
  stageProgress: StageProgressState
  
  // 全局总进度 (0-100，可选)
  overallProgress?: number
  
  // 当前消息
  message: string
  
  // 详细统计
  details: {
    processedNodes?: number
    totalNodes?: number
    speed?: string                 // "1500 nodes/s"
    elapsedTime?: number          // 毫秒
    estimatedRemaining?: number    // 毫秒
  }
  
  // 错误信息（stage 为 error 时）
  error?: string
  errorStack?: string
}

/**
 * Worker 初始化结果消息（Worker → 主线程）
 */
export interface InitializationResultMessage {
  // 消息类型标识
  type: 'result'
  
  // 状态
  status: 'success' | 'cancelled' | 'error'
  
  // 结果数据（注意：样式已应用到 layoutResult 中，不再单独返回）
  result?: {
    layoutResult: LayoutResult  // 已包含应用了样式的节点和边
    performanceMetrics: {
      dataAdaptTime: number
      layoutCalcTime: number
      styleGenTime: number
      totalTime: number
    }
  }
  
  // 错误信息
  error?: string
  errorStack?: string
}

/**
 * Worker 消息联合类型
 */
export type WorkerMessage = InitializationProgressMessage | InitializationResultMessage

// ==================== 初始化阶段定义 ====================

/**
 * 初始化阶段配置
 */
export interface StageConfig {
  stage: InitializationStage
  range: [number, number]  // 进度范围 [start%, end%]
  message: string
  description?: string
}

/**
 * 所有初始化阶段的配置映射
 */
export const InitializationStages: Record<string, StageConfig> = {
  DATA_ADAPT: {
    stage: 'data-adapt',
    range: [0, 20],
    message: '正在适配数据格式...',
    description: '验证和转换输入数据'
  },
  LAYOUT_CALC: {
    stage: 'layout-calc',
    range: [20, 50],
    message: '正在计算节点位置...',
    description: '执行布局算法计算'
  },
  STYLE_GEN: {
    stage: 'style-gen',
    range: [50, 70],
    message: '正在生成样式配置...',
    description: '生成节点和边的样式'
  },
  G6_INIT: {
    stage: 'g6-init',
    range: [70, 90],
    message: '正在初始化渲染引擎...',
    description: '创建 G6 Graph 实例'
  },
  RENDERING: {
    stage: 'rendering',
    range: [90, 100],
    message: '正在渲染图表...',
    description: '执行最终渲染'
  }
} as const

/**
 * 获取阶段配置
 */
export function getStageConfig(stage: InitializationStage): StageConfig | undefined {
  return Object.values(InitializationStages).find(s => s.stage === stage)
}

/**
 * 计算阶段内的具体进度
 * @param stage 当前阶段
 * @param stageProgress 阶段内进度 0-1
 * @returns 总体进度 0-100
 */
export function calculateProgress(stage: InitializationStage, stageProgress: number): number {
  const config = getStageConfig(stage)
  if (!config) return 0
  
  const [start, end] = config.range
  return Math.round(start + (end - start) * stageProgress)
}

