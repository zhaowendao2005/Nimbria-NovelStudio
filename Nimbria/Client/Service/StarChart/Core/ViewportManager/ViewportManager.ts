/**
 * ViewportManager - 视口管理器
 * 
 * 职责：
 * - 管理视口状态（缩放、位置）
 * - 计算可见区域
 * - 视口变化事件
 */

import type { ViewportState, VisibleBounds, NodeData } from 'Business/StarChart'
import { EventBus } from '../EventBus/EventBus'

export class ViewportManager {
  private state: ViewportState = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    width: 1000,
    height: 1000,
    minZoom: 0.1,
    maxZoom: 10
  }

  constructor(private eventBus: EventBus) {}

  /**
   * 获取当前视口状态
   */
  getCurrentViewport(): ViewportState {
    return { ...this.state }
  }

  /**
   * 获取可见区域边界
   */
  getVisibleBounds(): VisibleBounds {
    return {
      minX: -this.state.offsetX / this.state.scale,
      maxX: (-this.state.offsetX + this.state.width) / this.state.scale,
      minY: -this.state.offsetY / this.state.scale,
      maxY: (-this.state.offsetY + this.state.height) / this.state.scale
    }
  }

  /**
   * 设置视口缩放
   */
  setZoom(scale: number): void {
    const clampedScale = Math.max(this.state.minZoom, Math.min(this.state.maxZoom, scale))
    if (clampedScale === this.state.scale) return

    this.state.scale = clampedScale
    this.emitViewportChange()
  }

  /**
   * 设置视口位置
   */
  setPan(offsetX: number, offsetY: number): void {
    this.state.offsetX = offsetX
    this.state.offsetY = offsetY
    this.emitViewportChange()
  }

  /**
   * 平移视口（相对值）
   */
  pan(deltaX: number, deltaY: number): void {
    this.setPan(this.state.offsetX + deltaX, this.state.offsetY + deltaY)
  }

  /**
   * 适配所有节点
   */
  fitToNodes(nodeIds: string[], nodes: NodeData[]): void {
    if (nodeIds.length === 0 || nodes.length === 0) return

    // 找到节点的边界
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    nodeIds.forEach((id) => {
      const node = nodes.find((n) => n.id === id)
      if (node && node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x)
        maxX = Math.max(maxX, node.x)
        minY = Math.min(minY, node.y)
        maxY = Math.max(maxY, node.y)
      }
    })

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
      return
    }

    // 计算需要的缩放和位置
    const nodeWidth = maxX - minX
    const nodeHeight = maxY - minY
    const padding = 50

    const scaleX = (this.state.width - padding * 2) / (nodeWidth || 1)
    const scaleY = (this.state.height - padding * 2) / (nodeHeight || 1)
    const scale = Math.min(scaleX, scaleY, this.state.maxZoom)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    this.state.scale = scale
    this.state.offsetX = this.state.width / 2 - centerX * scale
    this.state.offsetY = this.state.height / 2 - centerY * scale

    this.emitViewportChange()
  }

  /**
   * 重置视口
   */
  reset(): void {
    this.state.scale = 1
    this.state.offsetX = 0
    this.state.offsetY = 0
    this.emitViewportChange()
  }

  /**
   * 更新视口尺寸
   */
  setSize(width: number, height: number): void {
    this.state.width = width
    this.state.height = height
    this.emitViewportChange()
  }

  /**
   * 是否点在可见区域内
   */
  isPointVisible(x: number, y: number, padding: number = 0): boolean {
    const bounds = this.getVisibleBounds()
    return (
      x >= bounds.minX - padding &&
      x <= bounds.maxX + padding &&
      y >= bounds.minY - padding &&
      y <= bounds.maxY + padding
    )
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldX: number, worldY: number): { screenX: number; screenY: number } {
    return {
      screenX: worldX * this.state.scale + this.state.offsetX,
      screenY: worldY * this.state.scale + this.state.offsetY
    }
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(screenX: number, screenY: number): { worldX: number; worldY: number } {
    return {
      worldX: (screenX - this.state.offsetX) / this.state.scale,
      worldY: (screenY - this.state.offsetY) / this.state.scale
    }
  }

  /**
   * 发送视口变化事件
   */
  private emitViewportChange(): void {
    this.eventBus.emit('viewport:changed', this.state)
  }
}
