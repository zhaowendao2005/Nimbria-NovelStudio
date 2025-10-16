/**
 * 通用页面注册表
 * 管理所有自定义页面的注册、查询、过滤等功能
 */

import type { CustomPageConfig, PageFilter } from './types'

class PageRegistry {
  private pages = new Map<string, CustomPageConfig>()
  private categories = new Set<string>()
  
  /**
   * 注册自定义页面
   */
  register(config: CustomPageConfig) {
    if (this.pages.has(config.id)) {
      console.warn(`[PageRegistry] Page '${config.id}' already registered, overwriting`)
    }
    
    // 设置默认值
    const finalConfig: CustomPageConfig = {
      singleton: true,
      closable: true,
      draggable: true,
      showInDrawer: false,
      showInNavbar: false,
      showInMenu: false,
      devOnly: false,
      ...config
    }
    
    this.pages.set(config.id, finalConfig)
    this.categories.add(config.category)
    
    console.log(`[PageRegistry] Registered page: ${config.id} (${config.category})`)
  }
  
  /**
   * 批量注册
   */
  registerAll(configs: CustomPageConfig[]) {
    configs.forEach(config => this.register(config))
  }
  
  /**
   * 获取页面配置
   */
  get(id: string): CustomPageConfig | undefined {
    return this.pages.get(id)
  }
  
  /**
   * 获取所有页面
   */
  getAll(): CustomPageConfig[] {
    return Array.from(this.pages.values())
  }
  
  /**
   * 根据过滤条件获取页面
   */
  getByFilter(filter: PageFilter): CustomPageConfig[] {
    return this.getAll().filter(page => {
      // 开发模式过滤
      if (filter.devOnly !== undefined) {
        const isDev = this.isDevelopmentMode()
        if (page.devOnly && !isDev) return false
        if (filter.devOnly && !page.devOnly) return false
      }
      
      // 分类过滤
      if (filter.category && page.category !== filter.category) return false
      
      // 显示位置过滤
      if (filter.showInDrawer !== undefined && page.showInDrawer !== filter.showInDrawer) return false
      if (filter.showInNavbar !== undefined && page.showInNavbar !== filter.showInNavbar) return false
      if (filter.showInMenu !== undefined && page.showInMenu !== filter.showInMenu) return false
      
      // 标签过滤
      if (filter.tags?.length && !filter.tags.some(tag => page.tags?.includes(tag))) return false
      
      return true
    })
  }
  
  /**
   * 获取所有分类
   */
  getCategories(): string[] {
    return Array.from(this.categories)
  }
  
  /**
   * 搜索页面
   */
  search(query: string): CustomPageConfig[] {
    if (!query.trim()) return this.getAll()
    
    const lowercaseQuery = query.toLowerCase()
    return this.getAll().filter(page => 
      page.name.toLowerCase().includes(lowercaseQuery) ||
      page.title.toLowerCase().includes(lowercaseQuery) ||
      page.description?.toLowerCase().includes(lowercaseQuery) ||
      page.category.toLowerCase().includes(lowercaseQuery) ||
      page.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    )
  }
  
  /**
   * 获取特定显示位置的页面数量
   */
  getStats() {
    const all = this.getAll()
    return {
      total: all.length,
      categories: this.categories.size,
      inDrawer: all.filter(p => p.showInDrawer).length,
      inNavbar: all.filter(p => p.showInNavbar).length,
      inMenu: all.filter(p => p.showInMenu).length,
      devOnly: all.filter(p => p.devOnly).length
    }
  }
  
  // ==================== 私有方法 ====================
  
  private isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.DEV === 'true'
  }
}

export const pageRegistry = new PageRegistry()
