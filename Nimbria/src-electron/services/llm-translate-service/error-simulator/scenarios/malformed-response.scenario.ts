/**
 * 畸形响应错误场景 (500 Internal Server Error)
 *
 * 模拟真实场景：
 * - API 返回 500 错误
 * - 响应格式错误或不符合预期
 * - 3 秒后服务恢复
 */

import type { ErrorScenario } from '../types'

export const malformedScenario: ErrorScenario = {
  id: 'malformed-response',
  name: '❌ 畸形响应 (500 Internal Server Error)',
  probability: 10, // 10% 概率触发

  errorType: 'malformed',
  errorCode: 500,
  errorMessage: 'Internal Server Error - Invalid response format',

  // 立即返回错误（不延迟）
  delay: 0,

  // 3 秒后服务恢复
  recoveryAfter: 3000,

  // 附加元数据
  metadata: {
    responseBody: '<html><body>500 Internal Server Error</body></html>',
    contentType: 'text/html', // 期望 application/json 但返回了 text/html
    reason: 'Database connection failed'
  }
}
