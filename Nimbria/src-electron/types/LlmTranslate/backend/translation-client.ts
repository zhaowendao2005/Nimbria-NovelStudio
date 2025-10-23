/**
 * LLM Translation Client 类型定义
 * 
 * @description
 * 翻译客户端的配置、请求和响应类型
 */

/**
 * 错误类型枚举
 * 
 * 三层超时架构：
 * - TIMEOUT_TOTAL: Layer 3 兜底机制
 * - TIMEOUT_HTTP: Layer 2a 非流式HTTP超时
 * - TIMEOUT_FIRST_TOKEN: Layer 2b 流式首字超时
 * - TIMEOUT_IDLE: Layer 2b 流式空闲超时
 */
export type ErrorType = 
  | 'RATE_LIMIT'           // 限流（429），特殊处理（限流探针）
  | 'API_ERROR'            // API错误（非429），显示详细信息
  | 'TIMEOUT_TOTAL'        // 任务总超时（兜底），可手动重试
  | 'TIMEOUT_HTTP'         // HTTP请求超时（主动关闭），可重试
  | 'TIMEOUT_FIRST_TOKEN'  // 首个token超时（主动关闭），可重试
  | 'TIMEOUT_IDLE'         // 流式响应空闲超时（主动关闭），可重试
  | 'TIMEOUT'              // 通用超时（向后兼容）
  | 'CONNECTION_CLOSED'    // 服务器主动关闭连接，可重试
  | 'NETWORK'              // 网络错误
  | 'INVALID_API_KEY'      // API 密钥无效
  | 'MODEL_ERROR'          // 模型错误
  | 'USER_PAUSED'          // 用户暂停
  | 'APP_CRASHED'          // 应用崩溃
  | 'UNKNOWN'              // 未知错误

/**
 * 翻译客户端配置
 */
export interface TranslationClientConfig {
  /** 模型 ID，格式：providerId.modelName */
  modelId: string
  
  /** 系统提示词 */
  systemPrompt: string
  
  /** 温度参数（可选，不设置则使用模型/提供商默认） */
  temperature?: number
  
  /** 最大输出 Token（可选，不设置则使用模型/提供商默认） */
  maxTokens?: number
  
  /** Top P 采样参数（可选） */
  topP?: number
  
  /** Frequency Penalty（可选） */
  frequencyPenalty?: number
  
  /** Presence Penalty（可选） */
  presencePenalty?: number
  
  /** 
   * HTTP 请求超时时间（毫秒）
   * Layer 2a: 非流式模式下整个HTTP请求的最长等待时间
   */
  timeout: number
  
  /** 最大重试次数 */
  maxRetries: number
  
  /** 是否启用流式响应（可选，默认true） */
  enableStreaming?: boolean
  
  /** 
   * 流式首字超时（毫秒，可选）
   * Layer 2b: 等待首个token的最长时间
   * 仅在 enableStreaming=true 时生效
   */
  streamFirstTokenTimeout?: number
  
  /** 
   * 流式空闲超时（毫秒，可选）
   * Layer 2b: 后续token之间的最大间隔
   * 仅在 enableStreaming=true 时生效
   */
  streamIdleTimeout?: number
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

