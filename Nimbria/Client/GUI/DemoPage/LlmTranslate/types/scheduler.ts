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
  
  /** 任务总超时时间（秒，10-300），包括排队、执行、重试等所有时间 */
  taskTimeoutSeconds: number
  
  /** 调度器监控超时（秒，30-180），调度器层面的健康检测 */
  streamNoDataTimeoutSeconds: number
  
  /** 限流探针间隔（秒，5-30） */
  throttleProbeIntervalSeconds: number
  
  /** 探针类型 */
  throttleProbeType: 'quick' | 'api'
  
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
  taskTimeoutSeconds: 120,  // 调整为 2 分钟（任务总超时）
  streamNoDataTimeoutSeconds: 60,  // 调整为 1 分钟（调度器监控超时）
  throttleProbeIntervalSeconds: 10,
  throttleProbeType: 'quick',
  schedulingStrategy: 'event'
}

