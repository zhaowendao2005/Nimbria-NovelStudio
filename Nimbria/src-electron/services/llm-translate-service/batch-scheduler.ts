/**
 * BatchScheduler - 批次任务调度器
 * 
 * 职责：
 * - 管理任务队列（waiting → sending）
 * - 控制并发数（maxConcurrency）
 * - 处理任务完成和错误
 * - 限流暂停和恢复
 * 
 * 设计理念：
 * - 事件驱动：监听 TaskStateManager 的事件来触发调度
 * - 最小侵入：不修改 TranslationExecutor，仅作为上层协调者
 * - 内存维护：所有调度状态在内存中，不写数据库
 */

import { EventEmitter } from 'events'
import type { TranslationExecutor } from './translation-executor'
import type { TaskStateManager } from './task-state-manager'
import type { ThrottleProbe } from './throttle-probe'
import type { TranslateConfig } from '../../types/LlmTranslate'

export interface BatchSchedulerOptions {
  batchId: string
  taskIds: string[]
  maxConcurrency: number
  config: TranslateConfig
  executor: TranslationExecutor
  stateManager: TaskStateManager
  probe?: ThrottleProbe | undefined
}

export interface SchedulerStatus {
  state: 'idle' | 'running' | 'paused' | 'throttled' | 'completed'
  waitingCount: number
  activeCount: number
  completedCount: number
  errorCount: number
  throttledUntil: number | undefined
}

export class BatchScheduler extends EventEmitter {
  private batchId: string
  private waitingQueue: string[] = []
  private activeSet: Set<string> = new Set()
  private completedSet: Set<string> = new Set()
  private errorSet: Set<string> = new Set()
  
  private maxConcurrency: number
  private config: TranslateConfig
  private isRunning: boolean = false
  private isPaused: boolean = false
  private isThrottled: boolean = false
  private throttledUntil: number = 0
  
  private executor: TranslationExecutor
  private stateManager: TaskStateManager
  private probe?: ThrottleProbe
  
  // 🆕 调度策略相关
  private schedulingStrategy: 'timed' | 'event'
  private timedInterval?: number
  private timedIntervalTimer?: NodeJS.Timeout
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private taskCompleteListener?: (...args: any[]) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private taskErrorListener?: (...args: any[]) => void
  private probeRecoveredListener?: () => void

  constructor(options: BatchSchedulerOptions) {
    super()
    
    this.batchId = options.batchId
    this.maxConcurrency = options.maxConcurrency
    this.config = options.config
    this.executor = options.executor
    this.stateManager = options.stateManager
    if (options.probe) {
      this.probe = options.probe
    }
    
    // 🆕 调度策略配置
    this.schedulingStrategy = options.config.schedulerConfig?.schedulingStrategy ?? 'event'
    // timedInterval 边界检查：限制在 1-10 秒之间
    const rawInterval = options.config.schedulerConfig?.timedInterval ?? 2
    this.timedInterval = Math.max(1, Math.min(10, rawInterval))
    
    // 初始化等待队列（所有传入的任务）
    this.waitingQueue = [...options.taskIds]
    
    console.log(`🎯 [BatchScheduler] 初始化调度器: batchId=${this.batchId}, tasks=${options.taskIds.length}, maxConcurrency=${this.maxConcurrency}`)
    console.log(`📋 [BatchScheduler] 调度策略: ${this.schedulingStrategy}${this.schedulingStrategy === 'timed' ? ` (间隔${this.timedInterval}秒)` : ''}`)
  }

  /**
   * 启动调度器
   */
  start(): void {
    if (this.isRunning) {
      console.warn(`⚠️ [BatchScheduler] 调度器已在运行中`)
      return
    }

    this.isRunning = true
    console.log(`🚀 [BatchScheduler] 启动调度器 (策略: ${this.schedulingStrategy})`)

    // 设置事件监听器
    this.setupEventListeners()

    // 🆕 根据调度策略选择启动方式
    if (this.schedulingStrategy === 'timed') {
      // 定时调度模式：固定间隔发送任务
      this.startTimedScheduling()
    } else {
      // 事件驱动模式：任务完成立即发送下一个
      this.processQueue()
    }
  }

  /**
   * 🆕 启动定时调度模式
   * 每隔固定间隔发送一批任务（受并发数限制）
   */
  private startTimedScheduling(): void {
    console.log(`⏰ [BatchScheduler] 启动定时调度模式，间隔: ${this.timedInterval}秒`)
    
    // 立即处理一次
    void this.processQueue()
    
    // 设置定时器
    const intervalMs = (this.timedInterval ?? 2) * 1000
    this.timedIntervalTimer = setInterval(() => {
      if (!this.isPaused && !this.isThrottled) {
        console.log(`⏰ [BatchScheduler] 定时触发任务发送`)
        void this.processQueue()
      }
    }, intervalMs)
    
    console.log(`✅ [BatchScheduler] 定时调度器已启动，间隔: ${intervalMs}ms`)
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.isPaused = true
    
    // 🆕 清理定时器
    if (this.timedIntervalTimer) {
      clearInterval(this.timedIntervalTimer)
      this.timedIntervalTimer = undefined
      console.log(`⏰ [BatchScheduler] 定时调度器已停止`)
    }
    
    // 移除事件监听器
    this.removeEventListeners()
    
    console.log(`⏸️ [BatchScheduler] 调度器已停止`)
    this.emit('scheduler:stopped')
  }

  /**
   * 核心调度逻辑：处理队列
   */
  private processQueue(): void {
    if (!this.isRunning || this.isPaused || this.isThrottled) {
      console.log(`⏸️ [BatchScheduler] 调度暂停: running=${this.isRunning}, paused=${this.isPaused}, throttled=${this.isThrottled}`)
      return
    }

    // 检查是否所有任务都已完成
    if (this.waitingQueue.length === 0 && this.activeSet.size === 0) {
      console.log(`✅ [BatchScheduler] 所有任务已完成！`)
      this.isRunning = false
      
      // 清理批次的所有任务状态（由调度器负责管理）
      this.stateManager.cleanupBatch(this.batchId)
      
      this.emit('scheduler:completed', {
        batchId: this.batchId,
        completedCount: this.completedSet.size,
        errorCount: this.errorSet.size
      })
      return
    }

    // 计算可发送的任务数
    const availableSlots = this.maxConcurrency - this.activeSet.size
    if (availableSlots <= 0) {
      console.log(`🔒 [BatchScheduler] 并发已满: active=${this.activeSet.size}, max=${this.maxConcurrency}`)
      return
    }

    // 从队列中取出任务
    const tasksToSend = this.waitingQueue.splice(0, availableSlots)
    if (tasksToSend.length === 0) {
      console.log(`⏳ [BatchScheduler] 无待发送任务，等待当前任务完成...`)
      return
    }

    console.log(`📤 [BatchScheduler] 发送 ${tasksToSend.length} 个任务: ${tasksToSend.join(', ')}`)

    // 发送任务
    for (const taskId of tasksToSend) {
      this.activeSet.add(taskId)
      
      // 调用 executor 执行任务（异步，不等待）
      void this.executor.executeTasks(this.batchId, [taskId], this.config, 1)
        .catch(error => {
          console.error(`❌ [BatchScheduler] 任务 ${taskId} 执行失败:`, error)
          // 错误会通过事件监听器处理
        })
    }

    // 发射调度状态变化事件
    this.emit('scheduler:status-changed', this.getStatus())
  }

  /**
   * 处理任务完成
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleTaskComplete(data: any): void {
    const taskId = data.taskId
    
    if (!this.activeSet.has(taskId)) {
      // 可能是之前已经处理过的
      return
    }

    console.log(`✅ [BatchScheduler] 任务完成: ${taskId}`)
    
    this.activeSet.delete(taskId)
    this.completedSet.add(taskId)

    // 🆕 调度策略处理
    if (this.schedulingStrategy === 'event') {
      // 事件驱动模式：立即触发下一批任务
      void this.processQueue()
    } else {
      // 定时调度模式：检查是否所有任务已完成，是则立即触发检查
      // 避免最后一个任务完成时还需等待下一个定时器周期
      if (this.waitingQueue.length === 0 && this.activeSet.size === 0) {
        console.log(`🎉 [BatchScheduler] 检测到所有任务已完成，立即触发最终检查`)
        void this.processQueue()
      }
    }
  }

  /**
   * 处理任务错误
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleTaskError(data: any): void {
    const taskId = data.taskId
    const errorType = data.errorType
    
    if (!this.activeSet.has(taskId)) {
      return
    }

    console.log(`❌ [BatchScheduler] 任务错误: ${taskId}, type=${errorType}`)
    
    this.activeSet.delete(taskId)
    this.errorSet.add(taskId)

    // 检查是否是限流错误
    if (errorType === 'RATE_LIMIT') {
      this.handleThrottled()
    } else {
      // 普通错误，继续处理队列
      void this.processQueue()
    }
  }

  /**
   * 处理限流
   */
  private handleThrottled(): void {
    if (this.isThrottled) {
      return
    }

    console.log(`🚨 [BatchScheduler] 检测到限流，暂停调度`)
    
    this.isThrottled = true
    this.throttledUntil = Date.now() + 60000 // 默认暂停60秒
    
    this.emit('scheduler:throttled', {
      batchId: this.batchId,
      throttledUntil: this.throttledUntil
    })

    // 如果有probe，启动定时探测
    if (this.probe) {
      console.log(`🔍 [BatchScheduler] 启动限流探针`)
      
      // 监听probe的恢复事件
      this.probeRecoveredListener = () => {
        this.recoverFromThrottle()
      }
      this.probe.on('recovered', this.probeRecoveredListener)
      
      // 启动探测
      void this.probe.startProbing()
      
    } else {
      // 如果没有probe，简单地在60秒后自动恢复
      setTimeout(() => {
        this.recoverFromThrottle()
      }, 60000)
    }
  }

  /**
   * 从限流中恢复
   */
  recoverFromThrottle(): void {
    if (!this.isThrottled) {
      return
    }

    console.log(`🔄 [BatchScheduler] 从限流中恢复`)
    
    this.isThrottled = false
    this.throttledUntil = 0
    
    this.emit('scheduler:recovered', {
      batchId: this.batchId
    })

    // 恢复队列处理
    void this.processQueue()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听任务完成事件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.taskCompleteListener = (data: any) => {
      this.handleTaskComplete(data)
    }
    this.stateManager.on('task:complete', this.taskCompleteListener)

    // 监听任务错误事件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.taskErrorListener = (data: any) => {
      this.handleTaskError(data)
    }
    this.stateManager.on('task:error', this.taskErrorListener)

    console.log(`🔌 [BatchScheduler] 事件监听器已设置`)
  }

  /**
   * 移除事件监听器
   */
  private removeEventListeners(): void {
    if (this.taskCompleteListener) {
      this.stateManager.off('task:complete', this.taskCompleteListener)
    }
    if (this.taskErrorListener) {
      this.stateManager.off('task:error', this.taskErrorListener)
    }
    if (this.probeRecoveredListener && this.probe) {
      this.probe.off('recovered', this.probeRecoveredListener)
    }

    console.log(`🔌 [BatchScheduler] 事件监听器已移除`)
  }

  /**
   * 获取调度器状态
   */
  getStatus(): SchedulerStatus {
    let state: SchedulerStatus['state'] = 'idle'
    
    if (this.isThrottled) {
      state = 'throttled'
    } else if (this.isPaused) {
      state = 'paused'
    } else if (this.isRunning) {
      if (this.waitingQueue.length === 0 && this.activeSet.size === 0) {
        state = 'completed'
      } else {
        state = 'running'
      }
    }

    return {
      state,
      waitingCount: this.waitingQueue.length,
      activeCount: this.activeSet.size,
      completedCount: this.completedSet.size,
      errorCount: this.errorSet.size,
      throttledUntil: this.isThrottled ? this.throttledUntil : undefined
    }
  }

  /**
   * 暂停调度（保留当前状态）
   */
  pause(): void {
    this.isPaused = true
    console.log(`⏸️ [BatchScheduler] 调度器已暂停`)
    this.emit('scheduler:paused')
  }

  /**
   * 恢复调度
   */
  resume(): void {
    if (!this.isPaused) {
      return
    }

    this.isPaused = false
    console.log(`▶️ [BatchScheduler] 调度器已恢复`)
    this.emit('scheduler:resumed')
    
    void this.processQueue()
  }

  /**
   * 动态添加新任务到等待队列
   * 用于在调度器运行时接收后续提交的任务
   */
  addTasks(newTaskIds: string[]): void {
    if (!this.isRunning) {
      console.warn(`⚠️ [BatchScheduler] 调度器未运行，无法添加任务`)
      return
    }

    this.waitingQueue.push(...newTaskIds)
    console.log(`➕ [BatchScheduler] 添加 ${newTaskIds.length} 个任务到等待队列，当前队列长度: ${this.waitingQueue.length}`)
    
    // 立即尝试处理新任务
    void this.processQueue()
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.stop()
    this.removeAllListeners()
    this.waitingQueue = []
    this.activeSet.clear()
    this.completedSet.clear()
    this.errorSet.clear()
    
    console.log(`🗑️ [BatchScheduler] 调度器已销毁`)
  }
}

