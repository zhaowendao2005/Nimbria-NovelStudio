/**
 * Writing Panel 相关类型定义
 */

import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'

/**
 * 面板基础配置
 */
export interface PanelConfig {
  name: string
  title: string
  icon: string
  collapsibleItemName: string
  description?: string
}

/**
 * 初始化进度状态
 */
export interface InitProgressState {
  // 是否正在初始化
  isInitializing: boolean
  
  // 当前阶段
  currentStage: string
  currentStageLabel: string
  
  // 当前进度 (0-100)
  currentProgress: number
  
  // 详细信息
  details: {
    processedNodes: number
    totalNodes: number
    speed: string
    elapsedTime: number
    estimatedRemaining: number
  }
  
  // 错误信息
  error: string | null
  errorStack?: string
  
  // 操作状态
  canCancel: boolean
  canPause: boolean
  canResume: boolean
  
  // 性能指标（完成后）
  performanceMetrics?: {
    dataAdaptTime: number
    layoutCalcTime: number
    styleGenTime: number
    totalTime: number
    nodesPerSecond?: number
  }
}

/**
 * 初始化进度状态的默认值
 */
export const DEFAULT_INIT_PROGRESS_STATE: InitProgressState = {
  isInitializing: false,
  currentStage: '',
  currentStageLabel: '',
  currentProgress: 0,
  details: {
    processedNodes: 0,
    totalNodes: 0,
    speed: '0 nodes/s',
    elapsedTime: 0,
    estimatedRemaining: 0
  },
  error: null,
  canCancel: false,
  canPause: false,
  canResume: false
}

/**
 * 阶段类型到标签的映射
 */
export const STAGE_LABELS: Record<string, string> = {
  'data-adapt': '数据适配',
  'layout-calc': '布局计算',
  'style-gen': '样式生成',
  'g6-init': 'G6初始化',
  'rendering': '渲染',
  'completed': '完成',
  'error': '错误'
}

/**
 * 阶段类型到颜色的映射
 */
export const STAGE_COLORS: Record<string, string> = {
  'data-adapt': 'primary',
  'layout-calc': 'warning',
  'style-gen': 'success',
  'g6-init': 'info',
  'rendering': 'success',
  'completed': 'success',
  'error': 'danger'
}

/**
 * 获取阶段标签
 */
export function getStageLabel(stage: string): string {
  return STAGE_LABELS[stage] || stage
}

/**
 * 获取阶段颜色
 */
export function getStageColor(stage: string): string {
  return STAGE_COLORS[stage] || 'info'
}

/**
 * 格式化时间
 * @param ms 毫秒
 * @returns 格式化的时间字符串
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * 格式化节点处理速度
 * @param nodesPerSecond 每秒节点数
 * @returns 格式化的速度字符串
 */
export function formatSpeed(nodesPerSecond: number): string {
  if (nodesPerSecond >= 1000) {
    return `${(nodesPerSecond / 1000).toFixed(1)}k nodes/s`
  }
  return `${Math.round(nodesPerSecond)} nodes/s`
}

/**
 * 将进度消息转换为进度状态
 */
export function progressMessageToState(
  message: InitializationProgressMessage,
  currentState: InitProgressState
): Partial<InitProgressState> {
  return {
    currentStage: message.stage,
    currentStageLabel: getStageLabel(message.stage),
    currentProgress: message.progress,
    details: {
      processedNodes: message.details.processedNodes || currentState.details.processedNodes,
      totalNodes: message.details.totalNodes || currentState.details.totalNodes,
      speed: message.details.speed || currentState.details.speed,
      elapsedTime: message.details.elapsedTime || currentState.details.elapsedTime,
      estimatedRemaining: message.details.estimatedRemaining || currentState.details.estimatedRemaining
    },
    error: message.error || null,
    errorStack: message.errorStack,
    canCancel: message.stage !== 'completed' && message.stage !== 'error'
  }
}

