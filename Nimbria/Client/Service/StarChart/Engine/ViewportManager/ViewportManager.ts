/**
 * ViewportManager - 视口管理器
 * 
 * 职责：
 * - 使用 Sigma Camera API 管理视口
 * - 提供坐标转换（基于 Camera）
 * - 视口变化事件通知
 * - 可见区域计算
 */

import type { Camera } from 'sigma/types'
import type { ViewportManagerAPI, ViewportState, VisibleBoundsAPI } from 'Business/StarChart'
import type { EventBus } from '../EventBus/EventBus'
import type { SigmaManager } from '../SigmaManager/SigmaManager'

export class ViewportManager implements ViewportManagerAPI {
  private camera: Camera | null = null
  private initialized = false

  constructor(
    private eventBus: EventBus,
    private sigmaManager: SigmaManager
  ) {}

  /**
   * 初始化（必须在 Sigma 创建后调用）
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('[ViewportManager] 已初始化')
      return
    }

    this.camera = this.sigmaManager.getCamera()
    const sigma = this.sigmaManager.getInstance()

    // 监听 Sigma 的渲染事件，发送视口变化通知
    sigma.on('afterRender', () => {
      this.eventBus.emit('viewport:changed', this.getCurrentViewport())
    })

    this.initialized = true
    console.log('[ViewportManager] 初始化完成')
  }

  /**
   * 获取当前视口状态
   */
  getCurrentViewport(): ViewportState {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    const state = this.camera.getState()
    const dimensions = this.camera.getDimensions()

    return {
      scale: state.ratio,
      offsetX: state.x,
      offsetY: state.y,
      width: dimensions.width,
      height: dimensions.height,
      minZoom: 0.01,
      maxZoom: 10
    }
  }

  /**
   * 获取可见区域边界
   */
  getVisibleBounds(): VisibleBoundsAPI {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    const dimensions = this.camera.getDimensions()

    // 使用 Sigma Camera 的坐标转换（正确的方式）
    const topLeft = this.camera.viewportToGraph({ x: 0, y: 0 })
    const bottomRight = this.camera.viewportToGraph({ 
      x: dimensions.width, 
      y: dimensions.height 
    })

    return {
      minX: topLeft.x,
      maxX: bottomRight.x,
      minY: topLeft.y,
      maxY: bottomRight.y
    }
  }

  /**
   * 设置视口缩放
   */
  setZoom(scale: number): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    // 使用 Sigma Camera 的动画缩放
    this.camera.animatedZoom({ ratio: scale, duration: 300 })
  }

  /**
   * 设置视口位置
   */
  setPan(offsetX: number, offsetY: number): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    this.camera.setState({ x: offsetX, y: offsetY })
  }

  /**
   * 平移视口（相对值）
   */
  pan(deltaX: number, deltaY: number): void {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    const state = this.camera.getState()
    this.camera.setState({
      x: state.x + deltaX,
      y: state.y + deltaY
    })
  }

  /**
   * 适配所有节点到视口
   */
  fitToNodes(nodeIds: string[]): void {
    if (!this.camera || nodeIds.length === 0) return

    const graph = this.sigmaManager.getGraph()
    
    // 计算所有节点的边界
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const nodeId of nodeIds) {
      if (!graph.hasNode(nodeId)) continue
      
      const x = graph.getNodeAttribute(nodeId, 'x') as number
      const y = graph.getNodeAttribute(nodeId, 'y') as number
      
      if (typeof x === 'number' && typeof y === 'number') {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }

    if (!isFinite(minX) || !isFinite(maxX) || !isFinite(minY) || !isFinite(maxY)) {
      console.warn('[ViewportManager] 无有效节点坐标')
      return
    }

    // 计算需要的缩放和中心
    const dimensions = this.camera.getDimensions()
    const graphWidth = maxX - minX
    const graphHeight = maxY - minY
    const padding = 50

    const scaleX = (dimensions.width - padding * 2) / (graphWidth || 1)
    const scaleY = (dimensions.height - padding * 2) / (graphHeight || 1)
    const ratio = Math.min(scaleX, scaleY, 10) // maxZoom = 10

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    // 使用 Camera 动画
    this.camera.animate(
      { x: centerX, y: centerY, ratio },
      { duration: 500 }
    )
  }

  /**
   * 重置视口
   */
  reset(): void {
    if (!this.camera) return

    this.camera.animatedReset({ duration: 500 })
  }

  /**
   * 世界坐标转屏幕坐标（使用 Camera API）
   */
  worldToScreen(worldX: number, worldY: number): { screenX: number; screenY: number } {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    const viewport = this.camera.graphToViewport({ x: worldX, y: worldY })
    return {
      screenX: viewport.x,
      screenY: viewport.y
    }
  }

  /**
   * 屏幕坐标转世界坐标（使用 Camera API）
   */
  screenToWorld(screenX: number, screenY: number): { worldX: number; worldY: number } {
    if (!this.camera) {
      throw new Error('[ViewportManager] Camera 未初始化')
    }

    const graph = this.camera.viewportToGraph({ x: screenX, y: screenY })
    return {
      worldX: graph.x,
      worldY: graph.y
    }
  }

  /**
   * 检查点是否可见
   */
  isPointVisible(x: number, y: number, padding = 0): boolean {
    const bounds = this.getVisibleBounds()
    return (
      x >= bounds.minX - padding &&
      x <= bounds.maxX + padding &&
      y >= bounds.minY - padding &&
      y <= bounds.maxY + padding
    )
  }

  /**
   * 获取待更新数量
   */
  getPendingUpdateCount(): number {
    return this.pendingUpdates.size
  }

  /**
   * 获取状态
   */
  getState(): RenderState {
    return {
      pendingUpdates: new Map(this.pendingUpdates),
      lastRenderTime: this.lastRenderTime,
      isScheduled: this.updateScheduled
    }
  }

  /**
   * 调度刷新
   */
  private scheduleFlush(): void {
    if (this.updateScheduled) return

    this.updateScheduled = true

    requestAnimationFrame(() => {
      this.flushRender()
      this.updateScheduled = false
    })
  }

  setFrameRateLimit(fps: number): void {
    console.log(`[RenderScheduler] 帧率由 Sigma.js 自动管理，目标 ${fps}fps`)
  }
}
