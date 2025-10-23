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
  
  /** 限流探针间隔（秒，5-30） */
  throttleProbeIntervalSeconds: number
  
  /** 探针类型 */
  throttleProbeType: 'quick' | 'api'
  
  /** 
   * 调度策略
   * - event: 事件驱动，任务完成立即发送下一个（适用于成熟、高并发、稳定的提供商）
   * - timed: 定时调度，固定间隔发送任务（适用于低并发、不稳定的提供商）
   */
  schedulingStrategy: 'timed' | 'event'
  
  /** 
   * 定时调度间隔（秒，1-10）
   * 仅当 schedulingStrategy='timed' 时生效
   * 表示每隔多少秒发送一批任务（受并发数限制）
   */
  timedInterval?: number
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
  throttleProbeIntervalSeconds: 10,
  throttleProbeType: 'quick',
  schedulingStrategy: 'event',
  timedInterval: 2  // 默认 2 秒间隔（timed 模式下使用）
}

