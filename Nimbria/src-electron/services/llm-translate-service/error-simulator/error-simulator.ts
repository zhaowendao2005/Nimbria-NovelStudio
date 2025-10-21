/**
 * 🎲 ErrorSimulator - 错误模拟系统主控制器
 *
 * 职责：
 * - 管理所有错误场景及其概率
 * - 实现掷骰子逻辑（随机选择场景）
 * - 收集统计数据
 * - 提供调试接口
 */

import type { ErrorScenario, ErrorSimulatorConfig, ErrorStats } from './types'

export class ErrorSimulator {
  private enabled: boolean = false
  private scenarios: ErrorScenario[] = []
  private debug: boolean = false

  // 统计数据
  private totalRequests: number = 0
  private errorCount: number = 0
  private scenarioCounts: Record<string, number> = {}

  constructor(config: ErrorSimulatorConfig) {
    this.setConfig(config)
  }

  /**
   * 🎲 核心方法：掷骰子决定是否返回错误
   *
   * 算法：
   * 1. 生成 0-100 的随机数
   * 2. 按概率权重累积，找到命中的场景
   * 3. 返回场景或 null
   *
   * 示例：
   * ┌─ 0-70    (70%) ──→ null (正常)
   * ├─ 70-85   (15%) ──→ rateLimitScenario
   * ├─ 85-95   (10%) ──→ timeoutScenario
   * └─ 95-100  (5%)  ──→ malformedScenario
   */
  rollDice(): ErrorScenario | null {
    if (!this.enabled || this.scenarios.length === 0) {
      return null
    }

    this.totalRequests++

    // 掷骰子：0-100 随机数
    const dice = Math.random() * 100
    let cumulative = 0

    // 按概率权重遍历场景
    for (const scenario of this.scenarios) {
      cumulative += scenario.probability

      // ✨ 命中这个场景
      if (dice < cumulative) {
        this.errorCount++
        this.scenarioCounts[scenario.id] = (this.scenarioCounts[scenario.id] || 0) + 1

        if (this.debug) {
          console.log(
            `🎲 [ErrorSimulator] 掷骰子: ${dice.toFixed(2)}/100 ` +
              `→ 命中场景 "${scenario.name}" (${scenario.probability}%)`
          )
        }

        return scenario
      }
    }

    // 不应该走到这里（如果概率配置正确）
    return null
  }

  /**
   * 设置配置
   * 验证概率总和是否为 100
   */
  setConfig(config: ErrorSimulatorConfig): void {
    this.enabled = config.enabled
    this.scenarios = config.scenarios
    this.debug = config.debug ?? false

    // 验证概率总和
    const totalProb = this.scenarios.reduce((sum, s) => sum + s.probability, 0)
    if (Math.abs(totalProb - 100) > 0.01) {
      console.warn(
        `⚠️  [ErrorSimulator] 概率总和不等于 100%: ${totalProb.toFixed(2)}% ` +
          `(可能导致某些场景无法命中)`
      )
    }

    if (this.debug) {
      console.log(`✅ [ErrorSimulator] 已加载 ${this.scenarios.length} 个场景，总概率: ${totalProb.toFixed(2)}%`)
      this.scenarios.forEach((s) => {
        console.log(`   - ${s.id}: "${s.name}" (${s.probability}%)`)
      })
    }
  }

  /**
   * 启用模拟器
   */
  enable(): void {
    this.enabled = true
    if (this.debug) {
      console.log(`🎲 [ErrorSimulator] 已启用`)
    }
  }

  /**
   * 禁用模拟器
   */
  disable(): void {
    this.enabled = false
    if (this.debug) {
      console.log(`🎲 [ErrorSimulator] 已禁用`)
    }
  }

  /**
   * 获取是否启用
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * 获取统计数据
   */
  getStats(): ErrorStats {
    const stats: ErrorStats = {
      totalRequests: this.totalRequests,
      errorCount: this.errorCount,
      scenarioCounts: { ...this.scenarioCounts },
      successRate:
        this.totalRequests > 0
          ? ((this.totalRequests - this.errorCount) / this.totalRequests) * 100
          : 100
    }
    return stats
  }

  /**
   * 重置统计数据
   */
  resetStats(): void {
    this.totalRequests = 0
    this.errorCount = 0
    this.scenarioCounts = {}

    if (this.debug) {
      console.log(`🎲 [ErrorSimulator] 统计数据已重置`)
    }
  }

  /**
   * 打印当前统计信息（调试用）
   */
  printStats(): void {
    const stats = this.getStats()
    console.log(`
📊 [ErrorSimulator] 当前统计：
   总请求数: ${stats.totalRequests}
   错误数: ${stats.errorCount}
   成功率: ${stats.successRate.toFixed(2)}%
   
   各场景触发次数:
${Object.entries(stats.scenarioCounts)
  .map(([id, count]) => `     - ${id}: ${count}`)
  .join('\n')}
    `)
  }
}
