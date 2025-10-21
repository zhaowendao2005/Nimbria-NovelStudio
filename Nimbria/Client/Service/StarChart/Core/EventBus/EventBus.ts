/**
 * EventBus - 事件总线
 * 
 * 职责：
 * - 事件发布/订阅
 * - 支持事件监听和移除
 * - 错误处理和内存泄露防护
 */

import type { EventListener } from 'Business/StarChart'

interface EventEntry {
  listeners: Set<EventListener>
}

export class EventBus {
  private events: Map<string, EventEntry> = new Map()

  /**
   * 监听事件
   */
  on(event: string, listener: EventListener): void {
    if (!this.events.has(event)) {
      this.events.set(event, { listeners: new Set() })
    }
    this.events.get(event)!.listeners.add(listener)
  }

  /**
   * 监听一次事件（自动移除）
   */
  once(event: string, listener: EventListener): void {
    const onceListener: EventListener = (data: any) => {
      listener(data)
      this.off(event, onceListener)
    }
    this.on(event, onceListener)
  }

  /**
   * 移除监听
   */
  off(event: string, listener: EventListener): void {
    const entry = this.events.get(event)
    if (!entry) return
    entry.listeners.delete(listener)
    if (entry.listeners.size === 0) {
      this.events.delete(event)
    }
  }

  /**
   * 触发事件
   */
  emit(event: string, data?: any): void {
    const entry = this.events.get(event)
    if (!entry) return

    entry.listeners.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        console.error(`[EventBus] 事件 "${event}" 监听器执行错误:`, error)
      }
    })
  }

  /**
   * 清空所有监听
   */
  clear(): void {
    this.events.clear()
    console.log('[EventBus] 已清空所有事件监听')
  }

  /**
   * 获取事件监听数量
   */
  getListenerCount(event: string): number {
    return this.events.get(event)?.listeners.size || 0
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): string[] {
    return Array.from(this.events.keys())
  }
}
