import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * Settings Store
 * 管理应用程序设置相关的状态
 */
export const useSettingsStore = defineStore('settings', () => {
  // ==================== AI 配置 ====================
  const aiConfig = ref({
    apiEndpoint: '',
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7
  })

  // ==================== 主题配置 ====================
  const themeConfig = ref({
    mode: 'light' as 'light' | 'dark',
    primaryColor: '#1976D2'
  })

  // ==================== 缓存管理 ====================
  
  /**
   * 获取所有 localStorage 数据
   */
  function getAllCacheData(): Record<string, string> {
    const data: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        data[key] = localStorage.getItem(key) || ''
      }
    }
    return data
  }

  /**
   * 计算缓存总大小（字节）
   */
  function getCacheSizeInBytes(): number {
    // 如果 localStorage 为空，直接返回 0
    if (localStorage.length === 0) {
      return 0
    }
    
    const data = getAllCacheData()
    // 计算实际数据大小（key + value）
    let totalBytes = 0
    Object.entries(data).forEach(([key, value]) => {
      totalBytes += key.length + value.length
    })
    return totalBytes
  }

  /**
   * 格式化显示缓存大小
   */
  const formattedCacheSize = computed(() => {
    const bytes = getCacheSizeInBytes()
    if (bytes === 0) return '0 B'  // 明确处理 0 的情况
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  })

  /**
   * 获取各个模块的缓存大小
   */
  function getModuleCacheItems() {
    const data = getAllCacheData()
    const keys = Object.keys(data)
    const items = []

    // 分屏布局缓存
    const paneKeys = keys.filter(k => k.includes('pane'))
    if (paneKeys.length > 0) {
      items.push({
        key: 'pane',
        name: '分屏布局',
        icon: 'view_column',
        size: calculateModuleSize(paneKeys, data)
      })
    }

    // Markdown 编辑器缓存
    const markdownKeys = keys.filter(k => k.includes('markdown'))
    if (markdownKeys.length > 0) {
      items.push({
        key: 'markdown',
        name: 'Markdown编辑器',
        icon: 'edit_note',
        size: calculateModuleSize(markdownKeys, data)
      })
    }

    // 项目页面状态缓存
    const projectPageKeys = keys.filter(k => k.includes('project') && !k.includes('recentProjects'))
    if (projectPageKeys.length > 0) {
      items.push({
        key: 'projectPage',
        name: '项目页面状态',
        icon: 'article',
        size: calculateModuleSize(projectPageKeys, data)
      })
    }

    // 最近项目列表
    const recentProjectsKey = keys.find(k => k.includes('recentProjects'))
    if (recentProjectsKey) {
      items.push({
        key: 'recentProjects',
        name: '最近项目列表',
        icon: 'history',
        size: calculateModuleSize([recentProjectsKey], data)
      })
    }

    // 其他缓存
    const otherKeys = keys.filter(k => 
      !k.includes('pane') && 
      !k.includes('markdown') && 
      !k.includes('project')
    )
    if (otherKeys.length > 0) {
      items.push({
        key: 'other',
        name: '其他数据',
        icon: 'folder',
        size: calculateModuleSize(otherKeys, data)
      })
    }

    return items
  }

  /**
   * 计算指定模块的缓存大小
   */
  function calculateModuleSize(keys: string[], data: Record<string, string>): string {
    let totalBytes = 0
    keys.forEach(key => {
      totalBytes += (data[key]?.length || 0)
    })

    if (totalBytes < 1024) return `${totalBytes} B`
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(2)} KB`
    return `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
  }

  /**
   * 清空所有缓存
   */
  function clearAllCache() {
    console.log('💾 [Settings Store] 执行 localStorage.clear()...')
    const beforeCount = localStorage.length
    
    localStorage.clear()
    
    const afterCount = localStorage.length
    console.log(`💾 [Settings Store] localStorage 已清空`)
    console.log(`   清理前: ${beforeCount} 项`)
    console.log(`   清理后: ${afterCount} 项`)
    
    if (afterCount === 0) {
      console.log(`✅ [Settings Store] localStorage 清理验证通过`)
    } else {
      console.warn(`⚠️  [Settings Store] localStorage 仍有 ${afterCount} 项残留`)
    }
  }

  return {
    // AI 配置
    aiConfig,
    
    // 主题配置
    themeConfig,
    
    // 缓存管理
    formattedCacheSize,
    getAllCacheData,
    getCacheSizeInBytes,
    getModuleCacheItems,
    clearAllCache
  }
})

