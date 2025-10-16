/**
 * 自定义页面统一API
 * 用于管理所有自定义页面的注册、打开、关闭等操作
 */

import { pageRegistry } from './PageRegistry'
import { customPageManager } from './CustomPageManager'
import type { CustomPageConfig, PageOpenOptions, PageFilter } from './types'

/**
 * 自定义页面统一API
 * 提供简洁的接口供外部使用
 */
export class CustomPageAPI {
  
  /**
   * 注册页面配置
   * @example
   * CustomPageAPI.register({
   *   id: 'test-page',
   *   name: 'UI测试页面',
   *   title: 'UI/UX Test Page',
   *   description: '综合UI组件测试页面',
   *   category: 'demo',
   *   icon: 'TestTube',
   *   component: () => import('@demo/TestPage'),
   *   tabType: 'testpage',
   *   showInDrawer: true
   * })
   */
  static register(config: CustomPageConfig) {
    pageRegistry.register(config)
  }
  
  /**
   * 批量注册页面
   */
  static registerAll(configs: CustomPageConfig[]) {
    pageRegistry.registerAll(configs)
  }
  
  /**
   * 打开页面到分屏系统
   * @example
   * await CustomPageAPI.open('test-page')
   * await CustomPageAPI.open('tool-page', { paneId: 'specific-pane', params: { mode: 'debug' } })
   */
  static async open(pageId: string, options?: PageOpenOptions) {
    return customPageManager.openPage(pageId, options)
  }
  
  /**
   * 关闭页面实例
   */
  static close(instanceId: string) {
    return customPageManager.closePage(instanceId)
  }
  
  /**
   * 关闭页面的所有实例
   */
  static closeAll(pageId: string) {
    return customPageManager.closeAllPageInstances(pageId)
  }
  
  /**
   * 获取所有可用页面
   */
  static getAvailablePages() {
    return pageRegistry.getAll()
  }
  
  /**
   * 根据过滤条件获取页面
   */
  static getPagesByFilter(filter: PageFilter) {
    return pageRegistry.getByFilter(filter)
  }
  
  /**
   * 获取导航栏显示的页面
   */
  static getNavbarPages() {
    return pageRegistry.getByFilter({ showInNavbar: true })
  }
  
  /**
   * 获取抽屉显示的页面
   */
  static getDrawerPages() {
    return pageRegistry.getByFilter({ showInDrawer: true })
  }
  
  /**
   * 获取菜单显示的页面
   */
  static getMenuPages() {
    return pageRegistry.getByFilter({ showInMenu: true })
  }
  
  /**
   * 根据分类获取页面
   */
  static getPagesByCategory(category: string) {
    return pageRegistry.getByFilter({ category })
  }
  
  /**
   * 搜索页面
   */
  static search(query: string) {
    return pageRegistry.search(query)
  }
  
  /**
   * 获取所有分类
   */
  static getCategories() {
    return pageRegistry.getCategories()
  }
  
  /**
   * 获取活跃实例
   */
  static getActiveInstances() {
    return customPageManager.getActiveInstances()
  }
  
  /**
   * 检查页面是否已打开
   */
  static isPageOpen(pageId: string) {
    return customPageManager.findInstanceByPageId(pageId) !== undefined
  }
  
  /**
   * 根据标签页ID查找实例
   */
  static findInstanceByTabId(tabId: string) {
    return customPageManager.findInstanceByTabId(tabId)
  }
  
  /**
   * 获取页面注册统计
   */
  static getRegistryStats() {
    return pageRegistry.getStats()
  }
  
  /**
   * 获取实例统计
   */
  static getInstanceStats() {
    return customPageManager.getInstanceStats()
  }
  
  /**
   * 更新实例活跃时间
   */
  static updateActivity(instanceId: string) {
    return customPageManager.updateInstanceActivity(instanceId)
  }
  
  /**
   * 获取特定页面的配置
   */
  static getPageConfig(pageId: string) {
    return pageRegistry.get(pageId)
  }
  
  /**
   * 检查页面是否存在
   */
  static hasPage(pageId: string) {
    return pageRegistry.get(pageId) !== undefined
  }
  
  /**
   * 开发调试方法：列出所有页面信息
   */
  static debug() {
    console.group('[CustomPageAPI] Debug Info')
    console.log('Registry Stats:', this.getRegistryStats())
    console.log('Instance Stats:', this.getInstanceStats())
    console.log('All Pages:', this.getAvailablePages())
    console.log('Active Instances:', this.getActiveInstances())
    console.groupEnd()
  }
}
