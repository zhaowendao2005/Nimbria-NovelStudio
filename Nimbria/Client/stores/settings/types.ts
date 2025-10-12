/**
 * LLM配置系统类型定义
 * 基于JiuZhang项目的类型系统
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
  config?: Partial<ModelConfig>; // 可选，用于覆盖默认配置
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
  selectedModels: string[];  // 该类型下被选中的模型名称列表（活动模型）
  preferredModel?: string;   // 该类型下的首选模型名称（从selectedModels中选择）
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
  activeModels?: ProviderActiveModels; // 该提供商的活动模型配置
  logo?: string;
  lastRefreshed?: Date;
  refreshStatus?: RefreshStatus;
  config?: ProviderConfig; // 保持向后兼容
}

/**
 * 活动模型配置 - 使用 provider.model 格式
 */
export interface ActiveModelConfig {
  [modelType: string]: string; // 格式: "providerId.modelName"
}

/**
 * 解析后的模型ID
 */
export interface ParsedModelId {
  providerId: string;
  modelName: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 模型刷新结果
 */
export interface ModelRefreshResult {
  providerId: string;
  success: boolean;
  modelsCount?: number;
  error?: string;
  duration?: number;
}

/**
 * 批量刷新结果
 */
export interface BatchRefreshResult {
  total: number;
  successful: number;
  failed: number;
  results: ModelRefreshResult[];
}

/**
 * 发现的模型（连接测试时返回）
 */
export interface DiscoveredModel {
  type: ModelType;
  models: Array<{
    name: string;
    isAvailable: boolean;
  }>;
}

/**
 * 连接测试结果
 */
export interface ConnectionTestResult {
  success: boolean;
  discoveredModels?: DiscoveredModel[];
  error?: string;
  modelsCount?: number;
}

/**
 * 工具函数：解析模型ID
 */
export function parseModelId(modelId: string): ParsedModelId {
  if (!modelId || typeof modelId !== 'string') {
    throw new Error('Invalid model ID');
  }
  
  // 使用 :: 作为分隔符以支持模型名称中包含点号的情况（如 gpt-3.5-turbo）
  const separatorIndex = modelId.indexOf('::');
  if (separatorIndex === -1) {
    throw new Error('Model ID must be in format "providerId::modelName"');
  }
  
  const providerId = modelId.substring(0, separatorIndex);
  const modelName = modelId.substring(separatorIndex + 2);
  
  if (!providerId || !modelName) {
    throw new Error('Provider ID and model name cannot be empty');
  }
  
  return { providerId, modelName };
}

/**
 * 工具函数：创建模型ID
 * 使用 :: 作为分隔符以支持模型名称中包含点号的情况（如 gpt-3.5-turbo）
 */
export function createModelId(providerId: string, modelName: string): string {
  if (!providerId || !modelName) {
    throw new Error('Provider ID and model name are required');
  }
  
  if (providerId.includes('::') || modelName.includes('::')) {
    throw new Error('Provider ID and model name cannot contain "::"');
  }
  
  return `${providerId}::${modelName}`;
}

/**
 * 工具函数：验证模型ID格式
 */
export function isValidModelId(modelId: string): boolean {
  try {
    parseModelId(modelId);
    return true;
  } catch {
    return false;
  }
}

