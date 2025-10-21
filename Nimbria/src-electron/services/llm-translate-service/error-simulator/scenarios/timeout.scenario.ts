/**
 * 超时错误场景 (504 Gateway Timeout)
 *
 * 模拟真实场景：
 * - API 服务响应缓慢，最终超时
 * - 延迟 30 秒后抛出 timeout 错误
 * - 5 秒后服务恢复正常
 */

import type { ErrorScenario } from '../types'

export const timeoutScenario: ErrorScenario = {
  id: 'timeout-error',
  name: '⏱️  超时错误 (504 Gateway Timeout)',
  probability: 5, // 5% 概率触发

  errorType: 'timeout',
  errorCode: 504,
  errorMessage: 'Gateway Timeout - Service is slow to respond',

  // 延迟 30 秒后抛出 timeout 错误
  delay: 30000,

  // 5 秒后服务恢复
  recoveryAfter: 5000,

  // 附加元数据
  metadata: {
    timeout: 30000, // 超时阈值
    serviceLatency: 28500 // 实际服务响应延迟
  }
}
