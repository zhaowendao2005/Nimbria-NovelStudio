/**
 * PluginContext - 插件上下文管理器
 * 
 * 职责：
 * - 为插件提供统一的 API 入口
 * - 权限控制
 * - 沙盒隔离
 * - 插件通信
 */

import type { StarChartCoreAPI, StarChartConfig, PluginContext as IPluginContext } from 'Business/StarChart'
import { Logger } from '../../Core/Logger/Logger'

interface PluginSandbox {
  pluginId: string
  permissions: Set<string>
  createdAt: number
  accessLog: Array<{ action: string; timestamp: number }>
}

export class PluginContext implements IPluginContext {
  readonly core: StarChartCoreAPI
  readonly config: StarChartConfig
  readonly utils: {
    logger: Logger
    debounce: (fn: Function, delay: number) => Function
    throttle: (fn: Function, delay: number) => Function
  }

  private sandbox: PluginSandbox
  private logger: Logger

  constructor(
    pluginId: string,
    core: StarChartCoreAPI,
    config: StarChartConfig,
    permissions: string[] = []
  ) {
    this.core = core
    this.config = config
    this.logger = Logger.getInstance()

    this.sandbox = {
      pluginId,
      permissions: new Set(permissions),
      createdAt: Date.now(),
      accessLog: []
    }

    this.utils = {
      logger: this.logger,
      debounce: this.createDebounce(),
      throttle: this.createThrottle()
    }
  }

  /**
   * 检查权限
   */
  checkPermission(permission: string): boolean {
    const allowed = this.sandbox.permissions.has(permission) || this.sandbox.permissions.has('*')

    this.recordAccess(permission, allowed)

    if (!allowed) {
      this.logger.warn(
        `[PluginContext] ${this.sandbox.pluginId}`,
        `Permission denied: ${permission}`
      )
    }

    return allowed
  }

  /**
   * 请求权限
   */
  requestPermission(permission: string): boolean {
    // 在实际应用中，这里可能会显示权限请求对话框
    // 这里简化为直接授予
    this.sandbox.permissions.add(permission)
    this.logger.info(`[PluginContext] ${this.sandbox.pluginId}`, `Permission granted: ${permission}`)

    return true
  }

  /**
   * 获取权限列表
   */
  getPermissions(): string[] {
    return Array.from(this.sandbox.permissions)
  }

  /**
   * 获取访问日志
   */
  getAccessLog(): Array<{ action: string; timestamp: number }> {
    return [...this.sandbox.accessLog]
  }

  /**
   * 获取上下文信息
   */
  getContextInfo(): {
    pluginId: string
    createdAt: number
    permissions: string[]
    accessCount: number
  } {
    return {
      pluginId: this.sandbox.pluginId,
      createdAt: this.sandbox.createdAt,
      permissions: this.getPermissions(),
      accessCount: this.sandbox.accessLog.length
    }
  }

  /**
   * 清除访问日志
   */
  clearAccessLog(): void {
    this.sandbox.accessLog = []
  }

  /**
   * 销毁上下文
   */
  destroy(): void {
    this.clearAccessLog()
    this.sandbox.permissions.clear()
  }

  // ============ 私有方法 ============

  /**
   * 记录访问
   */
  private recordAccess(action: string, allowed: boolean): void {
    if (this.sandbox.accessLog.length > 1000) {
      this.sandbox.accessLog.shift()
    }

    this.sandbox.accessLog.push({
      action: `${action}:${allowed ? 'allowed' : 'denied'}`,
      timestamp: Date.now()
    })
  }

  /**
   * 创建 debounce 函数
   */
  private createDebounce(): (fn: Function, delay: number) => Function {
    return (fn: Function, delay: number) => {
      let timeoutId: NodeJS.Timeout | null = null

      return (...args: any[]) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
          fn(...args)
          timeoutId = null
        }, delay)
      }
    }
  }

  /**
   * 创建 throttle 函数
   */
  private createThrottle(): (fn: Function, delay: number) => Function {
    return (fn: Function, delay: number) => {
      let lastCall = 0

      return (...args: any[]) => {
        const now = Date.now()

        if (now - lastCall >= delay) {
          fn(...args)
          lastCall = now
        }
      }
    }
  }
}
