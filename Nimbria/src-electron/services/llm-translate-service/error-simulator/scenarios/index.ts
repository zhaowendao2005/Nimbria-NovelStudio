/**
 * 🎬 所有预定义场景的导出
 *
 * 汇总概率配置：
 * ├─ 70%   正常（通过不返回错误实现）
 * ├─ 15%   rateLimitScenario (429)
 * ├─ 10%   malformedScenario (500)
 * └─  5%   timeoutScenario (504)
 * = 100%
 */

export { rateLimitScenario } from './rate-limit.scenario'
export { timeoutScenario } from './timeout.scenario'
export { malformedScenario } from './malformed-response.scenario'

import type { ErrorScenario } from '../types'
import { rateLimitScenario } from './rate-limit.scenario'
import { timeoutScenario } from './timeout.scenario'
import { malformedScenario } from './malformed-response.scenario'

/**
 * 默认场景集合
 * 这是推荐的测试配置
 */
export const DEFAULT_SCENARIOS: ErrorScenario[] = [
  rateLimitScenario,
  malformedScenario,
  timeoutScenario
]

/**
 * 获取场景总概率
 * 用于验证配置是否正确
 */
export function getTotalProbability(scenarios: ErrorScenario[]): number {
  return scenarios.reduce((sum, s) => sum + s.probability, 0)
}

/**
 * 验证场景配置
 */
export function validateScenarios(scenarios: ErrorScenario[]): {
  valid: boolean
  message: string
} {
  const total = getTotalProbability(scenarios)

  if (Math.abs(total - 100) > 0.01) {
    return {
      valid: false,
      message: `概率总和不等于 100%: ${total.toFixed(2)}% (差异: ${(total - 100).toFixed(2)}%)`
    }
  }

  const ids = scenarios.map((s) => s.id)
  const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx)
  if (duplicateIds.length > 0) {
    return {
      valid: false,
      message: `存在重复的场景 ID: ${duplicateIds.join(', ')}`
    }
  }

  return {
    valid: true,
    message: '✅ 场景配置正确'
  }
}
