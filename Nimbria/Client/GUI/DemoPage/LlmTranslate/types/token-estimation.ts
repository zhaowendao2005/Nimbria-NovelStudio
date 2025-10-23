/**
 * Token换算配置类型定义
 * 
 * 用于管理不同模型的token估算策略
 * 支持自定义中文和ASCII字符的token换算比例
 */

/**
 * Token换算配置
 */
export interface TokenConversionConfig {
  id: string
  name: string
  /** 中文字符:token 比例（如 4 表示 4个中文字符 = 1个token） */
  chineseRatio: number
  /** ASCII字符:token 比例（如 1 表示 1个ASCII字符 = 1个token） */
  asciiRatio: number
  /** 配置描述 */
  description?: string
  /** 创建时间（由后端返回，必需） */
  createdAt: string
  /** 更新时间（由后端返回，必需） */
  updatedAt: string
}

/**
 * 默认的Token换算配置
 */
export const DEFAULT_TOKEN_CONVERSIONS: Omit<TokenConversionConfig, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'default-balanced',
    name: '通用配置（平衡）',
    chineseRatio: 2.5,
    asciiRatio: 1.0,
    description: '适用于大多数模型的平衡配置'
  },
  {
    id: 'gemini-chinese',
    name: 'Gemini中文优化',
    chineseRatio: 4.0,
    asciiRatio: 1.0,
    description: 'Gemini模型对中文的token换算'
  },
  {
    id: 'claude-optimized',
    name: 'Claude优化',
    chineseRatio: 2.0,
    asciiRatio: 0.8,
    description: 'Claude模型的token换算'
  },
  {
    id: 'openai-optimized',
    name: 'OpenAI优化',
    chineseRatio: 2.0,
    asciiRatio: 1.0,
    description: 'OpenAI模型的token换算'
  }
]

/**
 * Token估算器接口
 */
export interface ITokenEstimator {
  /**
   * 根据配置估算文本的token数
   * @param text 要估算的文本
   * @param config Token换算配置
   * @returns 估算的token数量
   */
  estimate(text: string, config: TokenConversionConfig): number
}

