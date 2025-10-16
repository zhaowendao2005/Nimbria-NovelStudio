// src-electron/services/star-chart-service/star-chart-service.ts
import { EventEmitter } from 'events'
import { StarChartManager } from './star-chart-manager'
import type { StarChartInitEvent, StarChartProjectCreatedEvent, StarChartErrorEvent } from './types'

export interface StarChartServiceEvents {
  'starchart:init-start': StarChartInitEvent
  'starchart:init-complete': StarChartInitEvent
  'starchart:init-error': StarChartErrorEvent
  'starchart:project-create-start': { operationId: string; projectPath: string }
  'starchart:project-created': StarChartProjectCreatedEvent
  'starchart:project-error': StarChartErrorEvent
}

export class StarChartService extends EventEmitter {
  private starChartManager: StarChartManager
  private projectStarCharts: Map<string, any> = new Map()
  private isInitialized = false

  constructor() {
    super()
    this.starChartManager = new StarChartManager()
  }

  /**
   * ✅ 事件驱动方法：立即返回initId，通过事件反馈状态
   */
  async initialize(): Promise<string> {
    const initId = `starchart-init-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    this.emit('starchart:init-start', { initId })
    
    setImmediate(async () => {
      try {
        await this.starChartManager.initialize()
        this.isInitialized = true
        this.emit('starchart:init-complete', { initId, success: true })
      } catch (error) {
        this.emit('starchart:init-error', { 
          initId, 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    })
    
    return initId
  }

  /**
   * ✅ 创建项目的 StarChart 数据库
   */
  async createProjectStarChart(projectPath: string): Promise<string> {
    const operationId = `create-starchart-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    this.emit('starchart:project-create-start', { operationId, projectPath })
    
    setImmediate(async () => {
      try {
        if (!this.isInitialized) {
          throw new Error('StarChart service not initialized')
        }

        const starChartPath = await this.starChartManager.createProjectStarChart(projectPath)
        
        // 初始化测试：写入创建时间
        const gun = this.starChartManager.getProjectGun(projectPath)
        if (gun) {
          gun.get('metadata').put({
            created_at: Date.now(),
            version: '1.0.0'
          })
        }
        
        this.emit('starchart:project-created', {
          operationId,
          projectPath,
          starChartPath
        })
        
      } catch (error) {
        this.emit('starchart:project-error', {
          operationId,
          projectPath,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    })
    
    return operationId
  }

  /**
   * ✅ 加载项目的 StarChart 数据库（重启后自动调用）
   */
  async loadProjectStarChart(projectPath: string): Promise<string | null> {
    return await this.starChartManager.loadProjectStarChart(projectPath)
  }

  /**
   * 获取项目的 StarChart 实例
   */
  getProjectStarChart(projectPath: string) {
    return this.starChartManager.getProjectGun(projectPath)
  }

  /**
   * 关闭项目的 StarChart
   */
  async closeProjectStarChart(projectPath: string): Promise<void> {
    await this.starChartManager.closeProjectStarChart(projectPath)
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    await this.starChartManager.cleanup()
    this.projectStarCharts.clear()
    this.isInitialized = false
  }
}

// 类型增强
declare interface StarChartService {
  on<K extends keyof StarChartServiceEvents>(
    event: K, 
    listener: (data: StarChartServiceEvents[K]) => void
  ): this
  emit<K extends keyof StarChartServiceEvents>(
    event: K, 
    data: StarChartServiceEvents[K]
  ): boolean
}

