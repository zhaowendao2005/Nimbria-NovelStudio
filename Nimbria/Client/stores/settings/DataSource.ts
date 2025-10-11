/**
 * LLM配置数据源管理
 * 调用链：llm.mock.ts → DataSource.ts → settings.llm.store.ts
 * 
 * TODO: 未来对接真实后端服务时，替换mock数据调用
 */

import { ref } from 'vue';
import type { 
  ModelProvider, 
  ActiveModelConfig, 
  ProviderConfig,
  ModelConfig,
  ValidationResult,
  ModelRefreshResult,
} from './types';
import { 
  llmProvidersMock, 
  activeModelsMock 
} from './llm.mock';

/**
 * 数据源配置
 */
const useMockSource = ref(true); // TODO: 未来切换为false，使用真实数据源

/**
 * 配置数据源
 */
export function configureLlmDataSource(options: { useMock?: boolean }) {
  if (options.useMock !== undefined) {
    useMockSource.value = options.useMock;
  }
}

/**
 * 模拟延迟（模拟网络请求）
 */
function simulateDelay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取所有提供商
 * TODO: 对接后端API - GET /api/llm/providers
 */
export async function fetchProviders(): Promise<ModelProvider[]> {
  await simulateDelay();
  
  if (useMockSource.value) {
    // 深拷贝避免引用问题
    return JSON.parse(JSON.stringify(llmProvidersMock));
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.getProviders();
  // return response.data;
  
  return [];
}

/**
 * 获取活动模型配置
 * TODO: 对接后端API - GET /api/llm/active-models
 */
export async function fetchActiveModels(): Promise<ActiveModelConfig> {
  await simulateDelay();
  
  if (useMockSource.value) {
    return { ...activeModelsMock };
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.getActiveModels();
  // return response.data;
  
  return {};
}

/**
 * 添加新提供商
 * TODO: 对接后端API - POST /api/llm/providers
 */
export async function addProvider(
  provider: Omit<ModelProvider, 'id'> & { id?: string }
): Promise<ModelProvider> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const newProvider: ModelProvider = {
      ...provider,
      id: provider.id || `provider-${Date.now()}`,
      lastRefreshed: new Date(),
      refreshStatus: 'idle',
    } as ModelProvider;
    
    llmProvidersMock.push(newProvider);
    return newProvider;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.addProvider(provider);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 删除提供商
 * TODO: 对接后端API - DELETE /api/llm/providers/:id
 */
export async function removeProvider(providerId: string): Promise<boolean> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const index = llmProvidersMock.findIndex(p => p.id === providerId);
    if (index > -1) {
      llmProvidersMock.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.removeProvider(providerId);
  // return response.success;
  
  return false;
}

/**
 * 更新提供商配置
 * TODO: 对接后端API - PATCH /api/llm/providers/:id/config
 */
export async function updateProviderConfig(
  providerId: string,
  config: Partial<ProviderConfig>
): Promise<ModelProvider> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    Object.assign(provider, config);
    provider.lastRefreshed = new Date();
    
    return provider;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.updateProviderConfig(providerId, config);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 激活提供商
 * TODO: 对接后端API - POST /api/llm/providers/:id/activate
 */
export async function activateProvider(providerId: string): Promise<ModelProvider> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    provider.status = 'active';
    return provider;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.activateProvider(providerId);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 停用提供商
 * TODO: 对接后端API - POST /api/llm/providers/:id/deactivate
 */
export async function deactivateProvider(providerId: string): Promise<ModelProvider> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    provider.status = 'inactive';
    return provider;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.deactivateProvider(providerId);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 设置活动模型
 * TODO: 对接后端API - PUT /api/llm/active-models/:modelType
 */
export async function setActiveModel(
  modelType: string,
  modelId: string
): Promise<ActiveModelConfig> {
  await simulateDelay();
  
  if (useMockSource.value) {
    activeModelsMock[modelType] = modelId;
    return { ...activeModelsMock };
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.setActiveModel(modelType, modelId);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 清除活动模型
 * TODO: 对接后端API - DELETE /api/llm/active-models/:modelType
 */
export async function clearActiveModel(modelType: string): Promise<ActiveModelConfig> {
  await simulateDelay();
  
  if (useMockSource.value) {
    delete activeModelsMock[modelType];
    return { ...activeModelsMock };
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.clearActiveModel(modelType);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 刷新提供商模型列表
 * TODO: 对接后端API - POST /api/llm/providers/:id/refresh
 */
export async function refreshProviderModels(
  providerId: string
): Promise<ModelRefreshResult> {
  await simulateDelay(1000); // 模拟较长的网络请求
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      return {
        providerId,
        success: false,
        error: 'Provider not found',
      };
    }
    
    // 模拟刷新成功
    provider.lastRefreshed = new Date();
    provider.refreshStatus = 'success';
    
    const modelsCount = provider.supportedModels.reduce(
      (count, group) => count + group.models.length,
      0
    );
    
    return {
      providerId,
      success: true,
      modelsCount,
      duration: 1000,
    };
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.refreshProviderModels(providerId);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 验证提供商配置
 * TODO: 对接后端API - POST /api/llm/providers/validate
 */
export async function validateProvider(
  config: Partial<ModelProvider>
): Promise<ValidationResult> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!config.apiKey) {
      errors.push('API Key 不能为空');
    }
    
    if (!config.baseUrl) {
      errors.push('Base URL 不能为空');
    } else if (!config.baseUrl.startsWith('http')) {
      errors.push('Base URL 必须以 http:// 或 https:// 开头');
    }
    
    if (!config.displayName) {
      errors.push('显示名称不能为空');
    }
    
    if (config.apiKey && config.apiKey.length < 10) {
      warnings.push('API Key 长度可能不正确');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.validateProvider(config);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 测试提供商连接
 * TODO: 对接后端API - POST /api/llm/providers/:id/test
 */
export async function testProviderConnection(
  providerId: string
): Promise<{ success: boolean; message: string }> {
  await simulateDelay(1500);
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      return {
        success: false,
        message: '提供商不存在',
      };
    }
    
    // 模拟测试成功
    return {
      success: true,
      message: '连接测试成功',
    };
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.testProviderConnection(providerId);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 更新模型配置
 * TODO: 对接后端API - PATCH /api/llm/providers/:id/models/:modelName/config
 */
export async function updateModelConfig(
  providerId: string,
  modelName: string,
  config: Partial<ModelConfig>
): Promise<ModelProvider> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    // 查找并更新模型配置
    for (const modelGroup of provider.supportedModels) {
      const model = modelGroup.models.find(m => m.name === modelName);
      if (model) {
        model.config = { ...model.config, ...config };
        break;
      }
    }
    
    return provider;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.updateModelConfig(providerId, modelName, config);
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 导出配置
 * TODO: 对接后端API - GET /api/llm/config/export
 */
export async function exportConfig(): Promise<string> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const config = {
      providers: llmProvidersMock,
      activeModels: activeModelsMock,
      exportTime: new Date().toISOString(),
    };
    
    return JSON.stringify(config, null, 2);
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.exportConfig();
  // return response.data;
  
  throw new Error('Not implemented');
}

/**
 * 导入配置
 * TODO: 对接后端API - POST /api/llm/config/import
 */
export async function importConfig(configContent: string): Promise<boolean> {
  await simulateDelay();
  
  if (useMockSource.value) {
    try {
      const config = JSON.parse(configContent);
      
      // 验证配置格式
      if (!config.providers || !Array.isArray(config.providers)) {
        throw new Error('Invalid config format');
      }
      
      // 模拟导入成功
      return true;
    } catch (error) {
      throw new Error('Failed to import config: ' + (error as Error).message);
    }
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.importConfig(configContent);
  // return response.success;
  
  throw new Error('Not implemented');
}

