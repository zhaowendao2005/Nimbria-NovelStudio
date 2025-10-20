/**
 * LLM Translation Client 类型定义
 * 
 * @description
 * 翻译客户端的配置、请求和响应类型
 */

/**
 * 错误类型枚举
 */
export type ErrorType = 
  | 'RATE_LIMIT'      // 限流（429）
  | 'TIMEOUT'         // 超时
  | 'NETWORK'         // 网络错误
  | 'INVALID_API_KEY' // API 密钥无效
  | 'MODEL_ERROR'     // 模型错误
  | 'USER_PAUSED'     // 用户暂停
  | 'APP_CRASHED'     // 应用崩溃
  | 'UNKNOWN'         // 未知错误

/**
 * 翻译客户端配置
 */
export interface TranslationClientConfig {
  /** 模型 ID，格式：providerId.modelName */
  modelId: string
  
  /** 系统提示词 */
  systemPrompt: string
  
  /** 温度参数 */
  temperature: number
  
  /** 最大输出 Token */
  maxTokens: number
  
  /** 超时时间（毫秒） */
  timeout: number
  
  /** 最大重试次数 */
  maxRetries: number
}

/**
 * 翻译请求
 */
export interface TranslationRequest {
  /** 任务 ID */
  taskId: string
  
  /** 待翻译内容 */
  content: string
  
  /** 预估输出 Token 数 */
  estimatedTokens: number
}

/**
 * 翻译结果
 */
export interface TranslationResult {
  /** 任务 ID */
  taskId: string
  
  /** 翻译结果 */
  translation: string
  
  /** 实际输入 Token */
  inputTokens: number
  
  /** 实际输出 Token */
  outputTokens: number
  
  /** 耗时（毫秒） */
  durationMs: number
  
  /** 费用 */
  cost: number
}

/**
 * 流式翻译回调
 */
export interface TranslationStreamCallbacks {
  /** 开始回调 */
  onStart?: (taskId: string) => void
  
  /** 进度回调 */
  onProgress?: (taskId: string, chunk: string, tokens: number) => void
  
  /** 完成回调 */
  onComplete?: (taskId: string, result: TranslationResult) => void
  
  /** 错误回调 */
  onError?: (taskId: string, error: Error) => void
}

/**
 * 模型配置（从 LlmConfigManager 获取）
 */
export interface ModelConfig {
  /** 模型名称 */
  modelName: string
  
  /** API Key */
  apiKey: string
  
  /** Base URL */
  baseUrl: string
  
  /** 其他配置 */
  [key: string]: any
}

