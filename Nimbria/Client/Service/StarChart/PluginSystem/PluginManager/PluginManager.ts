/**
 * PluginManager - 插件管理器统一入口
 * 
 * 职责：
 * - 统合所有插件系统服务
 * - 提供简化的插件管理 API
 * - 插件预设管理
 * - 插件生命周期协调
 */

import type { StarChartPlugin, StarChartCoreAPI, StarChartConfig } from 'Business/StarChart'
import { PluginRegistry } from '../PluginRegistry/PluginRegistry'
import { PluginLoader } from '../PluginLoader/PluginLoader'
import { DependencyResolver } from '../DependencyResolver/DependencyResolver'
import { PluginContext } from '../PluginContext/PluginContext'

interface PluginPreset {
  name: string
  description: string
  plugins: Array<() => Promise<any>>
}

interface LoadPresetOptions {
  parallel?: boolean
  timeout?: number
  autoResolve?: boolean
}

export class PluginManager {
  private registry: PluginRegistry
  private loader: PluginLoader
  private resolver: DependencyResolver
  private core: StarChartCoreAPI
  private config: StarChartConfig
  private pluginContexts: Map<string, PluginContext> = new Map()
  private presets: Map<string, PluginPreset> = new Map()
  private initialized: boolean = false

  constructor(core: StarChartCoreAPI, config: StarChartConfig) {
    this.core = core
    this.config = config
    this.registry = new PluginRegistry()
    this.loader = new PluginLoader(this.registry)
    this.resolver = new DependencyResolver(this.registry)
  }

  /**
   * 初始化插件系统
   */
  async initialize(): Promise<void> {
    this.initialized = true
    console.log('[PluginManager] Plugin system initialized')
  }

  /**
   * 加载插件
   */
  async loadPlugin(
    moduleOrPath: (() => Promise<any>) | string,
    options?: { timeout?: number }
  ): Promise<boolean> {
    const plugin = await this.loader.loadPlugin(moduleOrPath, options)

    if (plugin && this.shouldInstall(plugin)) {
      return this.installPlugin(plugin)
    }

    return plugin !== null
  }

  /**
   * 批量加载插件
   */
  async loadPlugins(
    modules: Array<(() => Promise<any>) | string>,
    parallel: boolean = true
  ): Promise<StarChartPlugin[]> {
    return this.loader.loadPlugins(modules, { parallel })
  }

  /**
   * 加载插件预设
   */
  async loadPreset(presetName: string, options: LoadPresetOptions = {}): Promise<boolean> {
    const preset = this.presets.get(presetName)
    if (!preset) {
      console.error(`[PluginManager] Preset ${presetName} not found`)
      return false
    }

    console.log(`[PluginManager] Loading preset: ${presetName}`)

    const plugins = await this.loadPlugins(preset.plugins, options.parallel !== false)

    if (options.autoResolve !== false) {
      this.resolver.buildGraph(this.registry.getAll())
      const result = this.resolver.resolveOrder()

      if (!result.success) {
        console.error('[PluginManager] Failed to resolve plugin dependencies', {
          circular: result.circular,
          missing: result.missing
        })
        return false
      }
    }

    console.log(`[PluginManager] Loaded ${plugins.length} plugins from preset: ${presetName}`)

    return plugins.length > 0
  }

  /**
   * 安装插件
   */
  async installPlugin(plugin: StarChartPlugin): Promise<boolean> {
    try {
      const context = new PluginContext(
        plugin.id,
        this.core,
        this.config,
        ['*'] // 默认权限
      )

      this.pluginContexts.set(plugin.id, context)

      // 调用插件的 install 方法
      await plugin.install(context)

      console.log(`[PluginManager] Installed plugin: ${plugin.name}`)

      return true
    } catch (error) {
      console.error(`[PluginManager] Failed to install plugin: ${error}`)
      this.registry.markError(plugin.id, String(error))
      return false
    }
  }

  /**
   * 卸载插件
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.registry.getPlugin(pluginId)
    if (!plugin) {
      console.warn(`[PluginManager] Plugin ${pluginId} not found`)
      return false
    }

    // 调用插件的 uninstall 方法
    if (plugin.uninstall) {
      try {
        await plugin.uninstall()
      } catch (error) {
        console.error(`[PluginManager] Error uninstalling plugin: ${error}`)
      }
    }

    // 清理上下文
    const context = this.pluginContexts.get(pluginId)
    if (context) {
      context.destroy()
      this.pluginContexts.delete(pluginId)
    }

    // 卸载
    return this.loader.unloadPlugin(pluginId)
  }

  /**
   * 启用插件
   */
  enablePlugin(pluginId: string): void {
    this.registry.enable(pluginId)
  }

  /**
   * 禁用插件
   */
  disablePlugin(pluginId: string): void {
    this.registry.disable(pluginId)
  }

  /**
   * 注册预设
   */
  registerPreset(name: string, description: string, plugins: Array<() => Promise<any>>): void {
    this.presets.set(name, {
      name,
      description,
      plugins
    })

    console.log(`[PluginManager] Registered preset: ${name}`)
  }

  /**
   * 获取已注册的预设
   */
  getPresets(): Array<{ name: string; description: string }> {
    return Array.from(this.presets.values()).map(p => ({
      name: p.name,
      description: p.description
    }))
  }

  /**
   * 获取所有已加载的插件
   */
  getLoadedPlugins(): StarChartPlugin[] {
    return this.registry.getEnabled()
  }

  /**
   * 获取插件统计
   */
  getStats(): {
    total: number
    enabled: number
    disabled: number
    installed: number
    errors: number
    presets: number
  } {
    const registryStats = this.registry.getStats()
    const loaderStats = this.loader.getStats()

    return {
      ...registryStats,
      presets: this.presets.size
    }
  }

  /**
   * 获取完整报告
   */
  getReport(): {
    plugins: Array<{
      id: string
      name: string
      version: string
      enabled: boolean
      installed: boolean
    }>
    dependencies: {
      total: number
      cycles: string[][]
      orphaned: string[]
    }
  } {
    const pluginReport = this.registry.getReport()
    const dependencyStats = this.resolver.getGraphStats()

    return {
      plugins: pluginReport,
      dependencies: {
        total: dependencyStats.totalDependencies,
        cycles: this.resolver.detectCircularDependencies(),
        orphaned: dependencyStats.orphanedPlugins
      }
    }
  }

  /**
   * 销毁插件系统
   */
  async destroy(): Promise<void> {
    const plugins = this.registry.getAll()

    for (const plugin of plugins) {
      await this.unloadPlugin(plugin.id)
    }

    this.registry.clear()
    this.resolver.clear()
    this.pluginContexts.clear()
    this.initialized = false

    console.log('[PluginManager] Plugin system destroyed')
  }

  // ============ 私有方法 ============

  /**
   * 判断是否应该安装插件
   */
  private shouldInstall(plugin: StarChartPlugin): boolean {
    // 可以添加更复杂的逻辑，比如版本检查等
    return true
  }
}
