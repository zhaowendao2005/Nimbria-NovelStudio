/**
 * AsyncTaskManager - 异步任务管理核心
 * 
 * 职责：
 * - 提供原子化的异步操作接口
 * - 管理 Web Worker 池
 * - 任务队列调度和优先级管理
 * - 进度追踪和取消机制
 */

import type {
  AsyncTask,
  TaskQueueState,
  WorkerPoolState,
  WorkerMessage,
  TaskConfig,
  TaskListener,
  TaskEvent,
  LayoutResult,
  SpatialIndexResult,
  GraphData,
  NodeData,
  EdgeData,
  ViewportInfo,
  PathResult
} from 'Business/StarChart'

type TaskType = AsyncTask['type']
type TaskPriority = AsyncTask['priority']
type TaskStatus = AsyncTask['status']

interface TaskListenerEntry {
  listeners: Set<TaskListener>
}

export class AsyncTaskManager {
  private workerPool: Worker[] = []
  private taskQueue: AsyncTask[] = []
  private runningTasks: Map<string, AsyncTask> = new Map()
  private taskListeners: Map<string, TaskListenerEntry> = new Map()
  private workerAvailable: Set<Worker> = new Set()
  private readonly workerCount: number

  constructor(workerCount?: number) {
    this.workerCount = workerCount || (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4)
    this.initializeWorkerPool()
  }

  /**
   * 初始化 Worker 池
   */
  private initializeWorkerPool(): void {
    try {
      for (let i = 0; i < this.workerCount; i++) {
        const worker = new Worker(
          new URL('../Workers/starChart.worker.ts', import.meta.url),
          { type: 'module' }
        )

        worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
          this.handleWorkerMessage(event.data)
        }

        worker.onerror = (error: ErrorEvent) => {
          console.error('[AsyncTaskManager] Worker 错误:', error)
        }

        this.workerPool.push(worker)
        this.workerAvailable.add(worker)
      }

      console.log(`[AsyncTaskManager] Worker 池已初始化 (${this.workerCount} workers)`)
    } catch (error) {
      console.error('[AsyncTaskManager] Worker 池初始化失败:', error)
    }
  }

  /**
   * 【原子接口1】计算布局
   */
  async computeLayout(
    nodes: NodeData[],
    edges: EdgeData[],
    algorithm: string,
    options?: Record<string, any>
  ): Promise<LayoutResult> {
    return this.submitTask<LayoutResult>({
      type: 'layout',
      payload: { nodes, edges, algorithm, options },
      priority: options?.priority || 'normal'
    })
  }

  /**
   * 【原子接口2】构建空间索引
   */
  async buildSpatialIndex(
    nodes: NodeData[],
    indexType: 'quadtree' | 'rtree'
  ): Promise<SpatialIndexResult> {
    return this.submitTask<SpatialIndexResult>({
      type: 'spatial-index',
      payload: { nodes, indexType },
      priority: 'high'
    })
  }

  /**
   * 【原子接口3】数据转换
   */
  async transformData(rawData: unknown, transformer: ((data: unknown) => Promise<GraphData>) | string): Promise<GraphData> {
    return this.submitTask<GraphData>({
      type: 'data-transform',
      payload: { rawData, transformer },
      priority: 'high'
    })
  }

  /**
   * 【原子接口4】视口裁剪计算
   */
  async computeVisibleNodes(
    allNodes: NodeData[],
    viewport: ViewportInfo,
    spatialIndex: any
  ): Promise<string[]> {
    return this.submitTask<string[]>({
      type: 'viewport-culling',
      payload: { allNodes, viewport, spatialIndex },
      priority: 'critical'
    })
  }

  /**
   * 【原子接口5】路径查找
   */
  async findPath(
    graph: GraphData,
    startId: string,
    endId: string,
    algorithm: 'dijkstra' | 'astar'
  ): Promise<PathResult> {
    return this.submitTask<PathResult>({
      type: 'pathfinding',
      payload: { graph, startId, endId, algorithm },
      priority: 'normal'
    })
  }

  /**
   * 提交任务到队列
   */
  private submitTask<T>(config: TaskConfig): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId()

      const task: AsyncTask = {
        id: taskId,
        type: config.type,
        payload: config.payload,
        priority: config.priority,
        status: 'queued',
        createdAt: Date.now()
      }

      // 添加到队列（按优先级排序）
      this.insertTaskByPriority(task)

      // 通知监听器
      this.notifyListeners(taskId, 'queued', task)

      // 添加任务完成监听
      this.addListener(taskId, (event: TaskEvent, data: any) => {
        if (event === 'completed') {
          resolve(data.result as T)
          this.removeAllListeners(taskId)
        } else if (event === 'error') {
          reject(data.error)
          this.removeAllListeners(taskId)
        }
      })

      // 尝试执行任务
      this.processQueue()
    })
  }

  /**
   * 处理任务队列
   */
  private processQueue(): void {
    while (this.taskQueue.length > 0 && this.workerAvailable.size > 0) {
      const task = this.taskQueue.shift()
      if (!task) break

      const worker = Array.from(this.workerAvailable)[0]
      if (!worker) break

      this.workerAvailable.delete(worker)
      this.executeTask(task, worker)
    }
  }

  /**
   * 在 Worker 中执行任务
   */
  private executeTask(task: AsyncTask, worker: Worker): void {
    task.status = 'running'
    task.startedAt = Date.now()
    this.runningTasks.set(task.id, task)

    this.notifyListeners(task.id, 'started', task)

    // 发送任务到 Worker
    const message: WorkerMessage = {
      taskId: task.id,
      type: 'result',
      data: {
        type: task.type,
        payload: task.payload
      }
    }

    try {
      worker.postMessage(message)
    } catch (error) {
      this.notifyListeners(task.id, 'error', { error })
      this.runningTasks.delete(task.id)
      this.workerAvailable.add(worker)
      this.processQueue()
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(message: WorkerMessage): void {
    const { taskId, type: msgType, data } = message

    const task = this.runningTasks.get(taskId)
    if (!task) return

    switch (msgType) {
      case 'progress':
        task.progress = (data as { progress: number }).progress
        this.notifyListeners(taskId, 'progress', { progress: (data as { progress: number }).progress })
        break

      case 'result':
        task.status = 'completed'
        task.completedAt = Date.now()
        task.result = data
        this.runningTasks.delete(taskId)
        this.notifyListeners(taskId, 'completed', { result: data })
        break

      case 'error':
        task.status = 'error'
        task.error = (data as { error: Error }).error
        this.runningTasks.delete(taskId)
        this.notifyListeners(taskId, 'error', { error: (data as { error: Error }).error })
        break
    }

    // 释放 Worker 并继续处理队列
    const worker = this.findWorkerByTask(taskId)
    if (worker) {
      this.workerAvailable.add(worker)
    }
    this.processQueue()
  }

  /**
   * 找到执行任务的 Worker
   */
  private findWorkerByTask(taskId: string): Worker | undefined {
    // 简化版实现，实际应该跟踪每个 Worker 的状态
    return this.workerPool[0]
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): void {
    const task = this.runningTasks.get(taskId) || this.taskQueue.find((t) => t.id === taskId)

    if (!task) return

    if (task.status === 'queued') {
      this.taskQueue = this.taskQueue.filter((t) => t.id !== taskId)
    } else if (task.status === 'running') {
      this.runningTasks.delete(taskId)
    }

    task.status = 'cancelled'
    this.notifyListeners(taskId, 'cancelled', task)
  }

  /**
   * 生成唯一任务 ID
   */
  private generateTaskId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 按优先级插入任务
   */
  private insertTaskByPriority(task: AsyncTask): void {
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3
    }

    const taskPriority = priorityOrder[task.priority] ?? 2  // 默认值为 normal

    const insertIndex = this.taskQueue.findIndex((t) => (priorityOrder[t.priority] ?? 2) > taskPriority)

    if (insertIndex === -1) {
      this.taskQueue.push(task)
    } else {
      this.taskQueue.splice(insertIndex, 0, task)
    }
  }

  /**
   * 添加任务监听
   */
  private addListener(taskId: string, listener: TaskListener): void {
    if (!this.taskListeners.has(taskId)) {
      this.taskListeners.set(taskId, { listeners: new Set() })
    }
    this.taskListeners.get(taskId)!.listeners.add(listener)
  }

  /**
   * 移除任务监听
   */
  private removeAllListeners(taskId: string): void {
    this.taskListeners.delete(taskId)
  }

  /**
   * 通知监听器
   */
  private notifyListeners(taskId: string, event: TaskEvent, data: any): void {
    const entry = this.taskListeners.get(taskId)
    if (!entry) return

    entry.listeners.forEach((listener) => {
      try {
        listener(event, data)
      } catch (error) {
        console.error('[AsyncTaskManager] 监听器执行错误:', error)
      }
    })
  }

  /**
   * 销毁 AsyncTaskManager
   */
  destroy(): void {
    this.workerPool.forEach((worker) => worker.terminate())
    this.workerPool = []
    this.taskQueue = []
    this.runningTasks.clear()
    this.taskListeners.clear()
    this.workerAvailable.clear()
    console.log('[AsyncTaskManager] 已销毁')
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    queuedCount: number
    runningCount: number
    availableWorkers: number
  } {
    return {
      queuedCount: this.taskQueue.length,
      runningCount: this.runningTasks.size,
      availableWorkers: this.workerAvailable.size
    }
  }
}
