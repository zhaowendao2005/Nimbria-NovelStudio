/**
 * LLM服务层类型定义
 * 与前端Client/stores/settings/types.ts保持一致
 */

/**
 * 模型类型枚举
 */
export type ModelType = 
  | 'LLM' 
  | 'TEXT_EMBEDDING' 
  | 'IMAGE_GENERATION' 
  | 'SPEECH_TO_TEXT' 
  | 'TEXT_TO_SPEECH' 
  | 'RERANK' 
  | 'SPEECH2TEXT' 
  | 'TTS';

/**
 * 提供商状态
 */
export type ProviderStatus = 'active' | 'inactive' | 'available';

/**
 * 刷新状态
 */
export type RefreshStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * 模型配置接口
 */
export interface ModelConfig {
  timeout: number;
  maxRetries: number;
  contextLength: number;
  maxTokens: number;
  completionMode: '对话' | '补全';
  agentThought: '支持' | '不支持';
  functionCalling: '支持' | '不支持';
  structuredOutput: '支持' | '不支持';
  systemPromptSeparator: string;
}

/**
 * 默认模型配置
 */
export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  timeout: 30000,
  maxRetries: 3,
  contextLength: 4096,
  maxTokens: 4096,
  completionMode: '对话',
  agentThought: '不支持',
  functionCalling: '不支持',
  structuredOutput: '不支持',
  systemPromptSeparator: '\n\n'
};

/**
 * 模型详情接口
 */
export interface ModelDetail {
  name: string;
  config?: Partial<ModelConfig>;
  isAvailable?: boolean;
}

/**
 * 支持的模型组
 */
export interface SupportedModel {
  type: ModelType;
  models: ModelDetail[];
}

/**
 * 提供商配置
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  [key: string]: any;
}

/**
 * 模型类型的活动状态
 */
export interface ModelTypeActiveState {
  selectedModels: string[];
  preferredModel?: string;
}

/**
 * 提供商的活动模型配置
 */
export interface ProviderActiveModels {
  [modelType: string]: ModelTypeActiveState;
}

/**
 * 模型提供商接口
 */
export interface ModelProvider {
  id: string;
  name: string;
  displayName: string;
  description: string;
  status: ProviderStatus;
  apiKey: string;
  baseUrl: string;
  defaultConfig: ModelConfig;
  supportedModels: SupportedModel[];
  activeModels?: ProviderActiveModels;
  logo?: string;
  lastRefreshed?: Date;
  refreshStatus?: RefreshStatus;
  config?: ProviderConfig;
}

/**
 * 发现的模型（用于连接测试）
 */
export interface DiscoveredModel {
  type: ModelType;
  models: ModelDetail[];
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  error?: string;
  message?: string;
}

/**
 * 模型刷新结果
 */
export interface ModelRefreshResult {
  success: boolean;
  providerId?: string;
  modelsCount?: number;
  duration?: number;
  error?: string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * YAML配置文件结构
 */
export interface ProvidersYamlData {
  providers: ModelProvider[];
}


