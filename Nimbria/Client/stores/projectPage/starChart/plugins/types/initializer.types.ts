/**
 * 插件初始化优化器类型定义
 * 
 * 为需要优化初始化过程的插件提供接口规范
 */

import type { G6GraphData, TreeNodeData } from '../../types/g6.types'
import type { LayoutOptions, LayoutResult, FinalStyleRules } from '../types'
import type { 
  InitializationProgressMessage,
  InitializationStage 
} from '@service/starChart/types/worker.types'

/**
 * 插件初始化优化器接口（可选）
 * 
 * 插件如果需要优化大规模数据的初始化过程，应实现此接口
 * 实现此接口的插件可以：
 * - 将计算拆分到 Web Worker 中执行
 * - 提供细粒度的进度反馈
 * - 实现分阶段的异步计算
 */
export interface IInitializationOptimizer {
  /**
   * 执行优化的初始化
   * 
   * @param data 输入数据（图数据或树数据）
   * @param options 布局选项
   * @param onProgress 进度回调函数
   * @returns 初始化结果（包含布局结果和最终样式）
   */
  initializeOptimized(
    data: G6GraphData | TreeNodeData,
    options: LayoutOptions,
    onProgress: (progress: InitializationProgressMessage) => void
  ): Promise<InitializationResult>
}

/**
 * 初始化结果
 */
export interface InitializationResult {
  // 布局计算结果
  layoutResult: LayoutResult
  
  // 最终样式规则
  finalStyles: FinalStyleRules
  
  // 性能指标
  performanceMetrics: PerformanceMetrics
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  // 数据适配耗时（毫秒）
  dataAdaptTime: number
  
  // 布局计算耗时（毫秒）
  layoutCalcTime: number
  
  // 样式生成耗时（毫秒）
  styleGenTime: number
  
  // 总耗时（毫秒）
  totalTime: number
  
  // 节点处理速度（nodes/s）
  nodesPerSecond?: number
  
  // 内存使用（字节，可选）
  memoryUsed?: number
}

/**
 * 进度计算辅助工具
 */
export class ProgressCalculator {
  private stage: InitializationStage
  private stageRange: [number, number]
  
  constructor(stage: InitializationStage, stageRange: [number, number]) {
    this.stage = stage
    this.stageRange = stageRange
  }
  
  /**
   * 计算当前进度
   * @param stageProgress 阶段内进度 0-1
   * @returns 总体进度 0-100
   */
  calculate(stageProgress: number): number {
    const [start, end] = this.stageRange
    return Math.round(start + (end - start) * Math.min(1, Math.max(0, stageProgress)))
  }
  
  /**
   * 创建进度消息
   * @param stageProgress 阶段内进度 0-1
   * @param message 消息内容
   * @param details 详细信息
   * @returns 进度消息对象
   */
  createProgressMessage(
    stageProgress: number,
    message: string,
    details: InitializationProgressMessage['details'] = {}
  ): InitializationProgressMessage {
    return {
      type: 'progress',
      stage: this.stage,
      progress: this.calculate(stageProgress),
      message,
      details
    }
  }
}

/**
 * 性能计时器
 */
export class PerformanceTimer {
  private startTime: number = 0
  private marks: Map<string, number> = new Map()
  
  /**
   * 开始计时
   */
  start(): void {
    this.startTime = performance.now()
  }
  
  /**
   * 标记时间点
   * @param name 标记名称
   */
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }
  
  /**
   * 获取从开始到标记的耗时
   * @param name 标记名称
   * @returns 耗时（毫秒）
   */
  getMeasure(name: string): number {
    const markTime = this.marks.get(name)
    if (!markTime) return 0
    return markTime - this.startTime
  }
  
  /**
   * 获取两个标记之间的耗时
   * @param startMark 开始标记
   * @param endMark 结束标记
   * @returns 耗时（毫秒）
   */
  getMeasureBetween(startMark: string, endMark: string): number {
    const start = this.marks.get(startMark)
    const end = this.marks.get(endMark)
    if (!start || !end) return 0
    return end - start
  }
  
  /**
   * 获取从开始到现在的总耗时
   * @returns 耗时（毫秒）
   */
  getElapsedTime(): number {
    return performance.now() - this.startTime
  }
  
  /**
   * 重置计时器
   */
  reset(): void {
    this.startTime = 0
    this.marks.clear()
  }
}

/**
 * 节点处理速度计算器
 */
export class ProcessingSpeedCalculator {
  private processed: number = 0
  private startTime: number = 0
  
  /**
   * 开始计算
   */
  start(): void {
    this.processed = 0
    this.startTime = performance.now()
  }
  
  /**
   * 更新已处理节点数
   * @param count 新处理的节点数
   */
  update(count: number): void {
    this.processed += count
  }
  
  /**
   * 获取当前处理速度
   * @returns 速度字符串（如 "1500 nodes/s"）
   */
  getSpeed(): string {
    const elapsed = (performance.now() - this.startTime) / 1000 // 转换为秒
    if (elapsed === 0) return '0 nodes/s'
    
    const speed = Math.round(this.processed / elapsed)
    return `${speed} nodes/s`
  }
  
  /**
   * 估算剩余时间
   * @param remaining 剩余节点数
   * @returns 剩余时间（毫秒）
   */
  estimateRemaining(remaining: number): number {
    const elapsed = (performance.now() - this.startTime) / 1000
    if (elapsed === 0 || this.processed === 0) return 0
    
    const speed = this.processed / elapsed
    return Math.round((remaining / speed) * 1000) // 转换为毫秒
  }
}

/**
 * 检查插件是否支持优化初始化
 * @param plugin 插件实例
 * @returns 是否支持优化初始化
 */
export function supportsOptimizedInitialization(
  plugin: unknown
): plugin is IInitializationOptimizer {
  return (
    typeof plugin === 'object' &&
    plugin !== null &&
    'initializeOptimized' in plugin &&
    typeof (plugin as Record<string, unknown>).initializeOptimized === 'function'
  )
}

