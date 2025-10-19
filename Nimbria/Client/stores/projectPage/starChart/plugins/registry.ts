/**
 * 插件注册表
 * 管理所有布局插件的注册和获取
 * 
 * 重构说明：
 * - 插件生命周期管理：自动初始化插件资源（自定义边、节点等）
 * - Graph 实例管理：统一管理 G6 实例与插件的关联
 * - 配置合并：提供插件配置的统一获取接口
 */

import type { ILayoutPlugin, PluginMetadata } from './types'

export class PluginRegistry {
  private static plugins = new Map<string, ILayoutPlugin>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static graphInstance: any | null = null
  private static containerElement: HTMLElement | null = null
  
  /**
   * 注册插件
   * 如果 Graph 实例已存在，立即初始化插件
   */
  static register(plugin: ILayoutPlugin): void {
    if (this.plugins.has(plugin.name)) {
      console.warn(`[PluginRegistry] 插件 "${plugin.name}" 已存在，将被覆盖`)
    }
    
    this.plugins.set(plugin.name, plugin)
    console.log(`[PluginRegistry] 注册插件: ${plugin.displayName} (${plugin.name})`)
    
    // 如果 Graph 实例已存在，立即初始化此插件
    if (this.graphInstance && this.containerElement) {
      void this.initializePlugin(plugin, this.graphInstance, this.containerElement)
    }
  }
  
  /**
   * 设置 Graph 实例并初始化所有插件
   * 在 Graph 实例创建后由 ViewPort 调用
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static setGraphInstance(graph: any, container: HTMLElement): void {
    this.graphInstance = graph
    this.containerElement = container
    
    console.log(`[PluginRegistry] 设置 Graph 实例，初始化 ${this.plugins.size} 个插件`)
    
    // 初始化所有已注册的插件
    this.plugins.forEach(plugin => {
      void this.initializePlugin(plugin, graph, container)
    })
  }
  
  /**
   * 初始化单个插件
   * 注册插件的自定义元素（边、节点）并调用生命周期钩子
   */
  private static async initializePlugin(
    plugin: ILayoutPlugin,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: any,
    container: HTMLElement
  ): Promise<void> {
    try {
      console.log(`[PluginRegistry] 初始化插件: ${plugin.name}`)
      
      // 1. 注册自定义边
      const customEdges = plugin.getCustomEdges?.()
      if (customEdges && Object.keys(customEdges).length > 0) {
        Object.entries(customEdges).forEach(([edgeType, EdgeClass]) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const G6 = graph.constructor as any
            const edgeInstance = new EdgeClass()
            
            // 尝试多种注册方式以兼容不同版本
            if (typeof G6.registerEdge === 'function') {
              G6.registerEdge(edgeType, edgeInstance, 'line')
              console.log(`[PluginRegistry] ✅ 插件 ${plugin.name} 注册边: ${edgeType} (registerEdge)`)
            } else if (typeof G6.extend === 'function') {
              G6.extend(edgeType, edgeInstance, 'line')
              console.log(`[PluginRegistry] ✅ 插件 ${plugin.name} 注册边: ${edgeType} (extend)`)
            } else {
              console.warn(`[PluginRegistry] ⚠️ 无法注册边 ${edgeType}，G6 不支持 registerEdge 或 extend`)
            }
          } catch (error) {
            console.error(`[PluginRegistry] ❌ 插件 ${plugin.name} 注册边 ${edgeType} 失败:`, error)
          }
        })
      }
      
      // 2. 注册自定义节点
      const customNodes = plugin.getCustomNodes?.()
      if (customNodes && Object.keys(customNodes).length > 0) {
        Object.entries(customNodes).forEach(([nodeType, NodeClass]) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const G6 = graph.constructor as any
            const nodeInstance = new NodeClass()
            
            if (typeof G6.registerNode === 'function') {
              G6.registerNode(nodeType, nodeInstance, 'circle')
              console.log(`[PluginRegistry] ✅ 插件 ${plugin.name} 注册节点: ${nodeType}`)
            } else if (typeof G6.extend === 'function') {
              G6.extend(nodeType, nodeInstance, 'circle')
              console.log(`[PluginRegistry] ✅ 插件 ${plugin.name} 注册节点: ${nodeType} (extend)`)
            } else {
              console.warn(`[PluginRegistry] ⚠️ 无法注册节点 ${nodeType}`)
            }
          } catch (error) {
            console.error(`[PluginRegistry] ❌ 插件 ${plugin.name} 注册节点 ${nodeType} 失败:`, error)
          }
        })
      }
      
      // 3. 调用插件的初始化钩子
      if (plugin.onGraphCreated) {
        await plugin.onGraphCreated(graph, container)
        console.log(`[PluginRegistry] ✅ 插件 ${plugin.name} onGraphCreated 完成`)
      }
      
    } catch (error) {
      console.error(`[PluginRegistry] ❌ 插件 ${plugin.name} 初始化失败:`, error)
    }
  }
  
  /**
   * 获取插件合并后的 Graph 配置
   * 在创建 Graph 实例时调用
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static getMergedGraphConfig(pluginName: string): Record<string, any> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      console.warn(`[PluginRegistry] 插件 "${pluginName}" 不存在，返回空配置`)
      return {}
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: Record<string, any> = {}
    
    // 如果插件需要树结构支持
    if (plugin.requiresTreeStructure) {
      config.treeKey = 'tree'
      console.log(`[PluginRegistry] 插件 ${pluginName} 需要树结构支持，添加 treeKey`)
    }
    
    // 合并插件特定配置
    if (plugin.getGraphConfig) {
      const pluginConfig = plugin.getGraphConfig()
      Object.assign(config, pluginConfig)
      console.log(`[PluginRegistry] 插件 ${pluginName} 提供自定义配置:`, pluginConfig)
    }
    
    return config
  }
  
  /**
   * 清理所有插件资源
   * 在组件卸载时调用
   */
  static async cleanup(): Promise<void> {
    console.log(`[PluginRegistry] 开始清理 ${this.plugins.size} 个插件资源`)
    
    const cleanupPromises: Promise<void>[] = []
    
    this.plugins.forEach(plugin => {
      if (plugin.onDestroy) {
        const result = plugin.onDestroy()
        if (result instanceof Promise) {
          cleanupPromises.push(result)
        }
      }
    })
    
    await Promise.all(cleanupPromises)
    
    this.graphInstance = null
    this.containerElement = null
    
    console.log(`[PluginRegistry] ✅ 插件资源清理完成`)
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
    const plugin = this.plugins.get(name)
    if (plugin && plugin.onDestroy) {
      void plugin.onDestroy()
    }
    return this.plugins.delete(name)
  }
  
  /**
   * 清空所有插件
   */
  static clear(): void {
    void this.cleanup()
    this.plugins.clear()
  }
}

// 导出单例
export const pluginRegistry = PluginRegistry

