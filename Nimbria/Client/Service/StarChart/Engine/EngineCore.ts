/**
 * EngineCore - Engine 层统一导出和初始化
 * 
 * 职责：
 * - 管理所有 Engine 模块的初始化顺序
 * - 提供统一的 API 接口
 * - 确保依赖关系正确
 */

import type { StarChartEngineAPI } from 'Business/StarChart'
import { SigmaManager } from './SigmaManager/SigmaManager'
import { EventBus } from './EventBus/EventBus'
import { RenderScheduler } from './RenderScheduler/RenderScheduler'
import { ViewportManager } from './ViewportManager/ViewportManager'
import { DataManager, type ChunkLoaderFunction } from './DataManager/DataManager'
import { AsyncTaskManager } from './AsyncTaskManager/AsyncTaskManager'
import { SpatialIndex } from './SpatialIndex/SpatialIndex'

interface EngineCoreOptions {
  container: HTMLElement
  chunkLoader: ChunkLoaderFunction
  sigmaOptions?: {
    renderMode?: 'webgl' | 'canvas'
    renderEdgeLabels?: boolean
    enableEdgeEvents?: boolean
  }
}

export class EngineCore {
  // Engine 模块
  public readonly sigmaManager: SigmaManager
  public readonly eventBus: EventBus
  public readonly dataManager: DataManager
  public readonly renderScheduler: RenderScheduler
  public readonly viewportManager: ViewportManager
  public readonly asyncTask: AsyncTaskManager
  public readonly spatialIndex: SpatialIndex

  private initialized = false

  constructor(private options: EngineCoreOptions) {
    // 1. 创建 EventBus（最先，其他模块依赖它）
    this.eventBus = new EventBus()

    // 2. 创建 SigmaManager（核心依赖）
    this.sigmaManager = new SigmaManager()

    // 3. 创建其他模块（依赖 SigmaManager 和 EventBus）
    this.renderScheduler = new RenderScheduler(this.eventBus, this.sigmaManager)
    this.viewportManager = new ViewportManager(this.eventBus, this.sigmaManager)
    this.asyncTask = new AsyncTaskManager(4)
    this.spatialIndex = new SpatialIndex()
    
    // 4. 创建 DataManager（需要 Graph 实例，延迟到 initialize）
    // 暂时占位，稍后在 initialize 中创建
    this.dataManager = null as any
  }

  /**
   * 初始化 Engine（严格顺序）
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('[EngineCore] Engine 已初始化')
    }

    console.log('[EngineCore] 开始初始化...')

    try {
      // Step 1: 创建 Sigma 和 Graph
      await this.sigmaManager.create(this.options.container, {
        renderMode: this.options.sigmaOptions?.renderMode,
        renderEdgeLabels: this.options.sigmaOptions?.renderEdgeLabels,
        enableEdgeEvents: this.options.sigmaOptions?.enableEdgeEvents
      })

      // Step 2: 创建 DataManager（现在 Graph 已准备好）
      const graph = this.sigmaManager.getGraph()
      this.dataManager = new DataManager(
        graph,
        this.eventBus,
        this.options.chunkLoader
      )

      // Step 3: 初始化 ViewportManager
      this.viewportManager.initialize()

      // Step 4: 绑定 Sigma 事件到 EventBus
      this.eventBus.bindSigmaEvents(this.sigmaManager)

      this.initialized = true
      console.log('[EngineCore] 初始化完成')
      
      this.eventBus.emit('engine:initialized', {
        modules: [
          'SigmaManager',
          'DataManager',
          'RenderScheduler',
          'ViewportManager',
          'AsyncTaskManager',
          'SpatialIndex',
          'EventBus'
        ]
      })
    } catch (error) {
      console.error('[EngineCore] 初始化失败:', error)
      await this.destroy()
      throw error
    }
  }

  /**
   * 销毁 Engine
   */
  async destroy(): Promise<void> {
    console.log('[EngineCore] 开始销毁...')

    // 清空数据
    if (this.dataManager) {
      this.dataManager.clearAll()
    }

    // 销毁 Sigma
    await this.sigmaManager.destroy()

    // 销毁 AsyncTask
    this.asyncTask.destroy()

    // 清空事件
    this.eventBus.clear()

    // 清空空间索引
    this.spatialIndex.clear()

    this.initialized = false
    console.log('[EngineCore] 销毁完成')
  }

  /**
   * 获取 API 接口（给 Graph 层使用）
   */
  getAPI(): StarChartEngineAPI {
    if (!this.initialized) {
      throw new Error('[EngineCore] Engine 未初始化')
    }

    return {
      sigmaManager: this.sigmaManager,
      dataManager: this.dataManager,
      asyncTask: this.asyncTask,
      eventBus: this.eventBus,
      renderScheduler: this.renderScheduler,
      viewportManager: this.viewportManager,
      spatialIndex: this.spatialIndex
    }
  }

  /**
   * 检查是否已初始化
   */
  isReady(): boolean {
    return this.initialized
  }

  /**
   * 获取状态信息
   */
  getStatus() {
    return {
      initialized: this.initialized,
      sigmaReady: this.sigmaManager.isReady(),
      memoryStats: this.dataManager?.getMemoryStats(),
      eventStats: this.eventBus.getStats()
    }
  }
}

