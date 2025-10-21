/**
 * 🎲 ErrorSimulator 模块导出
 *
 * 📌 设计原则：
 * - 提供全局单例 `getErrorSimulator()`
 * - 所有类型和场景保持私有，不暴露给外部
 * - 只暴露必要的控制接口
 */

export { ErrorSimulator } from './error-simulator'
export type { ErrorScenario, ErrorSimulatorConfig, ErrorStats, ErrorType, DiceRollResult } from './types'

import { ErrorSimulator } from './error-simulator'
import type { ErrorSimulatorConfig } from './types'
import * as Scenarios from './scenarios'

/**
 * 全局 ErrorSimulator 单例
 */
let globalSimulator: ErrorSimulator | null = null

/**
 * 初始化错误模拟器
 *
 * @param config - 自定义配置（可选）
 * @returns 全局单例实例
 *
 * 示例：
 * ```ts
 * const simulator = initializeErrorSimulator({
 *   enabled: true,
 *   debug: true
 * })
 * ```
 */
export function initializeErrorSimulator(config?: Partial<ErrorSimulatorConfig>): ErrorSimulator {
  const defaultConfig: ErrorSimulatorConfig = {
    enabled: process.env.NODE_ENV === 'development', // 开发环境启用
    scenarios: Scenarios.DEFAULT_SCENARIOS,
    debug: process.env.DEBUG_ERROR_SIMULATOR === 'true'
  }

  globalSimulator = new ErrorSimulator({
    ...defaultConfig,
    ...config
  })

  return globalSimulator
}

/**
 * 获取全局 ErrorSimulator 实例
 * 如果未初始化，会自动创建一个使用默认配置的实例
 *
 * @returns 全局单例实例
 */
export function getErrorSimulator(): ErrorSimulator {
  if (!globalSimulator) {
    globalSimulator = initializeErrorSimulator()
  }
  return globalSimulator
}

/**
 * 重置全局单例（用于测试）
 */
export function resetErrorSimulator(): void {
  globalSimulator = null
}
