/**
 * 初始化管理器
 * 
 * 负责管理 Web Worker 的生命周期，处理主线程与 Worker 之间的通信
 */

import type { LayoutOptions } from '@stores/projectPage/starChart/plugins/types'
import type {
  InitializationWorkerMessage,
  InitializationProgressMessage,
  InitializationResultMessage,
  WorkerMessage
} from '@service/starChart/types/worker.types'

/**
 * 初始化配置
 */
export interface InitializationConfig {
  pluginName: string
  graphData: InitializationWorkerMessage['data']['graphData']
  layoutOptions: LayoutOptions
  rendererType: 'canvas' | 'webgl' | 'svg'
  webglOptimization?: InitializationWorkerMessage['data']['webglOptimization']
}

/**
 * 初始化结果
 */
export interface InitializationCompleteResult {
  layoutResult: unknown
  finalStyles: unknown
  performanceMetrics: {
    dataAdaptTime: number
    layoutCalcTime: number
    styleGenTime: number
    totalTime: number
    nodesPerSecond?: number
  }
}

/**
 * 初始化管理器
 */
export class InitializationManager {
  private worker: Worker | null = null
  private progressCallback: ((msg: InitializationProgressMessage) => void) | null = null
  private completeCallback: ((result: InitializationCompleteResult) => void) | null = null
  private errorCallback: ((error: string) => void) | null = null
  private isInitializing = false
  
  /**
   * 开始初始化
   */
  startInitialization(
    config: InitializationConfig,
    onProgress: (msg: InitializationProgressMessage) => void,
    onComplete: (result: InitializationCompleteResult) => void,
    onError: (error: string) => void
  ): void {
    if (this.isInitializing) {
      console.warn('[InitializationManager] 初始化正在进行中，忽略新请求')
      return
    }
    
    console.log('[InitializationManager] 开始初始化流程')
    console.log('[InitializationManager] 插件:', config.pluginName)
    console.log('[InitializationManager] 节点数:', (config.graphData as G6GraphData).nodes?.length || 0)
    
    this.isInitializing = true
    this.progressCallback = onProgress
    this.completeCallback = onComplete
    this.errorCallback = onError
    
    try {
      // 创建 Worker
      this.createWorker()
      
      // 发送初始化消息
      const messageData: InitializationWorkerMessage['data'] = {
        graphData: config.graphData,
        layoutOptions: config.layoutOptions,
        containerWidth: config.layoutOptions.width || 800,
        containerHeight: config.layoutOptions.height || 600,
        rendererType: config.rendererType
      }
      
      // 只有在有值时才添加 webglOptimization
      if (config.webglOptimization) {
        messageData.webglOptimization = config.webglOptimization
      }
      
      const message: InitializationWorkerMessage = {
        command: 'start-init',
        pluginName: config.pluginName,
        data: messageData
      }
      
      console.log('[InitializationManager] 发送初始化消息到 Worker')
      this.worker?.postMessage(message)
      
    } catch (error) {
      console.error('[InitializationManager] 初始化失败:', error)
      this.handleError(error instanceof Error ? error.message : String(error))
      this.cleanup()
    }
  }
  
  /**
   * 取消初始化
   */
  cancel(): void {
    if (!this.isInitializing) {
      console.warn('[InitializationManager] 没有正在进行的初始化')
      return
    }
    
    console.log('[InitializationManager] 取消初始化')
    
    // 发送取消命令
    if (this.worker) {
      this.worker.postMessage({
        command: 'cancel'
      } as InitializationWorkerMessage)
    }
    
    // 终止 Worker
    this.cleanup()
  }
  
  /**
   * 暂停初始化（TODO）
   */
  pause(): void {
    if (!this.isInitializing) {
      console.warn('[InitializationManager] 没有正在进行的初始化')
      return
    }
    
    console.log('[InitializationManager] 暂停初始化')
    this.worker?.postMessage({
      command: 'pause'
    } as InitializationWorkerMessage)
  }
  
  /**
   * 恢复初始化（TODO）
   */
  resume(): void {
    console.log('[InitializationManager] 恢复初始化')
    this.worker?.postMessage({
      command: 'resume'
    } as InitializationWorkerMessage)
  }
  
  /**
   * 创建 Worker
   */
  private createWorker(): void {
    try {
      // 使用 new URL() 语法创建 Worker（Vite/Webpack 5 推荐）
      this.worker = new Worker(
        new URL('../../workers/starchartInit.worker.ts', import.meta.url),
        { type: 'module' }
      )
      
      // 监听消息
      this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(event.data)
      }
      
      // 监听错误
      this.worker.onerror = (error) => {
        console.error('[InitializationManager] Worker 错误:', error)
        this.handleError(`Worker 错误: ${error.message}`)
      }
      
      console.log('[InitializationManager] Worker 创建成功')
    } catch (error) {
      console.error('[InitializationManager] 创建 Worker 失败:', error)
      throw new Error(`无法创建 Worker: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(message: WorkerMessage): void {
    if (message.type === 'progress') {
      // 进度消息
      this.handleProgress(message as InitializationProgressMessage)
    } else if (message.type === 'result') {
      // 结果消息
      this.handleResult(message as InitializationResultMessage)
    } else {
      console.warn('[InitializationManager] 未知消息类型:', message)
    }
  }
  
  /**
   * 处理进度消息
   */
  private handleProgress(progress: InitializationProgressMessage): void {
    if (this.progressCallback) {
      this.progressCallback(progress)
    }
    
    // 如果是错误阶段，也调用错误回调
    if (progress.stage === 'error' && progress.error) {
      this.handleError(progress.error)
    }
  }
  
  /**
   * 处理结果消息
   */
  private handleResult(result: InitializationResultMessage): void {
    console.log('[InitializationManager] 收到结果:', result.status)
    
    if (result.status === 'success' && result.result) {
      // 成功完成
      if (this.completeCallback) {
        this.completeCallback(result.result as InitializationCompleteResult)
      }
    } else if (result.status === 'error') {
      // 错误
      this.handleError(result.error || '初始化失败')
    } else if (result.status === 'cancelled') {
      // 已取消
      console.log('[InitializationManager] 初始化已取消')
      if (this.errorCallback) {
        this.errorCallback('初始化已取消')
      }
    }
    
    // 清理
    this.cleanup()
  }
  
  /**
   * 处理错误
   */
  private handleError(error: string): void {
    console.error('[InitializationManager] 错误:', error)
    
    if (this.errorCallback) {
      this.errorCallback(error)
    }
  }
  
  /**
   * 清理资源
   */
  private cleanup(): void {
    console.log('[InitializationManager] 清理资源')
    
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    
    this.isInitializing = false
    this.progressCallback = null
    this.completeCallback = null
    this.errorCallback = null
  }
  
  /**
   * 获取初始化状态
   */
  get isRunning(): boolean {
    return this.isInitializing
  }
}

// 导出单例
export const initializationManager = new InitializationManager()

