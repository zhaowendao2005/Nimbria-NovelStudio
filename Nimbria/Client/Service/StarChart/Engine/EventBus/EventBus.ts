/**
 * EventBus - 事件总线
 * 
 * 职责：
 * - 事件发布/订阅
 * - 桥接 Sigma.js 原生事件到统一事件系统
 * - 错误处理和内存泄露防护
 */

import type { EventBusAPI, EventListener } from 'Business/StarChart'
import type { SigmaManager } from '../SigmaManager/SigmaManager'

interface EventEntry {
  listeners: Set<EventListener>
}

export class EventBus implements EventBusAPI {
  private events: Map<string, EventEntry> = new Map()
  private sigmaListeners: Array<() => void> = []

  /**
   * 绑定 Sigma.js 原生事件（必须在 Sigma 创建后调用）
   */
  bindSigmaEvents(sigmaManager: SigmaManager): void {
    const sigma = sigmaManager.getInstance()

    // 清理旧的绑定
    this.unbindSigmaEvents()

    // 转接 Sigma 原生事件到 EventBus
    const bindEvent = (sigmaEvent: string, busEvent: string) => {
      const handler = (payload: any) => {
        this.emit(busEvent, payload)
      }
      sigma.on(sigmaEvent, handler)
      
      // 记录解绑函数
      this.sigmaListeners.push(() => {
        sigma.off(sigmaEvent, handler)
      })
    }

    // 节点交互事件
    bindEvent('clickNode', 'node:click')
    bindEvent('doubleClickNode', 'node:doubleClick')
    bindEvent('rightClickNode', 'node:rightClick')
    bindEvent('enterNode', 'node:hover')
    bindEvent('leaveNode', 'node:leave')
    bindEvent('downNode', 'node:down')

    // 边交互事件
    bindEvent('clickEdge', 'edge:click')
    bindEvent('doubleClickEdge', 'edge:doubleClick')
    bindEvent('rightClickEdge', 'edge:rightClick')
    bindEvent('enterEdge', 'edge:hover')
    bindEvent('leaveEdge', 'edge:leave')

    // 舞台事件
    bindEvent('clickStage', 'stage:click')
    bindEvent('doubleClickStage', 'stage:doubleClick')
    bindEvent('rightClickStage', 'stage:rightClick')

    // 渲染事件
    bindEvent('beforeRender', 'render:before')
    bindEvent('afterRender', 'render:after')

    // Camera 事件
    bindEvent('updated', 'viewport:updated')

    console.log('[EventBus] Sigma 事件绑定完成')
  }

  /**
   * 解绑 Sigma.js 事件
   */
  unbindSigmaEvents(): void {
    this.sigmaListeners.forEach(unbind => {
      try {
        unbind()
      } catch (error) {
        console.error('[EventBus] 解绑事件失败:', error)
      }
    })
    this.sigmaListeners = []
  }

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
    
    // 如果没有监听器了，删除事件条目
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
    this.unbindSigmaEvents()
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

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalEvents: this.events.size,
      totalListeners: Array.from(this.events.values()).reduce(
        (sum, entry) => sum + entry.listeners.size,
        0
      ),
      sigmaBindings: this.sigmaListeners.length
    }
  }
}
