/**
 * LLM 模型选择相关类型定义
 * 
 * @description
 * 用于模型选择器组件的类型定义，支持按提供商分组显示模型
 */

/**
 * 模型选项
 */
export interface ModelOption {
  /** 模型 ID，格式：providerId.modelName */
  modelId: string
  
  /** 模型显示名称 */
  modelName: string
  
  /** 提供商 ID */
  providerId: string
  
  /** 提供商名称 */
  providerName: string
  
  /** 是否已激活 */
  isActive: boolean
}

/**
 * 模型分组（按提供商）
 */
export interface ModelGroup {
  /** 提供商 ID */
  providerId: string
  
  /** 提供商名称 */
  providerName: string
  
  /** 该提供商下的模型列表 */
  models: ModelOption[]
}

