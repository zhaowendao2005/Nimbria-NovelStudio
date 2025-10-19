/**
 * MultiRootRadialPlugin 初始化优化器
 * 
 * 将初始化过程拆分为多个阶段，在 Web Worker 中执行
 * 提供细粒度的进度反馈
 */

import type { G6GraphData, TreeNodeData } from '../../types/g6.types'
import type { LayoutOptions } from '../types'
import type { 
  IInitializationOptimizer,
  InitializationResult,
  PerformanceMetrics
} from '../types/initializer.types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'
import type { RadialAdapterOutput } from './data.types'
import { PerformanceTimer } from '../types/initializer.types'
import { DataAdaptStage } from './optimizer/dataAdaptStage'
import { LayoutCalcStage } from './optimizer/layoutCalcStage'
import { StyleGenStage } from './optimizer/styleGenStage'

/**
 * 多根径向树布局初始化优化器
 */
export class MultiRootRadialInitializationOptimizer implements IInitializationOptimizer {
  private timer: PerformanceTimer
  private dataAdaptStage: DataAdaptStage
  private layoutCalcStage: LayoutCalcStage
  private styleGenStage: StyleGenStage
  
  constructor() {
    this.timer = new PerformanceTimer()
    this.dataAdaptStage = new DataAdaptStage()
    this.layoutCalcStage = new LayoutCalcStage()
    this.styleGenStage = new StyleGenStage()
  }
  
  /**
   * 执行优化的初始化
   */
  async initializeOptimized(
    data: G6GraphData | TreeNodeData,
    options: LayoutOptions,
    onProgress: (progress: InitializationProgressMessage) => void
  ): Promise<InitializationResult> {
    console.log('[MultiRootRadialInitializer] 开始优化初始化流程')
    console.time('[MultiRootRadialInitializer] 总耗时')
    
    this.timer.start()
    
    try {
      // ===== 阶段 1: 数据适配 (0-20%) =====
      console.log('[MultiRootRadialInitializer] 阶段1: 数据适配')
      const adaptedData: RadialAdapterOutput = this.dataAdaptStage.execute(data, onProgress)
      this.timer.mark('data-adapt-complete')
      
      // ===== 阶段 2: 布局计算 (20-50%) =====
      console.log('[MultiRootRadialInitializer] 阶段2: 布局计算')
      const layoutResult = await this.layoutCalcStage.execute(
        adaptedData,
        options,
        onProgress
      )
      this.timer.mark('layout-calc-complete')
      
      // ===== 阶段 3: 样式生成并应用 (50-70%) =====
      console.log('[MultiRootRadialInitializer] 阶段3: 样式生成')
      const styledLayoutResult = await this.styleGenStage.execute(
        layoutResult,
        onProgress
      )
      this.timer.mark('style-gen-complete')
      
      // ===== 收集性能指标 =====
      const performanceMetrics = this.collectPerformanceMetrics(
        adaptedData.nodes?.length || 0
      )
      
      console.log('[MultiRootRadialInitializer] 初始化完成')
      console.log('[MultiRootRadialInitializer] 性能指标:', performanceMetrics)
      console.timeEnd('[MultiRootRadialInitializer] 总耗时')
      
      // 返回结果（样式已应用到 layoutResult 中）
      return {
        layoutResult: styledLayoutResult,
        performanceMetrics
      }
      
    } catch (error) {
      console.error('[MultiRootRadialInitializer] 初始化失败:', error)
      
      // 发送错误进度消息
      onProgress({
        type: 'progress',
        stage: 'error',
        stageProgress: { dataAdapt: 0, layoutCalc: 0, styleGen: 0 },
        message: '初始化失败',
        details: {},
        error: error instanceof Error ? error.message : String(error),
        ...(error instanceof Error && error.stack ? { errorStack: error.stack } : {})
      })
      
      throw error
    }
  }
  
  /**
   * 收集性能指标
   */
  private collectPerformanceMetrics(nodeCount: number): PerformanceMetrics {
    const dataAdaptTime = this.timer.getMeasure('data-adapt-complete')
    const layoutCalcTime = this.timer.getMeasureBetween(
      'data-adapt-complete',
      'layout-calc-complete'
    )
    const styleGenTime = this.timer.getMeasureBetween(
      'layout-calc-complete',
      'style-gen-complete'
    )
    const totalTime = this.timer.getElapsedTime()
    
    // 计算节点处理速度
    const nodesPerSecond = nodeCount / (totalTime / 1000)
    
    return {
      dataAdaptTime: Math.round(dataAdaptTime),
      layoutCalcTime: Math.round(layoutCalcTime),
      styleGenTime: Math.round(styleGenTime),
      totalTime: Math.round(totalTime),
      nodesPerSecond: Math.round(nodesPerSecond)
    }
  }
}

// 导出单例
export const multiRootRadialOptimizer = new MultiRootRadialInitializationOptimizer()

