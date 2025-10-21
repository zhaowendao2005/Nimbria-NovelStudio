/**
 * LayerManager - 层管理器
 * 
 * 职责：
 * - 管理多层渲染堆栈
 * - 自定义图层注册和移除
 * - 渲染顺序管理
 * - 图层可见性控制
 */

import type { LayerManagerState } from 'Business/StarChart'
import { EventBus } from '../EventBus/EventBus'

interface LayerEntry {
  readonly id: string
  readonly index: number
  readonly visible: boolean
  readonly zIndex: number
  readonly element: HTMLElement | CanvasRenderingContext2D | WebGLRenderingContext
  readonly type: 'dom' | 'canvas' | 'webgl'
}

export class LayerManager {
  private layers: Map<string, LayerEntry> = new Map()
  private layerStack: LayerEntry[] = []
  private zIndexCounter = 0
  private readonly eventBus: EventBus

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus
  }

  /**
   * 注册自定义图层
   */
  registerLayer(
    id: string,
    element: HTMLElement | CanvasRenderingContext2D | WebGLRenderingContext,
    type: 'dom' | 'canvas' | 'webgl' = 'dom',
    position: 'top' | 'bottom' | 'before' | 'after' = 'top'
  ): void {
    if (this.layers.has(id)) {
      console.warn(`[LayerManager] Layer ${id} already exists`)
      return
    }

    const zIndex = this.zIndexCounter++
    const layerEntry: LayerEntry = {
      id,
      index: this.layerStack.length,
      visible: true,
      zIndex,
      element,
      type
    }

    this.layers.set(id, layerEntry)
    this.insertLayerByPosition(layerEntry, position)

    this.eventBus.emit('layer:registered', { id, type, zIndex })
  }

  /**
   * 移除图层
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id)
    if (!layer) {
      console.warn(`[LayerManager] Layer ${id} not found`)
      return
    }

    this.layerStack.splice(layer.index, 1)
    this.layers.delete(id)

    // 重新计算所有图层的 index
    this.layerStack.forEach((l, idx) => {
      ;(l as any).index = idx
    })

    this.eventBus.emit('layer:removed', { id })
  }

  /**
   * 设置图层可见性
   */
  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id)
    if (!layer) return

    ;(layer as any).visible = visible
    this.eventBus.emit('layer:visibility-changed', { id, visible })
  }

  /**
   * 获取图层信息
   */
  getLayer(id: string): Readonly<LayerEntry> | null {
    return this.layers.get(id) ?? null
  }

  /**
   * 获取所有图层（按堆栈顺序）
   */
  getAllLayers(): readonly LayerEntry[] {
    return [...this.layerStack]
  }

  /**
   * 调整图层顺序
   */
  reorderLayers(ids: string[]): void {
    const newStack: LayerEntry[] = []

    for (const id of ids) {
      const layer = this.layers.get(id)
      if (layer) {
        newStack.push(layer)
      }
    }

    if (newStack.length === this.layerStack.length) {
      this.layerStack = newStack
      // 重新计算 index
      this.layerStack.forEach((l, idx) => {
        ;(l as any).index = idx
      })
      this.eventBus.emit('layer:reordered', { order: ids })
    }
  }

  /**
   * 获取可见图层
   */
  getVisibleLayers(): readonly LayerEntry[] {
    return this.layerStack.filter(l => l.visible)
  }

  /**
   * 获取图层状态快照
   */
  getState(): LayerManagerState {
    return {
      layers: this.layerStack.map(l => ({
        id: l.id,
        type: l.type,
        visible: l.visible,
        zIndex: l.zIndex
      })),
      totalLayers: this.layers.size,
      visibleCount: this.layerStack.filter(l => l.visible).length
    }
  }

  /**
   * 清除所有图层
   */
  clear(): void {
    const layerIds = Array.from(this.layers.keys())
    layerIds.forEach(id => this.removeLayer(id))
    this.zIndexCounter = 0
  }

  /**
   * 按位置插入图层
   */
  private insertLayerByPosition(layer: LayerEntry, position: string): void {
    switch (position) {
      case 'top':
        this.layerStack.push(layer)
        break

      case 'bottom':
        this.layerStack.unshift(layer)
        break

      case 'before':
      case 'after':
        // 在默认情况下放在顶部
        this.layerStack.push(layer)
        break
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clear()
  }
}
