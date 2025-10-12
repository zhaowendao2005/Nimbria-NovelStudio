import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  ModelProvider, 
  ModelConfig,
  ProviderConfig,
  ValidationResult,
  ModelRefreshResult,
  BatchRefreshResult
} from './types';
import * as DataSource from './DataSource';

/**
 * LLM配置状态管理
 */
export const useSettingsLlmStore = defineStore('settings-llm', () => {
  // ==================== 状态 ====================
  const providers = ref<ModelProvider[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // 新增状态
  const modelRefreshStatus = ref<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const lastRefreshTime = ref<Record<string, Date>>({});
  const validationErrors = ref<Record<string, string[]>>({});
  const batchRefreshProgress = ref<{ total: number; completed: number; failed: number }>({ 
    total: 0, 
    completed: 0, 
    failed: 0 
  });

  // ==================== 计算属性 ====================
  
  const activeProviders = computed(() =>
    providers.value.filter(p => p.status === 'active')
  );

  const inactiveProviders = computed(() =>
    providers.value.filter(p => p.status === 'inactive')
  );

  const availableProviders = computed(() =>
    providers.value.filter(p => p.status === 'available')
  );

  // 获取支持特定模型类型的提供商
  const getProvidersByModelType = computed(() => (modelType: string) =>
    providers.value.filter(p =>
      p.supportedModels.some(model => model.type === modelType)
    )
  );

  // 检查是否有错误状态
  const hasError = computed(() => Boolean(error.value));

  // 获取所有提供商的活动模型类型（已选中的模型类型）
  const activeModelTypes = computed(() => {
    const typesSet = new Set<string>();
    
    providers.value.forEach(provider => {
      if (provider.activeModels) {
        Object.keys(provider.activeModels).forEach(type => {
          const typeState = provider.activeModels![type];
          if (typeState && typeState.selectedModels.length > 0) {
            typesSet.add(type);
          }
        });
      }
    });
    
    return Array.from(typesSet).sort();
  });

  // ==================== 数据加载 ====================
  
  async function loadProviders() {
    try {
      console.log('🔄 [LLM Store] 开始加载提供商');
      loading.value = true;
      error.value = null;
      providers.value = await DataSource.fetchProviders();
      console.log('✅ [LLM Store] 成功加载提供商:', providers.value.length, '个');
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载提供商失败';
      console.error('❌ [LLM Store] 加载提供商失败:', err);
    } finally {
      loading.value = false;
    }
  }

  // loadActiveModels已废弃 - 活动模型状态现在保存在每个provider的activeModels中

  // ==================== 提供商管理 ====================

  async function activateProvider(providerId: string) {
    try {
      loading.value = true;
      error.value = null;
      const updatedProvider = await DataSource.activateProvider(providerId);
      
      // 更新本地状态
      const index = providers.value.findIndex(p => p.id === providerId);
      if (index >= 0) {
        providers.value[index] = updatedProvider;
      }
      
      console.log('✅ [LLM Store] 提供商已激活:', providerId);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '激活提供商失败';
      console.error('❌ [LLM Store] 激活提供商失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function deactivateProvider(providerId: string) {
    try {
      loading.value = true;
      error.value = null;
      const updatedProvider = await DataSource.deactivateProvider(providerId);
      
      // 更新本地状态
      const index = providers.value.findIndex(p => p.id === providerId);
      if (index >= 0) {
        providers.value[index] = updatedProvider;
      }
      
      console.log('✅ [LLM Store] 提供商已停用:', providerId);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '停用提供商失败';
      console.error('❌ [LLM Store] 停用提供商失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function updateProviderConfig(providerId: string, config: Partial<ProviderConfig>) {
    try {
      loading.value = true;
      error.value = null;
      const updatedProvider = await DataSource.updateProviderConfig(providerId, config);
      
      // 更新本地状态
      const index = providers.value.findIndex(p => p.id === providerId);
      if (index >= 0) {
        providers.value[index] = updatedProvider;
      }
      
      console.log('✅ [LLM Store] 提供商配置已更新:', providerId);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新配置失败';
      console.error('❌ [LLM Store] 更新配置失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function addProvider(provider: Omit<ModelProvider, 'id'> & { id?: string }) {
    try {
      loading.value = true;
      error.value = null;
      const newProvider = await DataSource.addProvider(provider);
      
      // 更新本地状态
      providers.value.push(newProvider);
      
      console.log('✅ [LLM Store] 提供商已添加:', newProvider.id);
      return newProvider;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加提供商失败';
      console.error('❌ [LLM Store] 添加提供商失败:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function removeProvider(providerId: string) {
    try {
      loading.value = true;
      error.value = null;
      const success = await DataSource.removeProvider(providerId);
      
      if (success) {
        // 更新本地状态
        const index = providers.value.findIndex(p => p.id === providerId);
        if (index >= 0) {
          providers.value.splice(index, 1);
        }
        
        console.log('✅ [LLM Store] 提供商已删除:', providerId);
      }
      
      return success;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除提供商失败';
      console.error('❌ [LLM Store] 删除提供商失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  // ==================== 活动模型管理（旧方法，已废弃）====================
  // 注意：setActiveModel和clearActiveModel已废弃
  // 请使用toggleModelSelection和setPreferredModel代替

  // ==================== 提供商活动模型管理 ====================

  /**
   * 切换模型的选中状态（添加到或从selectedModels中移除）
   */
  function toggleModelSelection(providerId: string, modelType: string, modelName: string): boolean {
    const provider = providers.value.find(p => p.id === providerId);
    if (!provider) return false;

    // 初始化activeModels
    if (!provider.activeModels) {
      provider.activeModels = {};
    }

    // 初始化该类型的状态
    if (!provider.activeModels[modelType]) {
      provider.activeModels[modelType] = {
        selectedModels: []
      };
    }

    const typeState = provider.activeModels[modelType]!;
    const index = typeState.selectedModels.indexOf(modelName);

    if (index > -1) {
      // 已选中，移除
      typeState.selectedModels.splice(index, 1);
      
      // 如果移除的是首选模型，清除首选模型
      if (typeState.preferredModel === modelName) {
        delete typeState.preferredModel;
      }
      
      console.log('✅ [LLM Store] 模型已取消选中:', providerId, modelType, modelName);
      return false; // 返回false表示已取消选中
    } else {
      // 未选中，添加
      typeState.selectedModels.push(modelName);
      
      // 如果这是该类型的第一个选中模型，自动设为首选
      if (typeState.selectedModels.length === 1) {
        typeState.preferredModel = modelName;
      }
      
      console.log('✅ [LLM Store] 模型已选中:', providerId, modelType, modelName);
      return true; // 返回true表示已选中
    }
  }

  /**
   * 设置首选模型（从已选中的模型中选择）
   */
  function setPreferredModel(providerId: string, modelType: string, modelName: string): boolean {
    const provider = providers.value.find(p => p.id === providerId);
    if (!provider || !provider.activeModels || !provider.activeModels[modelType]) {
      return false;
    }

    const typeState = provider.activeModels[modelType];
    
    // 检查模型是否在selectedModels中
    if (!typeState.selectedModels.includes(modelName)) {
      console.warn('⚠️ [LLM Store] 只能从已选中的模型中设置首选模型');
      return false;
    }

    typeState.preferredModel = modelName;
    console.log('✅ [LLM Store] 首选模型已设置:', providerId, modelType, modelName);
    return true;
  }

  /**
   * 检查模型是否被选中
   */
  function isModelSelected(providerId: string, modelType: string, modelName: string): boolean {
    const provider = providers.value.find(p => p.id === providerId);
    if (!provider || !provider.activeModels || !provider.activeModels[modelType]) {
      return false;
    }
    return provider.activeModels[modelType].selectedModels.includes(modelName);
  }

  /**
   * 检查模型是否为首选模型
   */
  function isPreferredModel(providerId: string, modelType: string, modelName: string): boolean {
    const provider = providers.value.find(p => p.id === providerId);
    if (!provider || !provider.activeModels || !provider.activeModels[modelType]) {
      return false;
    }
    return provider.activeModels[modelType].preferredModel === modelName;
  }

  // ==================== 模型刷新 ====================

  async function refreshProviderModels(providerId: string): Promise<ModelRefreshResult> {
    try {
      modelRefreshStatus.value[providerId] = 'loading';
      error.value = null;
      
      const result = await DataSource.refreshProviderModels(providerId);
      
      if (result.success) {
        modelRefreshStatus.value[providerId] = 'success';
        lastRefreshTime.value[providerId] = new Date();
        
        // 重新加载提供商数据
        await loadProviders();
        
        console.log('✅ [LLM Store] 提供商模型已刷新:', providerId);
      } else {
        modelRefreshStatus.value[providerId] = 'error';
        console.error('❌ [LLM Store] 刷新提供商模型失败:', result.error);
      }
      
      return result;
    } catch (err) {
      modelRefreshStatus.value[providerId] = 'error';
      error.value = err instanceof Error ? err.message : '刷新模型列表失败';
      console.error('❌ [LLM Store] 刷新提供商模型失败:', err);
      
      return {
        providerId,
        success: false,
        error: err instanceof Error ? err.message : '未知错误',
      };
    }
  }

  async function refreshAllProviders(): Promise<BatchRefreshResult> {
    try {
      loading.value = true;
      error.value = null;
      
      const activeProvidersList = providers.value.filter(
        p => p.status === 'active' || p.status === 'available'
      );
      
      batchRefreshProgress.value = { 
        total: activeProvidersList.length, 
        completed: 0, 
        failed: 0 
      };
      
      // 设置所有提供商为加载状态
      activeProvidersList.forEach(provider => {
        modelRefreshStatus.value[provider.id] = 'loading';
      });

      // 并发刷新所有提供商
      const results: ModelRefreshResult[] = [];
      const promises = activeProvidersList.map(async (provider) => {
        try {
          const result = await refreshProviderModels(provider.id);
          results.push(result);
          
          if (result.success) {
            batchRefreshProgress.value.completed++;
          } else {
            batchRefreshProgress.value.failed++;
          }
        } catch (error) {
          batchRefreshProgress.value.failed++;
          results.push({
            providerId: provider.id,
            success: false,
            error: error instanceof Error ? error.message : '未知错误',
          });
          console.error(`❌ [LLM Store] 刷新提供商 ${provider.id} 失败:`, error);
        }
      });

      await Promise.allSettled(promises);
      
      console.log('✅ [LLM Store] 批量刷新完成:', batchRefreshProgress.value);
      
      return {
        total: batchRefreshProgress.value.total,
        successful: batchRefreshProgress.value.completed,
        failed: batchRefreshProgress.value.failed,
        results,
      };
    } catch (err) {
      error.value = err instanceof Error ? err.message : '批量刷新失败';
      console.error('❌ [LLM Store] 批量刷新提供商失败:', err);
      
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
      };
    } finally {
      loading.value = false;
    }
  }

  // ==================== 验证与测试 ====================

  async function validateProvider(config: Partial<ModelProvider>): Promise<ValidationResult> {
    try {
      const result = await DataSource.validateProvider(config);
      
      // 更新验证错误状态
      if (config.id) {
        if (result.errors.length > 0) {
          validationErrors.value[config.id] = result.errors;
        } else {
          delete validationErrors.value[config.id];
        }
      }
      
      return result;
    } catch (err) {
      console.error('❌ [LLM Store] 验证提供商配置失败:', err);
      return {
        isValid: false,
        errors: ['验证失败'],
        warnings: []
      };
    }
  }

  async function testProviderConnection(providerId: string): Promise<boolean> {
    try {
      const result = await DataSource.testProviderConnection(providerId);
      console.log('✅ [LLM Store] 提供商连接测试:', providerId, '→', result.success);
      return result.success;
    } catch (err) {
      console.error('❌ [LLM Store] 测试提供商连接失败:', err);
      return false;
    }
  }

  /**
   * 测试新提供商连接（用于添加向导）
   * @param config - 提供商基础配置
   * @returns 连接测试结果，包含发现的模型
   */
  async function testNewProviderConnection(config: {
    baseUrl: string;
    apiKey: string;
  }): Promise<ConnectionTestResult> {
    try {
      const result = await DataSource.testNewProviderConnection(config);
      console.log('✅ [LLM Store] 新提供商连接测试成功:', result.modelsCount, '个模型');
      return result;
    } catch (err) {
      console.error('❌ [LLM Store] 测试新提供商连接失败:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : '连接测试失败'
      };
    }
  }

  // ==================== 模型配置 ====================

  /**
   * 更新单个模型的配置
   */
  async function updateModelConfig(
    providerId: string,
    modelType: string,
    modelName: string,
    config: Partial<ModelConfig>
  ): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;
      
      const updatedProvider = await DataSource.updateModelConfig(providerId, modelType, modelName, config);
      
      // 更新本地状态
      const index = providers.value.findIndex(p => p.id === providerId);
      if (index >= 0) {
        providers.value[index] = updatedProvider;
      }
      
      console.log('✅ [LLM Store] 模型配置已更新:', providerId, modelType, modelName);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新模型配置失败';
      console.error('❌ [LLM Store] 更新模型配置失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 获取模型的有效配置（考虑继承）
   */
  function getEffectiveModelConfig(
    providerId: string,
    modelType: string,
    modelName: string
  ): ModelConfig {
    const provider = providers.value.find(p => p.id === providerId);
    if (!provider) {
      throw new Error('提供商不存在');
    }

    const modelGroup = provider.supportedModels.find(g => g.type === modelType);
    if (!modelGroup) {
      throw new Error(`模型类型 ${modelType} 不存在`);
    }

    const model = modelGroup.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`模型 ${modelName} 不存在`);
    }

    // 合并配置：model.config 覆盖 provider.defaultConfig
    return {
      ...provider.defaultConfig,
      ...((model as any).config || {})
    };
  }

  async function resetModelConfig(providerId: string, modelName: string): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;
      
      // 通过更新为空配置来重置
      const provider = providers.value.find(p => p.id === providerId);
      if (!provider) {
        throw new Error('提供商不存在');
      }

      // 找到模型并重置其配置
      for (const modelGroup of provider.supportedModels) {
        const model = modelGroup.models.find(m => m.name === modelName);
        if (model) {
          delete model.config;
          break;
        }
      }
      
      console.log('✅ [LLM Store] 模型配置已重置:', providerId, modelName);
      return true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重置模型配置失败';
      console.error('❌ [LLM Store] 重置模型配置失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  // ==================== 配置导入导出 ====================

  async function exportConfig(): Promise<string | null> {
    try {
      loading.value = true;
      error.value = null;
      const configStr = await DataSource.exportConfig();
      console.log('✅ [LLM Store] 配置已导出');
      return configStr;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '导出配置失败';
      console.error('❌ [LLM Store] 导出配置失败:', err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function importConfig(configContent: string): Promise<{ success: boolean; error?: string }> {
    try {
      loading.value = true;
      error.value = null;
      const success = await DataSource.importConfig(configContent);
      
      if (success) {
        // 重新加载数据
        await loadProviders();
        console.log('✅ [LLM Store] 配置已导入');
        return { success: true };
      }
      
      return { success: false, error: '导入失败' };
    } catch (err) {
      error.value = err instanceof Error ? err.message : '导入配置失败';
      console.error('❌ [LLM Store] 导入配置失败:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : '未知错误' 
      };
    } finally {
      loading.value = false;
    }
  }

  // ==================== 模型管理（新增）====================

  /**
   * 设置模型显示名
   */
  async function setModelDisplayName(
    providerId: string,
    modelName: string,
    displayName: string
  ): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;

      const success = await DataSource.setModelDisplayName(providerId, modelName, displayName);
      
      if (success) {
        // 更新本地状态
        const provider = providers.value.find(p => p.id === providerId);
        if (provider) {
          for (const modelGroup of provider.supportedModels) {
            const model = modelGroup.models.find(m => m.name === modelName);
            if (model) {
              // 使用类型断言，因为ModelDetail可能没有displayName属性
              (model as any).displayName = displayName;
              break;
            }
          }
        }
        console.log('✅ [LLM Store] 模型显示名已更新:', providerId, modelName, '→', displayName);
      }

      return success;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '设置模型显示名失败';
      console.error('❌ [LLM Store] 设置模型显示名失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 从提供商删除模型
   */
  async function removeModelFromProvider(
    providerId: string,
    modelType: string,
    modelName: string
  ): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;

      const success = await DataSource.removeModel(providerId, modelType, modelName);
      
      if (success) {
        // 更新本地状态
        const provider = providers.value.find(p => p.id === providerId);
        if (provider) {
          const modelGroup = provider.supportedModels.find(g => g.type === modelType);
          if (modelGroup) {
            modelGroup.models = modelGroup.models.filter(m => m.name !== modelName);
          }
          
          // 如果删除的是选中的模型，从selectedModels中移除
          if (provider.activeModels && provider.activeModels[modelType]) {
            const typeState = provider.activeModels[modelType];
            const index = typeState.selectedModels.indexOf(modelName);
            if (index > -1) {
              typeState.selectedModels.splice(index, 1);
            }
            // 如果删除的是首选模型，清除首选模型
            if (typeState.preferredModel === modelName) {
              delete typeState.preferredModel;
            }
          }
        }

        console.log('✅ [LLM Store] 模型已删除:', providerId, modelType, modelName);
      }

      return success;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除模型失败';
      console.error('❌ [LLM Store] 删除模型失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * 添加模型到提供商
   */
  async function addModelToProvider(
    providerId: string,
    modelType: string,
    modelDetail: any // TODO: 使用ModelDetail类型
  ): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;

      const success = await DataSource.addModel(providerId, modelType, modelDetail);
      
      if (success) {
        // 更新本地状态
        const provider = providers.value.find(p => p.id === providerId);
        if (provider) {
          const modelGroup = provider.supportedModels.find(g => g.type === modelType);
          if (modelGroup) {
            modelGroup.models.push(modelDetail);
          } else {
            // 如果该类型不存在，创建新分组
            provider.supportedModels.push({
              type: modelType as any, // 类型断言，因为modelType是string
              models: [modelDetail]
            });
          }
        }

        console.log('✅ [LLM Store] 模型已添加:', providerId, modelType, modelDetail.name);
      }

      return success;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '添加模型失败';
      console.error('❌ [LLM Store] 添加模型失败:', err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  // ==================== 工具方法 ====================

  // getActiveModelInfo已废弃，现在首选模型保存在provider.activeModels中
  // 使用新的方法获取首选模型：
  function getPreferredModelInfo(modelType: string): { providerId: string; modelName: string } | null {
    for (const provider of providers.value) {
      if (provider.activeModels && provider.activeModels[modelType]) {
        const typeState = provider.activeModels[modelType];
        if (typeState.preferredModel) {
          return {
            providerId: provider.id,
            modelName: typeState.preferredModel
          };
        }
      }
    }
    return null;
  }

  function clearError() {
    error.value = null;
  }

  // ==================== 初始化 ====================

  async function initialize() {
    console.log('🚀 [LLM Store] 初始化开始');
    await loadProviders();
    console.log('✅ [LLM Store] 初始化完成');
  }

  return {
    // 状态
    providers,
    loading,
    error,
    modelRefreshStatus,
    lastRefreshTime,
    validationErrors,
    batchRefreshProgress,

    // 计算属性
    activeProviders,
    inactiveProviders,
    availableProviders,
    activeModelTypes,
    getProvidersByModelType,
    hasError,

    // 数据加载
    loadProviders,

    // 提供商管理
    activateProvider,
    deactivateProvider,
    updateProviderConfig,
    addProvider,
    removeProvider,

    // 提供商活动模型管理
    toggleModelSelection,
    setPreferredModel,
    isModelSelected,
    isPreferredModel,

    // 模型刷新
    refreshProviderModels,
    refreshAllProviders,

    // 验证与测试
    validateProvider,
    testProviderConnection,
    testNewProviderConnection,

    // 模型配置
    updateModelConfig,
    resetModelConfig,
    getEffectiveModelConfig,

    // 模型管理（新增）
    setModelDisplayName,
    removeModelFromProvider,
    addModelToProvider,

    // 配置导入导出
    exportConfig,
    importConfig,

    // 工具方法
    getPreferredModelInfo,
    clearError,
    initialize,
  };
});

