/**
 * 核心页面管理器
 * 负责页面的打开、关闭、实例管理等核心功能
 */

import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import { ElMessage } from 'element-plus'
import { pageRegistry } from './PageRegistry'
import type { CustomPageConfig, PageOpenOptions, CustomPageInstance } from './types'
import type { MarkdownTab } from '@stores/projectPage/Markdown'

class CustomPageManager {
  private instances = new Map<string, CustomPageInstance>()
  
  /**
   * 打开自定义页面
   */
  openPage(
    pageId: string, 
    options: PageOpenOptions = {}
  ): CustomPageInstance | null {
    console.log(`[CustomPageManager] Attempting to open page: ${pageId}`)
    console.log(`[CustomPageManager] Registered pages:`, pageRegistry.getAll().map(p => p.id))
    
    const config = pageRegistry.get(pageId)
    if (!config) {
      const errorMsg = `未找到页面配置: ${pageId}`
      ElMessage({ type: 'error', message: errorMsg })
      console.error(`[CustomPageManager] Page config not found: ${pageId}`)
      console.error(`[CustomPageManager] Available pages:`, pageRegistry.getAll().map(p => ({ id: p.id, name: p.name })))
      return null
    }
    
    console.log(`[CustomPageManager] Found page config:`, config.name)
    
    // 检查开发模式权限
    if (config.devOnly && !this.isDevelopmentMode()) {
      ElMessage({ type: 'warning', message: '该页面仅在开发模式下可用' })
      return null
    }
    
    try {
      // 检查是否为单例且已存在
      if (config.singleton && !options.forceNew) {
        const existingInstance = this.findInstanceByPageId(pageId)
        if (existingInstance) {
          console.log(`[CustomPageManager] Found existing instance, attempting to focus:`, existingInstance.id)
          const focused = this.focusInstance(existingInstance)
          if (focused) {
            return focused  // ✅ 成功激活现有实例
          }
          // ⚠️ focused为null说明实例已失效，继续创建新实例
          console.log(`[CustomPageManager] Existing instance invalid, creating new one`)
        }
      }
      
      // 创建标签页
      const tab = this.createTab(config)
      if (!tab) {
        ElMessage({ type: 'error', message: `无法创建标签页: ${config.name}` })
        return null
      }
      
      // 确保有可用的面板
      const paneId = this.ensurePane(options.paneId)
      if (!paneId) {
        ElMessage({ type: 'error', message: '无法找到或创建分屏面板' })
        return null
      }
      
      // 在面板中打开标签页
      const paneLayoutStore = usePaneLayoutStore()
      paneLayoutStore.openTabInPane(paneId, tab.id)
      
      // 创建实例记录
      const now = new Date()
      const instance: CustomPageInstance = {
        id: `${pageId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        config,
        tabId: tab.id,
        paneId,
        params: options.params || {},
        createdAt: now,
        lastActiveAt: now
      }
      
      this.instances.set(instance.id, instance)
      
      // 聚焦到标签页
      if (options.focus !== false) {
        const markdownStore = useMarkdownStore()
        markdownStore.activeTabId = tab.id
      }
      
      ElMessage({ type: 'success', message: `已打开: ${config.name}` })
      console.log(`[CustomPageManager] Page opened:`, instance)
      
      return instance
      
    } catch (error) {
      ElMessage({ type: 'error', message: `打开页面失败: ${error}` })
      console.error(`[CustomPageManager] Failed to open page:`, error)
      return null
    }
  }
  
  /**
   * 关闭页面实例
   */
  closePage(instanceId: string): boolean {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      console.warn(`[CustomPageManager] Instance not found: ${instanceId}`)
      return false
    }
    
    if (!instance.config.closable) {
      ElMessage({ type: 'warning', message: '该页面不允许关闭' })
      return false
    }
    
    try {
      // 关闭标签页
      const markdownStore = useMarkdownStore()
      const tabIndex = markdownStore.openTabs.findIndex(tab => tab.id === instance.tabId)
      if (tabIndex !== -1) {
        markdownStore.openTabs.splice(tabIndex, 1)
      }
      
      // 移除实例记录
      this.instances.delete(instanceId)
      
      console.log(`[CustomPageManager] Page closed: ${instanceId}`)
      ElMessage({ type: 'success', message: `已关闭: ${instance.config.name}` })
      return true
      
    } catch (error) {
      console.error(`[CustomPageManager] Failed to close page:`, error)
      return false
    }
  }
  
  /**
   * 关闭页面的所有实例
   */
  closeAllPageInstances(pageId: string): number {
    const instances = Array.from(this.instances.values()).filter(
      instance => instance.config.id === pageId
    )
    
    let closedCount = 0
    instances.forEach(instance => {
      if (this.closePage(instance.id)) {
        closedCount++
      }
    })
    
    return closedCount
  }
  
  /**
   * 获取所有活跃实例
   */
  getActiveInstances(): CustomPageInstance[] {
    return Array.from(this.instances.values())
  }
  
  /**
   * 根据页面ID查找实例
   */
  findInstanceByPageId(pageId: string): CustomPageInstance | undefined {
    return Array.from(this.instances.values()).find(
      instance => instance.config.id === pageId
    )
  }
  
  /**
   * 根据标签页ID查找实例
   */
  findInstanceByTabId(tabId: string): CustomPageInstance | undefined {
    return Array.from(this.instances.values()).find(
      instance => instance.tabId === tabId
    )
  }
  
  /**
   * 更新实例活跃时间
   */
  updateInstanceActivity(instanceId: string) {
    const instance = this.instances.get(instanceId)
    if (instance) {
      instance.lastActiveAt = new Date()
    }
  }
  
  /**
   * 获取实例统计信息
   */
  getInstanceStats() {
    const instances = this.getActiveInstances()
    const categoryCount = new Map<string, number>()
    
    instances.forEach(instance => {
      const category = instance.config.category
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1)
    })
    
    return {
      total: instances.length,
      byCategory: Object.fromEntries(categoryCount),
      oldest: instances.length > 0 ? instances.reduce((oldest, current) => 
        oldest.createdAt < current.createdAt ? oldest : current
      ) : null,
      newest: instances.length > 0 ? instances.reduce((newest, current) => 
        newest.createdAt > current.createdAt ? newest : current
      ) : null
    }
  }
  
  // ==================== 私有方法 ====================
  
  private createTab(config: CustomPageConfig): MarkdownTab | null {
    const markdownStore = useMarkdownStore()
    
    const newTab: MarkdownTab = {
      id: `${config.tabType}-${Date.now()}`,
      type: config.tabType as any,
      filePath: '',
      fileName: config.title,
      content: '',
      mode: 'edit',
      isDirty: false
    }
    
    markdownStore.openTabs.push(newTab)
    console.log(`[CustomPageManager] Tab created:`, newTab.id)
    
    return newTab
  }
  
  private ensurePane(preferredPaneId?: string): string | null {
    const paneLayoutStore = usePaneLayoutStore()
    
    // 如果指定了面板ID，检查是否存在
    if (preferredPaneId) {
      const pane = paneLayoutStore.allLeafPanes.find(p => p.id === preferredPaneId)
      if (pane) {
        return preferredPaneId
      }
    }
    
    // 使用当前焦点面板
    if (paneLayoutStore.focusedPane) {
      return paneLayoutStore.focusedPane.id
    }
    
    // 创建默认面板
    console.log('[CustomPageManager] No pane exists, creating default layout')
    paneLayoutStore.resetToDefaultLayout()
    
    // 重新获取焦点面板（resetToDefaultLayout后应该有了）
    const focusedPane = paneLayoutStore.focusedPane
    if (focusedPane) {
      return focusedPane.id
    }
    
    console.error('[CustomPageManager] Failed to create default layout')
    return null
  }
  
  private focusInstance(instance: CustomPageInstance): CustomPageInstance | null {
    const markdownStore = useMarkdownStore()
    const paneLayoutStore = usePaneLayoutStore()
    
    // 🔥 验证tab是否还存在
    const tabExists = markdownStore.openTabs.some(tab => tab.id === instance.tabId)
    if (!tabExists) {
      console.warn(`[CustomPageManager] Instance tab not found, cleaning up zombie instance:`, instance.id)
      this.instances.delete(instance.id)
      return null  // 返回null，让调用者重新创建
    }
    
    // 🔥 验证pane是否还存在
    const paneExists = paneLayoutStore.allLeafPanes.some(p => p.id === instance.paneId)
    if (!paneExists) {
      console.warn(`[CustomPageManager] Instance pane not found, cleaning up zombie instance:`, instance.id)
      this.instances.delete(instance.id)
      return null
    }
    
    // 一切正常，激活实例
    markdownStore.activeTabId = instance.tabId
    this.updateInstanceActivity(instance.id)
    
    ElMessage({ type: 'info', message: `已切换到: ${instance.config.name}` })
    console.log(`[CustomPageManager] Focused to existing instance:`, instance.id)
    
    return instance
  }
  
  private isDevelopmentMode(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.DEV === 'true'
  }
}

export const customPageManager = new CustomPageManager()
