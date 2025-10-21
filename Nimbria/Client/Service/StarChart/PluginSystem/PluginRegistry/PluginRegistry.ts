/**
 * PluginRegistry - 插件注册中心
 * 
 * 职责：
 * - 插件元数据管理
 * - 版本兼容性检查
 * - 插件状态跟踪
 * - 插件依赖关系维护
 */

import type { StarChartPlugin, PluginDependency } from 'Business/StarChart'

interface PluginMetadata {
  id: string
  name: string
  version: string
  type: string
  enabled: boolean
  installed: boolean
  loadTime?: number
  error?: string
}

interface RegistryEntry {
  plugin: StarChartPlugin
  metadata: PluginMetadata
  registeredAt: number
}

export class PluginRegistry {
  private registry: Map<string, RegistryEntry> = new Map()
  private enabledPlugins: Set<string> = new Set()
  private disabledPlugins: Set<string> = new Set()
  private loadOrder: string[] = []

  /**
   * 注册插件
   */
  register(plugin: StarChartPlugin): boolean {
    if (this.registry.has(plugin.id)) {
      console.warn(`[PluginRegistry] Plugin ${plugin.id} already registered`)
      return false
    }

    const metadata: PluginMetadata = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      type: plugin.type,
      enabled: true,
      installed: false
    }

    const entry: RegistryEntry = {
      plugin,
      metadata,
      registeredAt: Date.now()
    }

    this.registry.set(plugin.id, entry)
    this.enabledPlugins.add(plugin.id)
    this.loadOrder.push(plugin.id)

    console.log(`[PluginRegistry] Registered plugin: ${plugin.name} v${plugin.version}`)

    return true
  }

  /**
   * 注销插件
   */
  unregister(pluginId: string): boolean {
    if (!this.registry.has(pluginId)) {
      console.warn(`[PluginRegistry] Plugin ${pluginId} not found`)
      return false
    }

    this.registry.delete(pluginId)
    this.enabledPlugins.delete(pluginId)
    this.disabledPlugins.delete(pluginId)

    const index = this.loadOrder.indexOf(pluginId)
    if (index > -1) {
      this.loadOrder.splice(index, 1)
    }

    console.log(`[PluginRegistry] Unregistered plugin: ${pluginId}`)

    return true
  }

  /**
   * 获取插件信息
   */
  getPlugin(pluginId: string): StarChartPlugin | null {
    const entry = this.registry.get(pluginId)
    return entry?.plugin ?? null
  }

  /**
   * 获取插件元数据
   */
  getMetadata(pluginId: string): PluginMetadata | null {
    const entry = this.registry.get(pluginId)
    return entry?.metadata ?? null
  }

  /**
   * 启用插件
   */
  enable(pluginId: string): void {
    const entry = this.registry.get(pluginId)
    if (entry) {
      entry.metadata.enabled = true
      this.enabledPlugins.add(pluginId)
      this.disabledPlugins.delete(pluginId)

      console.log(`[PluginRegistry] Enabled plugin: ${pluginId}`)
    }
  }

  /**
   * 禁用插件
   */
  disable(pluginId: string): void {
    const entry = this.registry.get(pluginId)
    if (entry) {
      entry.metadata.enabled = false
      this.enabledPlugins.delete(pluginId)
      this.disabledPlugins.add(pluginId)

      console.log(`[PluginRegistry] Disabled plugin: ${pluginId}`)
    }
  }

  /**
   * 标记插件已安装
   */
  markInstalled(pluginId: string, loadTime: number = 0): void {
    const entry = this.registry.get(pluginId)
    if (entry) {
      entry.metadata.installed = true
      entry.metadata.loadTime = loadTime
      entry.metadata.error = undefined
    }
  }

  /**
   * 标记插件加载错误
   */
  markError(pluginId: string, error: string): void {
    const entry = this.registry.get(pluginId)
    if (entry) {
      entry.metadata.installed = false
      entry.metadata.error = error
    }
  }

  /**
   * 验证版本兼容性
   */
  checkVersion(pluginId: string, minVersion: string): boolean {
    const entry = this.registry.get(pluginId)
    if (!entry) return false

    return this.compareVersions(entry.plugin.version, minVersion) >= 0
  }

  /**
   * 检查插件依赖
   */
  checkDependencies(pluginId: string): { valid: boolean; missing: string[] } {
    const entry = this.registry.get(pluginId)
    if (!entry || !entry.plugin.dependencies) {
      return { valid: true, missing: [] }
    }

    const missing: string[] = []

    for (const dep of entry.plugin.dependencies) {
      const depEntry = this.registry.get(dep.pluginId)

      if (!depEntry) {
        missing.push(`${dep.pluginId} (not found)`)
        continue
      }

      if (!this.checkVersion(dep.pluginId, dep.minVersion ?? '0.0.0')) {
        missing.push(
          `${dep.pluginId} (requires ${dep.minVersion}, got ${depEntry.plugin.version})`
        )
      }
    }

    return {
      valid: missing.length === 0,
      missing
    }
  }

  /**
   * 获取所有已注册的插件
   */
  getAll(): StarChartPlugin[] {
    return Array.from(this.registry.values()).map(entry => entry.plugin)
  }

  /**
   * 获取已启用的插件
   */
  getEnabled(): StarChartPlugin[] {
    return Array.from(this.enabledPlugins)
      .map(id => this.registry.get(id)?.plugin)
      .filter((p): p is StarChartPlugin => p !== undefined)
  }

  /**
   * 获取已禁用的插件
   */
  getDisabled(): StarChartPlugin[] {
    return Array.from(this.disabledPlugins)
      .map(id => this.registry.get(id)?.plugin)
      .filter((p): p is StarChartPlugin => p !== undefined)
  }

  /**
   * 获取加载顺序
   */
  getLoadOrder(): string[] {
    return [...this.loadOrder]
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number
    enabled: number
    disabled: number
    installed: number
    errors: number
  } {
    let installed = 0
    let errors = 0

    this.registry.forEach(entry => {
      if (entry.metadata.installed) {
        installed++
      }
      if (entry.metadata.error) {
        errors++
      }
    })

    return {
      total: this.registry.size,
      enabled: this.enabledPlugins.size,
      disabled: this.disabledPlugins.size,
      installed,
      errors
    }
  }

  /**
   * 获取详细报告
   */
  getReport(): Array<{
    id: string
    name: string
    version: string
    enabled: boolean
    installed: boolean
    loadTime?: number
    error?: string
  }> {
    const report: Array<{
      id: string
      name: string
      version: string
      enabled: boolean
      installed: boolean
      loadTime?: number
      error?: string
    }> = []

    this.registry.forEach(entry => {
      const { plugin, metadata } = entry
      report.push({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        enabled: metadata.enabled,
        installed: metadata.installed,
        loadTime: metadata.loadTime,
        error: metadata.error
      })
    })

    return report.sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * 清除注册表
   */
  clear(): void {
    this.registry.clear()
    this.enabledPlugins.clear()
    this.disabledPlugins.clear()
    this.loadOrder = []
  }

  // ============ 私有方法 ============

  /**
   * 比较版本号（语义化版本）
   * 返回 1 如果 v1 > v2，-1 如果 v1 < v2，0 如果相等
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] ?? 0
      const p2 = parts2[i] ?? 0

      if (p1 > p2) return 1
      if (p1 < p2) return -1
    }

    return 0
  }
}
