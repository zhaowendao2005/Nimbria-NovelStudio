/**
 * 限流错误场景 (429 Too Many Requests)
 *
 * 模拟真实场景：
 * - API 返回 429 状态码
 * - 提示请求过于频繁，需要等待
 * - 建议重试等待时间：2秒
 */

import type { ErrorScenario } from '../types'

export const rateLimitScenario: ErrorScenario = {
  id: 'rate-limit-429',
  name: '🚫 限流错误 (429 Too Many Requests)',
  probability: 15, // 15% 概率触发

  errorType: 'rate-limit',
  errorCode: 429,
  errorMessage: 'Too Many Requests - Rate limit exceeded',

  // 不延迟，立即返回错误（真实 API 行为）
  delay: 0,

  // 2秒后服务恢复
  recoveryAfter: 2000,

  // 附加元数据
  metadata: {
    retryAfter: 2, // HTTP 标准：建议重试等待秒数
    remaining: 0, // 剩余请求配额
    limit: 100 // API 每分钟限额
  }
}
