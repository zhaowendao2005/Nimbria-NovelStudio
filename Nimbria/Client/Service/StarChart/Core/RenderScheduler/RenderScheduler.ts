/**
 * RenderScheduler - 渲染调度器
 * 
 * 职责：
 * - 批量更新防抖
 * - 帧率控制
 * - 增量渲染
 * - 事件触发
 */

import type { RenderState, NodeUpdate } from 'Business/StarChart'
import { EventBus } from '../EventBus/EventBus'

export class RenderScheduler {
  private pendingUpdates: Map<string, NodeUpdate> = new Map()
  private renderScheduled: boolean = false
  private lastRenderTime: number = 0
  private readonly minFrameInterval: number = 16 // 60fps

  constructor(private eventBus: EventBus) {}

  /**
   * 调度单个节点更新
   */
  scheduleNodeUpdate(nodeId: string, update: Partial<Record<string, any>>): void {
    const nodeUpdate: NodeUpdate = {
      nodeId,
      attributes: update,
      timestamp: Date.now()
    }
    this.pendingUpdates.set(nodeId, nodeUpdate)
    this.scheduleRender()
  }

  /**
   * 调度批量节点更新
   */
  scheduleNodeUpdates(updates: Array<{ nodeId: string; update: Partial<Record<string, any>> }>): void {
    for (const { nodeId, update } of updates) {
      const nodeUpdate: NodeUpdate = {
        nodeId,
        attributes: update,
        timestamp: Date.now()
      }
      this.pendingUpdates.set(nodeId, nodeUpdate)
    }
    this.scheduleRender()
  }

  /**
   * 立即触发渲染
   */
  flushRender(): void {
    if (this.pendingUpdates.size === 0) return
    this.doRender()
  }

  /**
   * 设置帧率限制
   */
  setFrameRateLimit(fps: number): void {
    // 存储，用于未来扩展
    console.log(`[RenderScheduler] 帧率限制设置为 ${fps} fps`)
  }

  /**
   * 调度渲染（防抖）
   */
  private scheduleRender(): void {
    if (this.renderScheduled) return

    this.renderScheduled = true

    requestAnimationFrame((timestamp: DOMHighResTimeStamp) => {
      const elapsed = timestamp - this.lastRenderTime
      if (elapsed < this.minFrameInterval) {
        this.renderScheduled = false
        setTimeout(() => this.scheduleRender(), this.minFrameInterval - elapsed)
        return
      }

      this.doRender()
      this.lastRenderTime = timestamp
      this.renderScheduled = false
    })
  }

  /**
   * 执行渲染
   */
  private doRender(): void {
    if (this.pendingUpdates.size === 0) return

    const startTime = performance.now()

    // 触发渲染前事件
    this.eventBus.emit('render:beforeUpdate', {
      nodeCount: this.pendingUpdates.size
    })

    // TODO: 实际更新 Sigma 图实例

    const renderTime = performance.now() - startTime

    // 触发渲染后事件
    this.eventBus.emit('render:afterUpdate', {
      nodeCount: this.pendingUpdates.size,
      renderTime: Math.round(renderTime * 100) / 100
    })

    // 清空更新队列
    this.pendingUpdates.clear()
  }

  /**
   * 获取待更新数量
   */
  getPendingUpdateCount(): number {
    return this.pendingUpdates.size
  }

  /**
   * 获取状态信息
   */
  getState(): RenderState {
    return {
      pendingUpdates: this.pendingUpdates,
      lastRenderTime: this.lastRenderTime,
      isScheduled: this.renderScheduled,
      frameId: null,
      targetFps: 60
    }
  }
}
