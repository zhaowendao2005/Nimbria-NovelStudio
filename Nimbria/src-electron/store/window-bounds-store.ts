import { app, screen } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'

export interface WindowBoundsData {
  id: string
  type: 'main' | 'project'
  projectPath?: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isMaximized: boolean
  lastSavedAt: string
}

/**
 * 窗口位置持久化管理器
 * 负责保存和恢复窗口的位置信息，支持多窗口场景
 */
export class WindowBoundsStore {
  private storagePath: string
  private boundsCache: Map<string, WindowBoundsData> = new Map()
  private isDirty = false

  constructor() {
    this.storagePath = path.join(app.getPath('userData'), 'window-bounds.json')
  }

  /**
   * 初始化存储，加载已保存的数据
   */
  async initialize(): Promise<void> {
    try {
      if (existsSync(this.storagePath)) {
        const data = await fs.readFile(this.storagePath, 'utf-8')
        const boundsArray: WindowBoundsData[] = JSON.parse(data)
        
        for (const bounds of boundsArray) {
          this.boundsCache.set(bounds.id, bounds)
        }
      }
    } catch (error) {
      console.error('Failed to load window bounds:', error)
      this.boundsCache.clear()
    }
  }

  /**
   * 获取指定窗口的保存的位置信息
   */
  getBounds(windowId: string): WindowBoundsData | null {
    return this.boundsCache.get(windowId) ?? null
  }

  /**
   * 保存窗口位置信息
   */
  async saveBounds(
    windowId: string,
    bounds: { x: number; y: number; width: number; height: number },
    isMaximized: boolean,
    projectPath?: string
  ): Promise<void> {
    const data: WindowBoundsData = {
      id: windowId,
      type: windowId === 'main' ? 'main' : 'project',
      ...(projectPath !== undefined && { projectPath }),
      bounds,
      isMaximized,
      lastSavedAt: new Date().toISOString()
    }

    this.boundsCache.set(windowId, data)
    this.isDirty = true

    // 异步写入文件，防止阻塞主线程
    await this.flushToDisk()
  }

  /**
   * 验证bounds是否有效（在屏幕范围内）
   */
  private isValidBounds(bounds: WindowBoundsData['bounds']): boolean {
    const allDisplays = screen.getAllDisplays()
    
    // 如果没有显示器，认为无效
    if (allDisplays.length === 0) {
      return false
    }

    // 计算所有显示器的总范围
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const display of allDisplays) {
      const { x, y, width, height } = display.bounds
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x + width)
      maxY = Math.max(maxY, y + height)
    }

    // 检查窗口的主要部分是否在有效范围内
    const windowRight = bounds.x + bounds.width
    const windowBottom = bounds.y + bounds.height

    // 窗口至少有一部分要在屏幕范围内，且宽高合理
    const isPartiallyVisible =
      windowRight > minX &&
      bounds.x < maxX &&
      windowBottom > minY &&
      bounds.y < maxY

    const hasValidSize = bounds.width > 200 && bounds.height > 150

    return isPartiallyVisible && hasValidSize
  }

  /**
   * 应用保存的bounds到BrowserWindow配置
   * 如果saved bounds无效或不存在，返回null供caller使用默认值
   */
  getApplicableBounds(windowId: string): Partial<{ x: number; y: number; width: number; height: number }> | null {
    const saved = this.boundsCache.get(windowId)
    
    if (!saved) {
      return null
    }

    // 验证bounds有效性
    if (!this.isValidBounds(saved.bounds)) {
      console.warn(`Saved bounds for window ${windowId} are invalid, falling back to defaults`)
      this.boundsCache.delete(windowId)
      return null
    }

    return {
      x: saved.bounds.x,
      y: saved.bounds.y,
      width: saved.bounds.width,
      height: saved.bounds.height
    }
  }

  /**
   * 获取是否需要最大化该窗口
   */
  shouldMaximize(windowId: string): boolean {
    const saved = this.boundsCache.get(windowId)
    return saved?.isMaximized ?? false
  }

  /**
   * 删除指定窗口的保存记录
   */
  async removeBounds(windowId: string): Promise<void> {
    if (this.boundsCache.has(windowId)) {
      this.boundsCache.delete(windowId)
      this.isDirty = true
      await this.flushToDisk()
    }
  }

  /**
   * 清空所有保存的窗口位置
   */
  async clear(): Promise<void> {
    this.boundsCache.clear()
    this.isDirty = true
    await this.flushToDisk()
  }

  /**
   * 将数据写入磁盘
   */
  private async flushToDisk(): Promise<void> {
    if (!this.isDirty) {
      return
    }

    try {
      const boundsArray = Array.from(this.boundsCache.values())
      const json = JSON.stringify(boundsArray, null, 2)
      
      // 确保目录存在
      const dir = path.dirname(this.storagePath)
      await fs.mkdir(dir, { recursive: true })
      
      await fs.writeFile(this.storagePath, json, 'utf-8')
      this.isDirty = false
    } catch (error) {
      console.error('Failed to save window bounds:', error)
    }
  }

  /**
   * 获取存储文件路径（用于调试）
   */
  getStoragePath(): string {
    return this.storagePath
  }
}
