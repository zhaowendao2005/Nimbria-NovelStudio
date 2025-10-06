/**
 * Markdown 自动保存控制器
 * 负责管理自动保存定时器、防抖逻辑和错误重试
 */

import type { SaveResult } from './types'

export class AutoSaveController {
  private timers = new Map<string, NodeJS.Timeout>()
  private retryCount = new Map<string, number>()
  private readonly DEFAULT_DELAY = 2000 // 2秒
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 1000 // 1秒

  /**
   * 调度自动保存（防抖）
   */
  scheduleAutoSave(
    tabId: string,
    callback: () => Promise<SaveResult>,
    delay = this.DEFAULT_DELAY
  ): void {
    // 清除旧定时器
    if (this.timers.has(tabId)) {
      const timer = this.timers.get(tabId)
      if (timer) clearTimeout(timer)
    }

    // 设置新定时器
    const timer = setTimeout(() => {
      this.executeSave(tabId, callback).catch((error) => {
        console.error('Auto-save failed:', error)
      })
      this.timers.delete(tabId)
    }, delay)

    this.timers.set(tabId, timer)
  }

  /**
   * 执行保存
   */
  async executeSave(
    tabId: string,
    callback: () => Promise<SaveResult>
  ): Promise<SaveResult> {
    try {
      const result = await callback()

      if (result.success) {
        // 重置重试计数
        this.retryCount.delete(tabId)
        return { success: true }
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      // 自动重试
      const retries = this.retryCount.get(tabId) || 0

      if (retries < this.MAX_RETRIES) {
        this.retryCount.set(tabId, retries + 1)

        // 指数退避
        const delay = this.RETRY_DELAY * Math.pow(2, retries)

        setTimeout(() => {
          this.executeSave(tabId, callback).catch(() => {})
        }, delay)

        return {
          success: false,
          error: String(error),
          retrying: true,
          retryCount: retries + 1
        }
      } else {
        // 重试耗尽
        this.retryCount.delete(tabId)

        return {
          success: false,
          error: String(error),
          retryExhausted: true
        }
      }
    }
  }

  /**
   * 取消自动保存
   */
  cancelAutoSave(tabId: string): void {
    if (this.timers.has(tabId)) {
      const timer = this.timers.get(tabId)
      if (timer) clearTimeout(timer)
      this.timers.delete(tabId)
    }
  }

  /**
   * 清空所有定时器
   */
  clearAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
    this.retryCount.clear()
  }

  /**
   * 获取状态
   */
  getStatus(): {
    activeTimers: number
    pendingRetries: number
  } {
    return {
      activeTimers: this.timers.size,
      pendingRetries: this.retryCount.size
    }
  }
}

