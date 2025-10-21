/**
 * PerformanceMonitor - 性能监控器
 * 
 * 职责：
 * - FPS 监控和统计
 * - 任务耗时追踪
 * - 帧率分析
 * - 性能指标采集
 */

interface FrameMetrics {
  timestamp: number
  duration: number
  taskCount: number
  memoryUsed: number
}

interface TaskMetrics {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'pending' | 'completed' | 'failed'
}

export class PerformanceMonitor {
  private frameMetrics: FrameMetrics[] = []
  private taskMetrics: Map<string, TaskMetrics> = new Map()
  private frameStartTime: number = 0
  private taskStartTimes: Map<string, number> = new Map()
  private readonly maxHistoryFrames: number = 300 // 保存最近 300 帧
  private lastFpsTime: number = 0
  private frameCount: number = 0
  private currentFps: number = 60

  constructor() {
    this.frameStartTime = performance.now()
  }

  /**
   * 开始帧计时
   */
  startFrame(): void {
    this.frameStartTime = performance.now()
  }

  /**
   * 结束帧计时
   */
  endFrame(taskCount: number = 0): void {
    const now = performance.now()
    const duration = now - this.frameStartTime

    const metrics: FrameMetrics = {
      timestamp: now,
      duration,
      taskCount,
      memoryUsed: this.getMemoryUsage()
    }

    this.frameMetrics.push(metrics)

    // 保持历史数据长度
    if (this.frameMetrics.length > this.maxHistoryFrames) {
      this.frameMetrics.shift()
    }

    // 计算 FPS
    this.updateFps(now)
  }

  /**
   * 开始任务计时
   */
  startTask(taskId: string, taskName: string = taskId): void {
    this.taskStartTimes.set(taskId, performance.now())
    this.taskMetrics.set(taskId, {
      id: taskId,
      name: taskName,
      startTime: performance.now(),
      status: 'pending'
    })
  }

  /**
   * 结束任务计时
   */
  endTask(taskId: string, success: boolean = true): number {
    const startTime = this.taskStartTimes.get(taskId)
    if (!startTime) {
      console.warn(`[PerformanceMonitor] Task ${taskId} not found`)
      return 0
    }

    const endTime = performance.now()
    const duration = endTime - startTime

    const task = this.taskMetrics.get(taskId)
    if (task) {
      task.endTime = endTime
      task.duration = duration
      task.status = success ? 'completed' : 'failed'
    }

    this.taskStartTimes.delete(taskId)

    return duration
  }

  /**
   * 获取当前 FPS
   */
  getFps(): number {
    return this.currentFps
  }

  /**
   * 获取平均帧时间（毫秒）
   */
  getAverageFrameTime(): number {
    if (this.frameMetrics.length === 0) return 0

    const sum = this.frameMetrics.reduce((acc, m) => acc + m.duration, 0)
    return sum / this.frameMetrics.length
  }

  /**
   * 获取最大帧时间（毫秒）
   */
  getMaxFrameTime(): number {
    if (this.frameMetrics.length === 0) return 0

    return Math.max(...this.frameMetrics.map(m => m.duration))
  }

  /**
   * 获取最小帧时间（毫秒）
   */
  getMinFrameTime(): number {
    if (this.frameMetrics.length === 0) return 0

    return Math.min(...this.frameMetrics.map(m => m.duration))
  }

  /**
   * 获取任务统计
   */
  getTaskStats(taskId: string): { duration: number; status: string } | null {
    const task = this.taskMetrics.get(taskId)
    if (!task || !task.duration) return null

    return {
      duration: task.duration,
      status: task.status
    }
  }

  /**
   * 获取所有任务统计
   */
  getAllTaskStats(): Array<{ id: string; name: string; duration: number; status: string }> {
    const stats: Array<{ id: string; name: string; duration: number; status: string }> = []

    this.taskMetrics.forEach(task => {
      if (task.duration !== undefined) {
        stats.push({
          id: task.id,
          name: task.name,
          duration: task.duration,
          status: task.status
        })
      }
    })

    return stats.sort((a, b) => b.duration - a.duration)
  }

  /**
   * 获取慢帧（超过 16ms 的帧）
   */
  getSlowFrames(threshold: number = 16): FrameMetrics[] {
    return this.frameMetrics.filter(m => m.duration > threshold)
  }

  /**
   * 获取性能报告
   */
  getReport(): {
    fps: number
    avgFrameTime: number
    maxFrameTime: number
    minFrameTime: number
    slowFrameCount: number
    totalFrames: number
    avgMemory: number
  } {
    const slowFrames = this.getSlowFrames(16)
    const avgMemory =
      this.frameMetrics.length > 0
        ? this.frameMetrics.reduce((sum, m) => sum + m.memoryUsed, 0) /
          this.frameMetrics.length
        : 0

    return {
      fps: this.currentFps,
      avgFrameTime: this.getAverageFrameTime(),
      maxFrameTime: this.getMaxFrameTime(),
      minFrameTime: this.getMinFrameTime(),
      slowFrameCount: slowFrames.length,
      totalFrames: this.frameMetrics.length,
      avgMemory
    }
  }

  /**
   * 清除历史数据
   */
  clear(): void {
    this.frameMetrics = []
    this.taskMetrics.clear()
    this.taskStartTimes.clear()
    this.frameCount = 0
  }

  /**
   * 获取内存使用量（MB）
   */
  private getMemoryUsage(): number {
    if (performance.memory) {
      return (performance.memory.usedJSHeapSize ?? 0) / (1024 * 1024)
    }
    return 0
  }

  /**
   * 更新 FPS 计算
   */
  private updateFps(now: number): void {
    this.frameCount++

    // 每秒更新一次 FPS
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsTime)
      )
      this.frameCount = 0
      this.lastFpsTime = now
    }
  }
}
