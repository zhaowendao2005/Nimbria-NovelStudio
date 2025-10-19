/**
 * StarChart 初始化 Worker
 * 
 * 作为消息转发壳子，根据插件名称路由到对应的初始化优化器
 * 真实的计算逻辑在各插件内部实现
 */

import type {
  InitializationWorkerMessage,
  InitializationProgressMessage,
  InitializationResultMessage,
  WorkerMessage
} from '@service/starChart/types/worker.types'

/**
 * Worker 全局上下文
 */
const ctx: Worker = self as unknown as Worker

/**
 * 当前正在执行的初始化任务
 */
let currentTask: Promise<unknown> | null = null
let isCancelled = false

/**
 * 消息处理器
 */
ctx.onmessage = async (event: MessageEvent<InitializationWorkerMessage>) => {
  const { command, pluginName, data, userConfig } = event.data
  
  console.log(`[StarChartInitWorker] 收到命令: ${command}, 插件: ${pluginName}`)
  
  switch (command) {
    case 'start-init':
      await handleStartInitialization(pluginName, data, userConfig)
      break
      
    case 'cancel':
      handleCancel()
      break
      
    case 'pause':
      // TODO: 实现暂停功能
      console.log('[StarChartInitWorker] 暂停功能待实现')
      break
      
    case 'resume':
      // TODO: 实现恢复功能
      console.log('[StarChartInitWorker] 恢复功能待实现')
      break
      
    default:
      console.error(`[StarChartInitWorker] 未知命令: ${command}`)
  }
}

/**
 * 处理初始化任务
 */
async function handleStartInitialization(
  pluginName: string,
  data: InitializationWorkerMessage['data'],
  userConfig?: InitializationWorkerMessage['userConfig']
): Promise<void> {
  // 重置取消标志
  isCancelled = false
  
  const startTime = performance.now()
  
  try {
    // 动态导入对应插件的优化器
    console.log(`[StarChartInitWorker] 正在加载插件: ${pluginName}`)
    
    const pluginModule = await loadPluginOptimizer(pluginName)
    
    if (!pluginModule || !pluginModule.optimizer) {
      throw new Error(`插件 ${pluginName} 不支持优化初始化或未正确导出优化器`)
    }
    
    console.log(`[StarChartInitWorker] 插件加载成功，开始初始化`)
    
    // 执行优化初始化
    currentTask = pluginModule.optimizer.initializeOptimized(
      data.graphData,
      {
        width: data.containerWidth,
        height: data.containerHeight
      },
      (progress: InitializationProgressMessage) => {
        // 检查是否已取消
        if (isCancelled) {
          throw new Error('初始化已取消')
        }
        
        // 转发进度消息到主线程
        postProgressMessage(progress)
      }
    )
    
    const result = await currentTask
    
    // 检查是否在完成前被取消
    if (isCancelled) {
      postResultMessage({
        type: 'result',
        status: 'cancelled'
      })
      return
    }
    
    // 计算总耗时
    const totalTime = performance.now() - startTime
    
    // 发送成功结果
    postResultMessage({
      type: 'result',
      status: 'success',
      result: {
        ...result,
        performanceMetrics: {
          ...result.performanceMetrics,
          totalTime: Math.round(totalTime)
        }
      }
    })
    
    console.log(`[StarChartInitWorker] 初始化完成，总耗时: ${Math.round(totalTime)}ms`)
    
  } catch (error) {
    console.error('[StarChartInitWorker] 初始化失败:', error)
    
    // 发送错误结果
    postResultMessage({
      type: 'result',
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof Error && error.stack ? { errorStack: error.stack } : {})
    })
  } finally {
    currentTask = null
  }
}

/**
 * 处理取消命令
 */
function handleCancel(): void {
  console.log('[StarChartInitWorker] 收到取消命令')
  isCancelled = true
  
  // 注意：实际的取消需要在初始化过程中检查 isCancelled 标志
  // 这里只是设置标志，真正的中断在执行过程中
}

/**
 * 动态加载插件优化器
 */
async function loadPluginOptimizer(pluginName: string): Promise<{
  optimizer: {
    initializeOptimized: (...args: unknown[]) => Promise<unknown>
  }
} | null> {
  try {
    switch (pluginName) {
      case 'multi-root-radial': {
        // 动态导入 MultiRootRadialPlugin 的优化器
        const module = await import(
          '../stores/projectPage/starChart/plugins/MultiRootRadialPlugin/index'
        )
        return {
          optimizer: module.multiRootRadialOptimizer
        }
      }
      
      // 未来可以添加更多插件
      // case 'other-plugin': {
      //   const module = await import('./path/to/other/plugin')
      //   return { optimizer: module.otherPluginOptimizer }
      // }
      
      default:
        console.error(`[StarChartInitWorker] 未知插件: ${pluginName}`)
        return null
    }
  } catch (error) {
    console.error(`[StarChartInitWorker] 加载插件失败: ${pluginName}`, error)
    throw new Error(`无法加载插件 ${pluginName}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 发送进度消息到主线程
 */
function postProgressMessage(progress: InitializationProgressMessage): void {
  ctx.postMessage(progress)
}

/**
 * 发送结果消息到主线程
 */
function postResultMessage(result: InitializationResultMessage): void {
  ctx.postMessage(result)
}

/**
 * 错误处理
 */
ctx.onerror = (error) => {
  console.error('[StarChartInitWorker] Worker 错误:', error)
  postResultMessage({
    type: 'result',
    status: 'error',
    error: error.message || 'Worker 发生未知错误'
  })
}

console.log('[StarChartInitWorker] Worker 已启动并就绪')

