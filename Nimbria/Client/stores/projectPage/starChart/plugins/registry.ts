/**
 * 插件注册表
 * 管理所有布局插件的注册和获取
 */

import type { ILayoutPlugin, PluginMetadata } from './types'

export class PluginRegistry {
  private static plugins = new Map<string, ILayoutPlugin>()
  
  /**
   * 注册插件
   */
  static register(plugin: ILayoutPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[PluginRegistry] 插件 "${plugin.name}" 已存在，将被覆盖`)
    }
    
    this.plugins.set(plugin.name, plugin)
    console.log(`[PluginRegistry] 注册插件: ${plugin.displayName} (${plugin.name})`)
  }
  
  /**
   * 获取插件
   */
  static get(name: string): ILayoutPlugin | undefined {
    return this.plugins.get(name)
  }
  
  /**
   * 检查插件是否存在
   */
  static has(name: string): boolean {
    return this.plugins.has(name)
  }
  
  /**
   * 获取所有插件
   */
  static getAll(): ILayoutPlugin[] {
    return Array.from(this.plugins.values())
  }
  
  /**
   * 获取所有插件元数据
   */
  static getAllMetadata(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map(plugin => ({
      name: plugin.name,
      displayName: plugin.displayName,
      version: plugin.version,
      description: plugin.description,
      supportedDataFormats: plugin.supportedDataFormats
    }))
  }
  
  /**
   * 注销插件
   */
  static unregister(name: string): boolean {
    return this.plugins.delete(name)
  }
  
  /**
   * 清空所有插件
   */
  static clear(): void {
    this.plugins.clear()
  }
}

// 导出单例
export const pluginRegistry = PluginRegistry

