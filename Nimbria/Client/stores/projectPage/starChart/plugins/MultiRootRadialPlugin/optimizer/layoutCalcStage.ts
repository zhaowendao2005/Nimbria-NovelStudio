/**
 * 布局计算阶段处理
 * 
 * 负责执行多根径向树布局算法，计算所有节点的位置
 */

import type { LayoutOptions, LayoutResult } from '../../types'
import type { InitializationProgressMessage } from '@service/starChart/types/worker.types'
import { ProgressCalculator, ProcessingSpeedCalculator } from '../../types/initializer.types'
import { MultiRootRadialLayoutAlgorithm } from '../layout'
import type { RadialAdapterOutput } from '../data.types'

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
   * @param data 适配后的图数据（包含完整树结构）
   * @param options 布局选项
   * @param onProgress 进度回调
   * @returns 布局结果
   */
  async execute(
    data: RadialAdapterOutput,
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
    data: RadialAdapterOutput,
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
   * 分批计算布局（真正的异步，避免阻塞）
   */
  private async calculateInBatches(
    data: RadialAdapterOutput,
    options: LayoutOptions,
    onBatchComplete: (batchSize: number) => void
  ): Promise<LayoutResult> {
    console.log('[LayoutCalcStage] 🚀 开始异步分批布局计算')
    
    const algorithm = new MultiRootRadialLayoutAlgorithm()
    const totalNodes = data.nodes?.length || 0
    
    // ===== 使用异步计算方法（内部分批） =====
    // 构建完整的 LayoutConfig（包含 rootIds 和默认值）
    const layoutConfig = {
      width: options.width || 800,
      height: options.height || 600,
      center: options.center || [400, 300],
      rootIds: data.rootIds
    }
    
    const result = await algorithm.calculateAsync(
      data,
      layoutConfig,
      (stage, processed, total) => {
        // 布局进度回调
        const progress = total > 0 ? processed / total : 0
        console.log(`[LayoutCalcStage] 📊 ${stage} 进度: ${processed}/${total} (${Math.round(progress * 100)}%)`)
        onBatchComplete(Math.min(processed, totalNodes))
      }
    )
    
    console.log('[LayoutCalcStage] ✅ 异步布局计算完成')
    
    return result
  }
}

