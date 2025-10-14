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
  ConnectionTestResult,
  DiscoveredModel,
} from './types';
import { 
  llmProvidersMock
} from './llm.mock';

// 确保 window.nimbria 类型可用
declare global {
  interface Window {
    nimbria: import('../../types/core/window').NimbriaWindowAPI;
  }
}

/**
 * 数据源配置
 */
const useMockSource = ref(false); // 使用真实的 Electron 后端数据源

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
 */
export async function fetchProviders(): Promise<ModelProvider[]> {
  if (useMockSource.value) {
    await simulateDelay();
    // 深拷贝避免引用问题
    return JSON.parse(JSON.stringify(llmProvidersMock));
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.getProviders();
  if (!response.success) {
    throw new Error(response.error || '获取提供商列表失败');
  }
  return response.providers || [];
}

// fetchActiveModels 已废弃 - 活动模型状态现在保存在每个provider的activeModels中

/**
 * 添加新提供商
 */
export async function addProvider(
  provider: Omit<ModelProvider, 'id'> & { id?: string }
): Promise<ModelProvider> {
  if (useMockSource.value) {
    await simulateDelay();
    const newProvider: ModelProvider = {
      ...provider,
      id: provider.id || `provider-${Date.now()}`,
      lastRefreshed: new Date(),
      refreshStatus: 'idle',
    } as ModelProvider;
    
    llmProvidersMock.push(newProvider);
    return newProvider;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.addProvider(provider as Omit<ModelProvider, 'id' | 'lastRefreshed' | 'refreshStatus'>);
  if (!response.success) {
    throw new Error(response.error || '添加提供商失败');
  }
  return response.provider!;
}

/**
 * 删除提供商
 */
export async function removeProvider(providerId: string): Promise<boolean> {
  if (useMockSource.value) {
    await simulateDelay();
    const index = llmProvidersMock.findIndex(p => p.id === providerId);
    if (index > -1) {
      llmProvidersMock.splice(index, 1);
      return true;
    }
    return false;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.removeProvider(providerId);
  if (!response.success) {
    throw new Error(response.error || '删除提供商失败');
  }
  return response.success;
}

/**
 * 更新提供商配置
 */
export async function updateProviderConfig(
  providerId: string,
  config: Partial<ProviderConfig>
): Promise<ModelProvider> {
  if (useMockSource.value) {
    await simulateDelay();
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    Object.assign(provider, config);
    provider.lastRefreshed = new Date();
    
    return provider;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.updateProviderConfig(providerId, config);
  if (!response.success) {
    throw new Error(response.error || '更新提供商配置失败');
  }
  return response.provider!;
}

/**
 * 激活提供商
 */
export async function activateProvider(providerId: string): Promise<ModelProvider> {
  if (useMockSource.value) {
    await simulateDelay();
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    provider.status = 'active';
    return provider;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.activateProvider(providerId);
  if (!response.success) {
    throw new Error(response.error || '激活提供商失败');
  }
  return response.provider!;
}

/**
 * 停用提供商
 */
export async function deactivateProvider(providerId: string): Promise<ModelProvider> {
  if (useMockSource.value) {
    await simulateDelay();
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    provider.status = 'inactive';
    return provider;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.deactivateProvider(providerId);
  if (!response.success) {
    throw new Error(response.error || '停用提供商失败');
  }
  return response.provider!;
}

// setActiveModel 和 clearActiveModel 已废弃
// 活动模型状态现在保存在每个provider的activeModels中
// 使用store的toggleModelSelection和setPreferredModel方法代替

/**
 * 刷新提供商模型列表
 */
export async function refreshProviderModels(
  providerId: string
): Promise<ModelRefreshResult> {
  if (useMockSource.value) {
    await simulateDelay(1000); // 模拟较长的网络请求
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
  
  // 真实IPC调用
  const response = await window.nimbria.llm.refreshModels(providerId);
  const result: ModelRefreshResult = {
    providerId: response.providerId || providerId,
    success: response.success,
    modelsCount: response.modelsCount || 0,
    duration: response.duration || 0
  };
  
  if (response.error) {
    result.error = response.error;
  }
  
  return result;
}

/**
 * 验证提供商配置
 */
export async function validateProvider(
  config: Partial<ModelProvider>
): Promise<ValidationResult> {
  if (useMockSource.value) {
    await simulateDelay();
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
  
  // 真实IPC调用
  const response = await window.nimbria.llm.validateProvider(config);
  return {
    isValid: response.isValid,
    errors: response.errors || [],
    warnings: response.warnings || []
  };
}

/**
 * 测试提供商连接
 */
export async function testProviderConnection(
  providerId: string
): Promise<{ success: boolean; message: string }> {
  if (useMockSource.value) {
    await simulateDelay(1500);
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
  
  // 真实IPC调用
  const response = await window.nimbria.llm.testConnection(providerId);
  return {
    success: response.success,
    message: response.message || (response.success ? '连接成功' : response.error || '连接失败')
  };
}

/**
 * 测试新提供商连接并发现模型
 */
export async function testNewProviderConnection(
  config: { baseUrl: string; apiKey: string }
): Promise<ConnectionTestResult> {
  if (useMockSource.value) {
    await simulateDelay(2000); // 模拟较长的连接测试
    // 模拟连接测试和模型发现
    const discoveredModels: DiscoveredModel[] = [
      {
        type: 'LLM',
        models: [
          { name: 'gpt-4o', isAvailable: true },
          { name: 'gpt-4-turbo', isAvailable: true },
          { name: 'gpt-4', isAvailable: true },
          { name: 'gpt-3.5-turbo', isAvailable: true },
        ]
      },
      {
        type: 'TEXT_EMBEDDING',
        models: [
          { name: 'text-embedding-3-large', isAvailable: true },
          { name: 'text-embedding-3-small', isAvailable: true },
          { name: 'text-embedding-ada-002', isAvailable: true },
        ]
      }
    ];

    const modelsCount = discoveredModels.reduce(
      (count, group) => count + group.models.length,
      0
    );

    return {
      success: true,
      discoveredModels,
      modelsCount
    };
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.testNewConnection(config.baseUrl, config.apiKey);
  if (!response.success) {
    return {
      success: false,
      error: response.error || '连接失败'
    };
  }
  
  return {
    success: true,
    discoveredModels: response.discoveredModels || [],
    modelsCount: response.modelsCount || 0
  };
}

/**
 * 更新模型配置
 */
export async function updateModelConfig(
  providerId: string,
  modelType: string,
  modelName: string,
  config: Partial<ModelConfig>
): Promise<ModelProvider> {
  if (useMockSource.value) {
    await simulateDelay();
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }
    
    // 查找并更新模型配置
    const modelGroup = provider.supportedModels.find(g => g.type === modelType);
    if (modelGroup) {
      const model = modelGroup.models.find(m => m.name === modelName);
      if (model) {
        // 如果config为空对象，删除model.config（表示使用提供商默认）
        if (Object.keys(config).length === 0) {
          delete (model as any).config;
        } else {
          (model as any).config = { ...(model as any).config, ...config };
        }
      }
    }
    
    return provider;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.updateModelConfig(providerId, modelType, modelName, config);
  if (!response.success) {
    throw new Error(response.error || '更新模型配置失败');
  }
  
  // 重新获取提供商数据
  const providersResponse = await window.nimbria.llm.getProviders();
  const provider = providersResponse.providers?.find(p => p.id === providerId);
  if (!provider) {
    throw new Error('Provider not found after update');
  }
  
  return provider;
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

// ==================== 模型管理（新增）====================

/**
 * 切换模型选择状态
 */
export async function toggleModelSelection(
  providerId: string,
  modelType: string,
  modelName: string
): Promise<boolean> {
  // 真实IPC调用
  const response = await window.nimbria.llm.toggleModelSelection(providerId, modelType, modelName);
  if (!response.success) {
    throw new Error(response.error || '切换模型选择状态失败');
  }
  return true;
}

/**
 * 设置首选模型
 */
export async function setPreferredModel(
  providerId: string,
  modelType: string,
  modelName: string
): Promise<boolean> {
  // 真实IPC调用
  const response = await window.nimbria.llm.setPreferredModel(providerId, modelType, modelName);
  if (!response.success) {
    throw new Error(response.error || '设置首选模型失败');
  }
  return true;
}

/**
 * 设置模型显示名
 */
export async function setModelDisplayName(
  providerId: string,
  modelName: string,
  displayName: string
): Promise<boolean> {
  if (useMockSource.value) {
    await simulateDelay();
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      return false;
    }
    
    // 查找并更新模型显示名
    for (const modelGroup of provider.supportedModels) {
      const model = modelGroup.models.find(m => m.name === modelName);
      if (model) {
        // 使用类型断言，因为ModelDetail可能没有displayName属性
        (model as any).displayName = displayName;
        return true;
      }
    }
    
    return false;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.setModelDisplayName(providerId, modelName, displayName);
  return response.success;
}

/**
 * 删除模型
 * TODO: 对接后端API - DELETE /api/llm/providers/:providerId/models/:modelType/:modelName
 */
export async function removeModel(
  providerId: string,
  modelType: string,
  modelName: string
): Promise<boolean> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      return false;
    }
    
    // 查找并删除模型
    const modelGroup = provider.supportedModels.find(g => g.type === modelType);
    if (modelGroup) {
      const modelIndex = modelGroup.models.findIndex(m => m.name === modelName);
      if (modelIndex > -1) {
        modelGroup.models.splice(modelIndex, 1);
        return true;
      }
    }
    
    return false;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.removeModel(providerId, modelType, modelName);
  // return response.success;
  
  return false;
}

/**
 * 添加模型
 * TODO: 对接后端API - POST /api/llm/providers/:providerId/models
 */
export async function addModel(
  providerId: string,
  modelType: string,
  modelDetail: any
): Promise<boolean> {
  await simulateDelay();
  
  if (useMockSource.value) {
    const provider = llmProvidersMock.find(p => p.id === providerId);
    if (!provider) {
      return false;
    }
    
    // 查找模型组
    let modelGroup = provider.supportedModels.find(g => g.type === modelType);
    
    // 如果组不存在，创建新组
    if (!modelGroup) {
      modelGroup = {
        type: modelType as any, // 类型断言，因为modelType是string
        models: []
      };
      provider.supportedModels.push(modelGroup);
    }
    
    // 检查模型是否已存在
    const existingModel = modelGroup.models.find(m => m.name === modelDetail.name);
    if (existingModel) {
      return false; // 模型已存在
    }
    
    // 添加模型
    modelGroup.models.push(modelDetail);
    return true;
  }
  
  // TODO: 真实API调用
  // const response = await window.api.llm.addModel(providerId, modelType, modelDetail);
  // return response.success;
  
  return false;
}

