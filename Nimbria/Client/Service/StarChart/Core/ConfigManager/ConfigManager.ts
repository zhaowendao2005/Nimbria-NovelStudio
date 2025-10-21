/**
 * ConfigManager - 配置管理器
 * 
 * 职责：
 * - 全局配置管理
 * - 配置合并和覆盖
 * - 运行时配置更新
 * - 配置验证和持久化
 */

export interface StarChartConfig {
  // Sigma 配置
  sigma?: {
    renderMode?: 'webgl' | 'canvas'
    enableInteractions?: boolean
    enableMouseWheelZoom?: boolean
  }

  // 渲染配置
  render?: {
    targetFps?: number
    enableBatching?: boolean
    enableVsync?: boolean
    enableShadows?: boolean
  }

  // 性能配置
  performance?: {
    enableMonitoring?: boolean
    gcThreshold?: number
    maxCacheSize?: number
    enableWorkers?: boolean
  }

  // 日志配置
  logging?: {
    level?: 'debug' | 'info' | 'warn' | 'error'
    enableConsole?: boolean
    enablePersist?: boolean
    maxLogs?: number
  }

  // 布局配置
  layout?: {
    algorithm?: string
    iterations?: number
    convergenceThreshold?: number
  }

  // 自定义扩展配置
  [key: string]: any
}

export class ConfigManager {
  private config: StarChartConfig = {}
  private defaultConfig: StarChartConfig = this.getDefaultConfig()
  private listeners: Map<string, Set<(value: any) => void>> = new Map()

  constructor(initialConfig?: StarChartConfig) {
    this.config = this.mergeConfigs(this.defaultConfig, initialConfig ?? {})
  }

  /**
   * 获取配置值
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const keys = key.split('.')
    let value: any = this.config

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return defaultValue as T
      }
    }

    return value as T
  }

  /**
   * 设置配置值
   */
  set(key: string, value: any): void {
    const keys = key.split('.')
    const lastKey = keys.pop()

    if (!lastKey) return

    let target: any = this.config
    for (const k of keys) {
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {}
      }
      target = target[k]
    }

    target[lastKey] = value

    // 触发监听器
    this.notifyListeners(key, value)
  }

  /**
   * 合并配置
   */
  merge(newConfig: StarChartConfig): void {
    this.config = this.mergeConfigs(this.config, newConfig)
    this.notifyListeners('*', this.config)
  }

  /**
   * 获取全部配置
   */
  getAll(): Readonly<StarChartConfig> {
    return { ...this.config }
  }

  /**
   * 重置为默认配置
   */
  reset(): void {
    this.config = this.mergeConfigs({}, this.defaultConfig)
    this.notifyListeners('*', this.config)
  }

  /**
   * 监听配置变化
   */
  watch(key: string, callback: (value: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }

    this.listeners.get(key)!.add(callback)

    // 返回移除监听的函数
    return () => {
      this.listeners.get(key)?.delete(callback)
    }
  }

  /**
   * 验证配置
   */
  validate(key: string): boolean {
    const value = this.get(key)

    switch (key) {
      case 'render.targetFps':
        return typeof value === 'number' && value > 0 && value <= 240

      case 'performance.gcThreshold':
        return typeof value === 'number' && value >= 0 && value <= 100

      case 'performance.maxCacheSize':
        return typeof value === 'number' && value > 0

      case 'logging.level':
        return ['debug', 'info', 'warn', 'error'].includes(value)

      default:
        return true
    }
  }

  /**
   * 导出配置为 JSON
   */
  exportAsJson(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * 从 JSON 导入配置
   */
  importFromJson(json: string): void {
    try {
      const config = JSON.parse(json)
      this.merge(config)
    } catch (error) {
      console.error('[ConfigManager] Failed to import config:', error)
    }
  }

  // ============ 私有方法 ============

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): StarChartConfig {
    return {
      sigma: {
        renderMode: 'webgl',
        enableInteractions: true,
        enableMouseWheelZoom: true
      },
      render: {
        targetFps: 60,
        enableBatching: true,
        enableVsync: true,
        enableShadows: false
      },
      performance: {
        enableMonitoring: true,
        gcThreshold: 80,
        maxCacheSize: 100 * 1024 * 1024, // 100MB
        enableWorkers: true
      },
      logging: {
        level: 'info',
        enableConsole: true,
        enablePersist: true,
        maxLogs: 500
      },
      layout: {
        algorithm: 'force-directed',
        iterations: 100,
        convergenceThreshold: 0.01
      }
    }
  }

  /**
   * 深度合并配置对象
   */
  private mergeConfigs(
    base: StarChartConfig,
    override: StarChartConfig
  ): StarChartConfig {
    const result = { ...base }

    for (const key in override) {
      if (Object.prototype.hasOwnProperty.call(override, key)) {
        const overrideValue = override[key]
        const baseValue = base[key]

        if (
          baseValue &&
          typeof baseValue === 'object' &&
          !Array.isArray(baseValue) &&
          overrideValue &&
          typeof overrideValue === 'object' &&
          !Array.isArray(overrideValue)
        ) {
          result[key] = this.mergeConfigs(baseValue, overrideValue)
        } else {
          result[key] = overrideValue
        }
      }
    }

    return result
  }

  /**
   * 触发监听器
   */
  private notifyListeners(key: string, value: any): void {
    // 触发特定键的监听器
    if (this.listeners.has(key)) {
      this.listeners.get(key)?.forEach(callback => {
        try {
          callback(value)
        } catch (error) {
          console.error(`[ConfigManager] Error in listener for ${key}:`, error)
        }
      })
    }

    // 触发通配符监听器
    if (key !== '*' && this.listeners.has('*')) {
      this.listeners.get('*')?.forEach(callback => {
        try {
          callback(value)
        } catch (error) {
          console.error('[ConfigManager] Error in wildcard listener:', error)
        }
      })
    }
  }
}
