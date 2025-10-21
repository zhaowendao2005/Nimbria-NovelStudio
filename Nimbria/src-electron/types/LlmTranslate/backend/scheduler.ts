/**
 * 后端独有的调度器类型
 * 这些类型不暴露给前端，仅在后端使用
 */

/**
 * Token回归样本（后端内部使用）
 */
export interface TokenRegressionSample {
  modelId: string
  inputLength: number
  inputTokens: number
  outputTokens: number
  timestamp: number
}

/**
 * 调度器内部选项（后端内部使用）
 */
export interface SchedulerInternalOptions {
  retryOnThrottle: boolean
  retryDelayMs: number
  maxRetries: number
}

/**
 * 探针测试结果（后端内部使用）
 */
export interface ProbeTestResultInternal {
  success: boolean
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: number
}

