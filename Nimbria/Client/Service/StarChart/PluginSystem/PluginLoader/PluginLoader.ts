/**
 * PluginLoader - 动态插件加载器
 * 
 * 职责：
 * - ES 模块动态导入
 * - 插件文件扫描
 * - 热重载支持
 * - 加载错误处理
 */

import type { StarChartPlugin } from 'Business/StarChart'
import { PluginRegistry } from '../PluginRegistry/PluginRegistry'

interface LoadedPlugin {
  plugin: StarChartPlugin
  module: any
  path: string
  loadedAt: number
}

interface LoadOptions {
  parallel?: boolean
  timeout?: number
  retry?: number
}

export class PluginLoader {
  private registry: PluginRegistry
  private loadedPlugins: Map<string, LoadedPlugin> = new Map()
  private loading: Set<string> = new Set()
  private readonly defaultTimeout: number = 5000

  constructor(registry: PluginRegistry) {
    this.registry = registry
  }

  /**
   * 加载单个插件
   */
  async loadPlugin(
    moduleOrPath: (() => Promise<any>) | string,
    options: LoadOptions = {}
  ): Promise<StarChartPlugin | null> {
    const timeout = options.timeout ?? this.defaultTimeout

    try {
      const startTime = performance.now()

      // 处理动态导入
      let module: any

      if (typeof moduleOrPath === 'function') {
        // 已经是导入函数
        module = await this.withTimeout(moduleOrPath(), timeout)
      } else {
        // 字符串路径，使用 import()
        module = await this.withTimeout(import(moduleOrPath), timeout)
      }

      // 获取导出的插件（支持 default 导出或 named 导出）
      const plugin = module.default ?? Object.values(module).find(v => this.isPlugin(v))

      if (!plugin) {
        console.error('[PluginLoader] No valid plugin exported')
        return null
      }

      // 验证插件接口
      if (!this.validatePlugin(plugin)) {
        console.error('[PluginLoader] Invalid plugin interface')
        return null
      }

      // 注册插件
      const registered = this.registry.register(plugin)
      if (!registered) {
        return null
      }

      const loadTime = performance.now() - startTime
      this.loadedPlugins.set(plugin.id, {
        plugin,
        module,
        path: typeof moduleOrPath === 'string' ? moduleOrPath : 'dynamic',
        loadedAt: Date.now()
      })

      this.registry.markInstalled(plugin.id, loadTime)

      console.log(
        `[PluginLoader] Loaded plugin: ${plugin.name} (${loadTime.toFixed(2)}ms)`
      )

      return plugin
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[PluginLoader] Failed to load plugin: ${errorMsg}`)

      return null
    }
  }

  /**
   * 批量加载插件
   */
  async loadPlugins(
    modules: Array<(() => Promise<any>) | string>,
    options: LoadOptions = {}
  ): Promise<StarChartPlugin[]> {
    const parallel = options.parallel ?? true
    const loadedPlugins: StarChartPlugin[] = []

    if (parallel) {
      const results = await Promise.all(
        modules.map(m =>
          this.loadPlugin(m, options).catch(err => {
            console.error('[PluginLoader] Batch load error:', err)
            return null
          })
        )
      )

      return results.filter((p): p is StarChartPlugin => p !== null)
    } else {
      // 顺序加载
      for (const module of modules) {
        const plugin = await this.loadPlugin(module, options)
        if (plugin) {
          loadedPlugins.push(plugin)
        }
      }

      return loadedPlugins
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const loaded = this.loadedPlugins.get(pluginId)
    if (!loaded) {
      console.warn(`[PluginLoader] Plugin ${pluginId} not loaded`)
      return false
    }

    try {
      // 调用插件卸载钩子
      if (loaded.plugin.uninstall) {
        await loaded.plugin.uninstall()
      }

      this.loadedPlugins.delete(pluginId)
      this.registry.unregister(pluginId)

      console.log(`[PluginLoader] Unloaded plugin: ${pluginId}`)

      return true
    } catch (error) {
      console.error(`[PluginLoader] Error unloading plugin: ${error}`)
      return false
    }
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(
    pluginId: string,
    moduleOrPath: (() => Promise<any>) | string,
    options: LoadOptions = {}
  ): Promise<StarChartPlugin | null> {
    await this.unloadPlugin(pluginId)
    return this.loadPlugin(moduleOrPath, options)
  }

  /**
   * 获取已加载的插件
   */
  getLoadedPlugins(): StarChartPlugin[] {
    return Array.from(this.loadedPlugins.values()).map(p => p.plugin)
  }

  /**
   * 获取加载统计
   */
  getStats(): {
    total: number
    loaded: number
    loading: number
    avgLoadTime: number
  } {
    let totalLoadTime = 0
    let count = 0

    this.loadedPlugins.forEach(p => {
      const metadata = this.registry.getMetadata(p.plugin.id)
      if (metadata?.loadTime) {
        totalLoadTime += metadata.loadTime
        count++
      }
    })

    return {
      total: this.registry.getAll().length,
      loaded: this.loadedPlugins.size,
      loading: this.loading.size,
      avgLoadTime: count > 0 ? totalLoadTime / count : 0
    }
  }

  // ============ 私有方法 ============

  /**
   * 带超时的异步操作
   */
  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeoutPromise = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${ms}ms`)), ms)
    )

    return Promise.race([promise, timeoutPromise])
  }

  /**
   * 验证是否为有效的插件
   */
  private isPlugin(obj: any): obj is StarChartPlugin {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.version === 'string' &&
      typeof obj.type === 'string' &&
      typeof obj.install === 'function'
    )
  }

  /**
   * 验证插件接口完整性
   */
  private validatePlugin(plugin: StarChartPlugin): boolean {
    // 必需字段
    if (!plugin.id || !plugin.name || !plugin.version || !plugin.type) {
      console.error('[PluginLoader] Missing required plugin fields')
      return false
    }

    // 必需方法
    if (typeof plugin.install !== 'function') {
      console.error('[PluginLoader] Plugin must have install method')
      return false
    }

    // 可选方法
    if (plugin.uninstall && typeof plugin.uninstall !== 'function') {
      console.error('[PluginLoader] Plugin uninstall must be a function')
      return false
    }

    return true
  }
}
