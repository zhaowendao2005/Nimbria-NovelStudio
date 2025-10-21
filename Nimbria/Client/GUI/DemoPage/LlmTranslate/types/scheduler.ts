/**
 * 调度器相关类型定义
 * 
 * 这些类型定义调度器的配置参数、状态等
 * 按照类型系统规范，这些是前端类型，会被后端通过别名转发导入
 */

/**
 * 调度器配置
 */
export interface SchedulerConfig {
  /** 最大并发数（1-10） */
  maxConcurrency: number
  
  /** 任务超时时间（秒，5-120） */
  taskTimeoutSeconds: number
  
  /** 流式无数据超时（秒，10-60） */
  streamNoDataTimeoutSeconds: number
  
  /** 限流探针间隔（秒，5-30） */
  throttleProbeIntervalSeconds: number
  
  /** 探针类型 */
  throttleProbeType: 'quick' | 'api'
  
  /** 限流后自动重试 */
  autoRetryThrottled: boolean
  
  /** 调度策略 */
  schedulingStrategy: 'timed' | 'event'
}

/**
 * 调度器状态
 */
export type SchedulerStatus = 'idle' | 'running' | 'paused' | 'throttled' | 'completed'

/**
 * 限流探针模式
 */
export type ThrottleProbeMode = 'quick' | 'api'

/**
 * 调度策略
 */
export type SchedulingStrategy = 'timed' | 'event'

/**
 * 默认调度器配置
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrency: 3,
  taskTimeoutSeconds: 30,
  streamNoDataTimeoutSeconds: 30,
  throttleProbeIntervalSeconds: 10,
  throttleProbeType: 'quick',
  autoRetryThrottled: true,
  schedulingStrategy: 'event'
}

