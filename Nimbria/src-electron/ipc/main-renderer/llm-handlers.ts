/**
 * LLM配置管理 IPC Handlers
 * 处理前端与后端之间的LLM配置相关通信
 */

import { ipcMain } from 'electron';
import { nanoid } from 'nanoid';
import { LlmConfigManager } from '../../services/llm-service/llm-config-manager';
import { LlmApiClient } from '../../services/llm-service/llm-api-client';
import { getLogger } from '../../utils/shared/logger';
import type { IPCChannelMap, IPCRequest, IPCResponse } from '../../types/ipc';

const logger = getLogger('LlmHandlers');

export interface LlmHandlersDependencies {
  llmConfigManager: LlmConfigManager;
}

export function registerLlmHandlers(deps: LlmHandlersDependencies): void {
  const { llmConfigManager } = deps;

  /**
   * 获取所有提供商
   */
  ipcMain.handle('llm:get-providers', async (): Promise<IPCResponse<'llm:get-providers'>> => {
    try {
      logger.info('Handling llm:get-providers');
      const providers = await llmConfigManager.loadProviders();
      return { success: true, providers };
    } catch (error: any) {
      logger.error('Get providers failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 添加提供商
   */
  ipcMain.handle('llm:add-provider', async (
    _event, 
    request: IPCRequest<'llm:add-provider'>
  ): Promise<IPCResponse<'llm:add-provider'>> => {
    try {
      logger.info('Handling llm:add-provider');
      
      const newProvider = {
        ...request.provider,
        id: nanoid(),
        lastRefreshed: new Date(),
        refreshStatus: 'idle' as const
      };
      
      const provider = await llmConfigManager.addProvider(newProvider);
      return { success: true, provider };
    } catch (error: any) {
      logger.error('Add provider failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 删除提供商
   */
  ipcMain.handle('llm:remove-provider', async (
    _event,
    request: IPCRequest<'llm:remove-provider'>
  ): Promise<IPCResponse<'llm:remove-provider'>> => {
    try {
      logger.info(`Handling llm:remove-provider: ${request.providerId}`);
      await llmConfigManager.removeProvider(request.providerId);
      return { success: true };
    } catch (error: any) {
      logger.error('Remove provider failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 更新提供商配置
   */
  ipcMain.handle('llm:update-provider-config', async (
    _event,
    request: IPCRequest<'llm:update-provider-config'>
  ): Promise<IPCResponse<'llm:update-provider-config'>> => {
    try {
      logger.info(`Handling llm:update-provider-config: ${request.providerId}`);
      const provider = await llmConfigManager.updateProvider(request.providerId, request.config);
      return { success: true, provider };
    } catch (error: any) {
      logger.error('Update provider config failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 激活提供商
   */
  ipcMain.handle('llm:activate-provider', async (
    _event,
    request: IPCRequest<'llm:activate-provider'>
  ): Promise<IPCResponse<'llm:activate-provider'>> => {
    try {
      logger.info(`Handling llm:activate-provider: ${request.providerId}`);
      const provider = await llmConfigManager.updateProvider(request.providerId, { status: 'active' });
      return { success: true, provider };
    } catch (error: any) {
      logger.error('Activate provider failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 停用提供商
   */
  ipcMain.handle('llm:deactivate-provider', async (
    _event,
    request: IPCRequest<'llm:deactivate-provider'>
  ): Promise<IPCResponse<'llm:deactivate-provider'>> => {
    try {
      logger.info(`Handling llm:deactivate-provider: ${request.providerId}`);
      const provider = await llmConfigManager.updateProvider(request.providerId, { status: 'inactive' });
      return { success: true, provider };
    } catch (error: any) {
      logger.error('Deactivate provider failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 刷新提供商模型
   */
  ipcMain.handle('llm:refresh-models', async (
    _event,
    request: IPCRequest<'llm:refresh-models'>
  ): Promise<IPCResponse<'llm:refresh-models'>> => {
    try {
      logger.info(`Handling llm:refresh-models: ${request.providerId}`);
      
      const provider = await llmConfigManager.getProvider(request.providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      // 更新刷新状态为loading
      await llmConfigManager.updateProvider(request.providerId, { refreshStatus: 'loading' });
      
      const client = new LlmApiClient({
        apiKey: provider.apiKey!,
        baseURL: provider.baseUrl!,
        timeout: provider.defaultConfig.timeout,
        maxRetries: provider.defaultConfig.maxRetries
      });
      
      const startTime = Date.now();
      const discoveredModels = await client.discoverModels();
      const duration = Date.now() - startTime;
      
      // 更新提供商的supportedModels和刷新状态
      await llmConfigManager.updateProvider(request.providerId, {
        supportedModels: discoveredModels,
        lastRefreshed: new Date(),
        refreshStatus: 'success'
      });
      
      const modelsCount = discoveredModels.reduce((sum, g) => sum + g.models.length, 0);
      logger.info(`Refreshed ${modelsCount} models for provider ${request.providerId} in ${duration}ms`);
      
      return { success: true, providerId: request.providerId, modelsCount, duration };
    } catch (error: any) {
      logger.error('Refresh models failed:', error);
      
      // 更新刷新状态为error
      await llmConfigManager.updateProvider(request.providerId, { refreshStatus: 'error' });
      
      return { success: false, error: error.message };
    }
  });

  /**
   * 测试提供商连接
   */
  ipcMain.handle('llm:test-connection', async (
    _event,
    request: IPCRequest<'llm:test-connection'>
  ): Promise<IPCResponse<'llm:test-connection'>> => {
    try {
      logger.info(`Handling llm:test-connection: ${request.providerId}`);
      
      const provider = await llmConfigManager.getProvider(request.providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      const client = new LlmApiClient({
        apiKey: provider.apiKey!,
        baseURL: provider.baseUrl!,
        timeout: provider.defaultConfig.timeout,
        maxRetries: provider.defaultConfig.maxRetries
      });
      
      const result = await client.testConnection();
      
      if (result.success) {
        logger.info(`Connection test succeeded for provider ${request.providerId}`);
        return { success: true, message: result.message };
      } else {
        logger.warn(`Connection test failed for provider ${request.providerId}: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      logger.error('Test connection failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 测试新连接并发现模型
   */
  ipcMain.handle('llm:test-new-connection', async (
    _event,
    request: IPCRequest<'llm:test-new-connection'>
  ): Promise<IPCResponse<'llm:test-new-connection'>> => {
    try {
      logger.info(`Handling llm:test-new-connection: ${request.baseUrl}`);
      
      // 验证参数
      if (!LlmApiClient.validateApiKey(request.apiKey)) {
        return { success: false, error: 'Invalid API key' };
      }
      if (!LlmApiClient.validateBaseUrl(request.baseUrl)) {
        return { success: false, error: 'Invalid base URL' };
      }
      
      const client = new LlmApiClient({
        apiKey: request.apiKey,
        baseURL: request.baseUrl
      });
      
      // 先测试连接
      const connectionResult = await client.testConnection();
      if (!connectionResult.success) {
        return { success: false, error: connectionResult.error };
      }
      
      // 发现模型
      const discoveredModels = await client.discoverModels();
      const modelsCount = discoveredModels.reduce((sum, g) => sum + g.models.length, 0);
      
      logger.info(`Test connection succeeded, discovered ${modelsCount} models`);
      
      return { success: true, discoveredModels, modelsCount };
    } catch (error: any) {
      logger.error('Test new connection failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 验证提供商配置
   */
  ipcMain.handle('llm:validate-provider', async (
    _event,
    request: IPCRequest<'llm:validate-provider'>
  ): Promise<IPCResponse<'llm:validate-provider'>> => {
    try {
      logger.info('Handling llm:validate-provider');
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // 基本验证
      if (!request.config.name) {
        errors.push('提供商名称不能为空');
      }
      if (!request.config.displayName) {
        errors.push('显示名称不能为空');
      }
      if (request.config.apiKey && !LlmApiClient.validateApiKey(request.config.apiKey)) {
        errors.push('API密钥格式无效');
      }
      if (request.config.baseUrl && !LlmApiClient.validateBaseUrl(request.config.baseUrl)) {
        errors.push('Base URL格式无效');
      }
      
      // 警告
      if (!request.config.description) {
        warnings.push('建议添加提供商描述');
      }
      
      const isValid = errors.length === 0;
      
      return { isValid, errors, warnings };
    } catch (error: any) {
      logger.error('Validate provider failed:', error);
      return { isValid: false, errors: [error.message] };
    }
  });

  /**
   * 更新模型配置
   */
  ipcMain.handle('llm:update-model-config', async (
    _event,
    request: IPCRequest<'llm:update-model-config'>
  ): Promise<IPCResponse<'llm:update-model-config'>> => {
    try {
      logger.info(`Handling llm:update-model-config: ${request.providerId}/${request.modelType}/${request.modelName}`);
      
      const provider = await llmConfigManager.getProvider(request.providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      // 查找对应的模型类型组
      const modelGroup = provider.supportedModels.find(g => g.type === request.modelType);
      if (!modelGroup) {
        return { success: false, error: 'Model type not found' };
      }
      
      // 查找对应的模型
      const model = modelGroup.models.find(m => m.name === request.modelName);
      if (!model) {
        return { success: false, error: 'Model not found' };
      }
      
      // 更新模型配置
      model.config = { ...model.config, ...request.config };
      
      await llmConfigManager.updateProvider(request.providerId, { supportedModels: provider.supportedModels });
      
      return { success: true };
    } catch (error: any) {
      logger.error('Update model config failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 设置模型显示名称
   */
  ipcMain.handle('llm:set-model-display-name', async (
    _event,
    request: IPCRequest<'llm:set-model-display-name'>
  ): Promise<IPCResponse<'llm:set-model-display-name'>> => {
    try {
      logger.info(`Handling llm:set-model-display-name: ${request.providerId}/${request.modelName}`);
      
      // 此功能需要扩展ModelDetail类型以支持displayName
      // 当前暂不实现，返回成功
      logger.warn('set-model-display-name not fully implemented yet');
      
      return { success: true };
    } catch (error: any) {
      logger.error('Set model display name failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 切换模型选择状态
   */
  ipcMain.handle('llm:toggle-model-selection', async (
    _event,
    request: IPCRequest<'llm:toggle-model-selection'>
  ): Promise<IPCResponse<'llm:toggle-model-selection'>> => {
    try {
      logger.info(`Handling llm:toggle-model-selection: ${request.providerId}/${request.modelType}/${request.modelName}`);
      
      const provider = await llmConfigManager.getProvider(request.providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      // 确保activeModels存在
      if (!provider.activeModels) {
        provider.activeModels = {};
      }
      
      // 确保该类型的activeModels存在
      if (!provider.activeModels[request.modelType]) {
        provider.activeModels[request.modelType] = { selectedModels: [] };
      }
      
      const typeActiveState = provider.activeModels[request.modelType];
      const index = typeActiveState.selectedModels.indexOf(request.modelName);
      
      if (index !== -1) {
        // 模型已选中，取消选中
        typeActiveState.selectedModels.splice(index, 1);
        
        // 如果取消的是首选模型，清除首选设置
        if (typeActiveState.preferredModel === request.modelName) {
          typeActiveState.preferredModel = undefined;
        }
      } else {
        // 模型未选中，添加到选中列表
        typeActiveState.selectedModels.push(request.modelName);
      }
      
      await llmConfigManager.updateProvider(request.providerId, { activeModels: provider.activeModels });
      
      return { success: true };
    } catch (error: any) {
      logger.error('Toggle model selection failed:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * 设置首选模型
   */
  ipcMain.handle('llm:set-preferred-model', async (
    _event,
    request: IPCRequest<'llm:set-preferred-model'>
  ): Promise<IPCResponse<'llm:set-preferred-model'>> => {
    try {
      logger.info(`Handling llm:set-preferred-model: ${request.providerId}/${request.modelType}/${request.modelName}`);
      
      const provider = await llmConfigManager.getProvider(request.providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      // 确保activeModels存在
      if (!provider.activeModels) {
        provider.activeModels = {};
      }
      
      // 确保该类型的activeModels存在
      if (!provider.activeModels[request.modelType]) {
        provider.activeModels[request.modelType] = { selectedModels: [] };
      }
      
      const typeActiveState = provider.activeModels[request.modelType];
      
      // 确保模型在选中列表中
      if (!typeActiveState.selectedModels.includes(request.modelName)) {
        typeActiveState.selectedModels.push(request.modelName);
      }
      
      // 设置为首选模型
      typeActiveState.preferredModel = request.modelName;
      
      await llmConfigManager.updateProvider(request.providerId, { activeModels: provider.activeModels });
      
      return { success: true };
    } catch (error: any) {
      logger.error('Set preferred model failed:', error);
      return { success: false, error: error.message };
    }
  });

  logger.info('LLM handlers registered successfully');
}


