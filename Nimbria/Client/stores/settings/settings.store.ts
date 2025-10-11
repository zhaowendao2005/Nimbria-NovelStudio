import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Settings Store
 * 管理应用程序的通用设置
 * 
 * 注意：缓存管理已拆分到 settings.cache.store.ts
 *       LLM配置已拆分到 settings.llm.store.ts
 */
export const useSettingsStore = defineStore('settings', () => {
  // ==================== AI 配置 ====================
  // TODO: 未来实现AI相关配置功能
  const aiConfig = ref({
    apiEndpoint: '',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7
  })

  // ==================== 主题配置 ====================
  // TODO: 未来实现主题配置功能
  const themeConfig = ref({
    mode: 'light' as 'light' | 'dark',
    primaryColor: '#1976D2'
  })

  return {
    // AI 配置
    aiConfig,
    
    // 主题配置
    themeConfig,
  }
})
