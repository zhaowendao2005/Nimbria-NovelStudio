/**
 * RenderScheduler - 渲染调度器
 * 
 * 职责：
 * - 批量更新 Graphology 属性
 * - 智能判断是否需要重新索引
 * - 使用 Sigma.js 的防抖机制而非自定义
 * - 事件触发
 */

import type Graph from 'graphology'
import type { Attributes } from 'graphology-types'
import type { RenderSchedulerAPI } from 'Business/StarChart'
import type { EventBus } from '../EventBus/EventBus'
import type { SigmaManager } from '../SigmaManager/SigmaManager'

interface NodeUpdate {
  nodeId: string
  attributes: Partial<Attributes>
  timestamp: number
}

interface RenderState {
  pendingUpdates: Map<string, NodeUpdate>
  lastRenderTime: number
  isScheduled: boolean
}

export class RenderScheduler implements RenderSchedulerAPI {
  private pendingUpdates: Map<string, NodeUpdate> = new Map()
  private updateScheduled = false
  private lastRenderTime = 0

  constructor(
    private eventBus: EventBus,
    private sigmaManager: SigmaManager
  ) {}

  /**
   * 调度单个节点更新
   */
  scheduleNodeUpdate(nodeId: string, update: Partial<Attributes>): void {
    const existing = this.pendingUpdates.get(nodeId)
    
    const nodeUpdate: NodeUpdate = {
      nodeId,
      attributes: { ...existing?.attributes, ...update },
      timestamp: Date.now()
    }
    
    this.pendingUpdates.set(nodeId, nodeUpdate)
    this.scheduleFlush()
  }

  /**
   * 调度批量节点更新
   */
  scheduleNodeUpdates(updates: Array<{ nodeId: string; update: Partial<Attributes> }>): void {
    for (const { nodeId, update } of updates) {
      this.scheduleNodeUpdate(nodeId, update)
    }
  }

  /**
   * 立即触发渲染
   */
  flushRender(): void {
    if (this.pendingUpdates.size === 0) return
    
    const startTime = performance.now()
    const graph = this.sigmaManager.getGraph()
    
    // 触发渲染前事件
    this.eventBus.emit('render:beforeUpdate', {
      nodeCount: this.pendingUpdates.size
    })

    let needsIndexation = false

    // 关键：直接操作 Graphology
    for (const [nodeId, nodeUpdate] of this.pendingUpdates) {
      if (!graph.hasNode(nodeId)) {
        console.warn(`[RenderScheduler] 节点 ${nodeId} 不存在于图中`)
        continue
      }

      // 判断是否需要重新索引（位置、zIndex、type 变化时）
      if (
        'x' in nodeUpdate.attributes ||
        'y' in nodeUpdate.attributes ||
        'zIndex' in nodeUpdate.attributes ||
        'type' in nodeUpdate.attributes
      ) {
        needsIndexation = true
      }

      // 逐个设置属性（Graphology API）
      for (const [key, value] of Object.entries(nodeUpdate.attributes)) {
        graph.setNodeAttribute(nodeId, key, value)
      }
    }

    const updateCount = this.pendingUpdates.size
    this.pendingUpdates.clear()

    // Sigma.js 会自动监听 Graphology 的 nodeAttributesUpdated 事件
    // 但为了控制 skipIndexation，显式调用 refresh
    this.sigmaManager.refresh({ skipIndexation: !needsIndexation })

    const renderTime = performance.now() - startTime
    this.lastRenderTime = Date.now()

    // 触发渲染后事件
    this.eventBus.emit('render:afterUpdate', {
      nodeCount: updateCount,
      renderTime: Math.round(renderTime * 100) / 100,
      needsIndexation
    })
  }

  /**
   * 设置帧率限制（已由 Sigma.js 处理）
   */
  setFrameRateLimit(fps: number): void {
    // Sigma.js 使用 requestAnimationFrame，无需手动控制
    // 记录期望帧率用于未来扩展
    console.log(`[RenderScheduler] 期望帧率: ${fps}fps（由 Sigma.js 自动管理）`)
  }

  /**
   * 获取待更新数量
   */
  getPendingUpdateCount(): number {
    return this.pendingUpdates.size
  }

  /**
   * 调度刷新（防抖）
   */
  private scheduleFlush(): void {
    if (this.updateScheduled) return

    this.updateScheduled = true

    // 使用 requestAnimationFrame（60fps）
    requestAnimationFrame(() => {
      this.flushRender()
      this.updateScheduled = false
    })
  }

  /**
   * 获取状态信息
   */
  getState(): RenderState {
    return {
      pendingUpdates: new Map(this.pendingUpdates),
      lastRenderTime: this.lastRenderTime,
      isScheduled: this.updateScheduled
    }
  }
}
