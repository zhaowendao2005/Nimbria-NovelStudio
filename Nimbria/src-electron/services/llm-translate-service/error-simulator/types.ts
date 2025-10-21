/**
 * 🎲 错误模拟系统类型定义（后端私有）
 *
 * 📌 规范说明：
 * - 这些类型定义在服务层内部，完全私有
 * - 不暴露给 IPC 层或前端
 * - 只在 error-simulator 和 llm-translation-client 中使用
 */

/**
 * 错误类型枚举
 */
export type ErrorType = 'rate-limit' | 'timeout' | 'malformed' | 'server-error'

/**
 * 单个错误场景的定义
 * 👉 代表一种可能的故障模式
 */
export interface ErrorScenario {
  // 标识
  id: string                    // 场景唯一ID，用于统计和调试
  name: string                  // 场景人类可读名称

  // 概率配置
  probability: number           // 概率权重 (0-100)
                                // 注：所有场景概率之和应为 100

  // 错误类型和内容
  errorType: ErrorType
  errorCode?: number            // HTTP 状态码（如 429、500 等）
  errorMessage?: string         // 错误消息

  // 延迟配置
  delay?: number                // 延迟时间 (毫秒)
                                // 模拟网络延迟或处理时间
  recoveryAfter?: number        // 多少毫秒后自动恢复
                                // 用于模拟服务缓慢恢复的场景

  // 自定义元数据（扩展性）
  metadata?: Record<string, unknown>
}

/**
 * 掷骰子的结果
 */
export interface DiceRollResult {
  rolled: boolean               // 是否命中错误
  scenario: ErrorScenario | null
  probability: number           // 本次掷骰子产生的随机值 (0-100)
  timestamp: number             // 命中时间戳
}

/**
 * ErrorSimulator 的配置
 */
export interface ErrorSimulatorConfig {
  enabled: boolean              // 是否启用模拟器
  scenarios: ErrorScenario[]    // 所有可能的错误场景
  seed?: number                 // 随机种子（可选，用于调试复现）
  debug?: boolean               // 是否输出详细日志
}

/**
 * 统计数据
 */
export interface ErrorStats {
  totalRequests: number         // 总请求数
  errorCount: number            // 错误数量
  scenarioCounts: Record<string, number>  // 各场景触发次数
  successRate: number           // 成功率 (%)
}
