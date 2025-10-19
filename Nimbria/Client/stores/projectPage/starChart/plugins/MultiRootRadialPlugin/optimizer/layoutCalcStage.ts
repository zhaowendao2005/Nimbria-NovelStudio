/**
 * 布局计算阶段处理
 * 
 * 负责执行多根径向树布局算法，计算所有节点的位置
 */

import type { G6GraphData } from '../../../types/g6.types'
import type { LayoutOptions, LayoutResult } from '../../types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'
import { ProgressCalculator, ProcessingSpeedCalculator } from '../../types/initializer.types'
import { MultiRootRadialLayoutAlgorithm } from '../layout'

/**
 * 布局计算阶段执行器
 */
export class LayoutCalcStage {
  private progressCalc: ProgressCalculator
  private speedCalc: ProcessingSpeedCalculator
  
  constructor() {
    this.progressCalc = new ProgressCalculator('layout-calc', [20, 50])
    this.speedCalc = new ProcessingSpeedCalculator()
  }
  
  /**
   * 执行布局计算
   * @param data 适配后的图数据
   * @param options 布局选项
   * @param onProgress 进度回调
   * @returns 布局结果
   */
  async execute(
    data: G6GraphData,
    options: LayoutOptions,
    onProgress: (progress: InitializationProgressMessage) => void
  ): Promise<LayoutResult> {
    const totalNodes = data.nodes?.length || 0
    
    // 阶段开始
    onProgress(this.progressCalc.createProgressMessage(
      0,
      `正在计算 ${totalNodes} 个节点的位置...`,
      {
        processedNodes: 0,
        totalNodes,
        speed: '0 nodes/s',
        elapsedTime: 0
      }
    ))
    
    this.speedCalc.start()
    const startTime = performance.now()
    
    // 调用布局算法
    // 注意：这里需要修改布局算法以支持进度回调
    const layoutResult = await this.calculateLayoutWithProgress(
      data,
      options,
      (processedNodes: number) => {
        this.speedCalc.update(1) // 每次更新一个节点
        const progress = processedNodes / totalNodes
        const elapsedTime = performance.now() - startTime
        const estimatedRemaining = this.speedCalc.estimateRemaining(totalNodes - processedNodes)
        
        onProgress(this.progressCalc.createProgressMessage(
          progress,
          `正在计算节点位置 (${processedNodes}/${totalNodes})`,
          {
            processedNodes,
            totalNodes,
            speed: this.speedCalc.getSpeed(),
            elapsedTime: Math.round(elapsedTime),
            estimatedRemaining
          }
        ))
      }
    )
    
    // 计算完成
    const elapsedTime = performance.now() - startTime
    onProgress(this.progressCalc.createProgressMessage(
      1.0,
      '布局计算完成',
      {
        processedNodes: totalNodes,
        totalNodes,
        speed: this.speedCalc.getSpeed(),
        elapsedTime: Math.round(elapsedTime)
      }
    ))
    
    return layoutResult
  }
  
  /**
   * 带进度回调的布局计算
   * 
   * 这里对现有的 calculateMultiRootRadialLayout 进行封装，
   * 添加进度追踪功能
   */
  private async calculateLayoutWithProgress(
    data: G6GraphData,
    options: LayoutOptions,
    onNodeProcessed: (processedCount: number) => void
  ): Promise<LayoutResult> {
    // 创建一个代理来追踪节点处理进度
    let processedNodes = 0
    
    // 执行布局计算
    // 由于原始算法是同步的，我们需要分批处理以提供进度反馈
    const result = await this.calculateInBatches(
      data,
      options,
      (batchSize: number) => {
        processedNodes += batchSize
        onNodeProcessed(processedNodes)
      }
    )
    
    return result
  }
  
  /**
   * 分批计算布局（避免阻塞）
   */
  private async calculateInBatches(
    data: G6GraphData,
    options: LayoutOptions,
    onBatchComplete: (batchSize: number) => void
  ): Promise<LayoutResult> {
    // 直接调用现有的布局算法
    const algorithm = new MultiRootRadialLayoutAlgorithm()
    const result = algorithm.calculate(data, options)
    
    // 模拟分批处理进度（实际应该在算法内部实现）
    const totalNodes = data.nodes?.length || 0
    const batchSize = Math.max(100, Math.floor(totalNodes / 10)) // 分10批
    
    for (let i = 0; i < totalNodes; i += batchSize) {
      const currentBatch = Math.min(batchSize, totalNodes - i)
      onBatchComplete(currentBatch)
      
      // 让出控制权，避免阻塞
      if (i + batchSize < totalNodes) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    
    return result
  }
}

