/**
 * MemoryManager - 内存管理器
 * 
 * 职责：
 * - 内存使用监控
 * - 垃圾回收触发
 * - 缓存节点释放
 * - 内存泄漏防护
 */

interface MemorySnapshot {
  timestamp: number
  heapUsed: number
  heapTotal: number
  external: number
  arrayBuffers: number
}

interface CacheEntry {
  id: string
  size: number
  accessTime: number
  refCount: number
}

export class MemoryManager {
  private snapshots: MemorySnapshot[] = []
  private readonly maxSnapshots: number = 60 // 保存最近 60 个快照
  private cacheMap: Map<string, CacheEntry> = new Map()
  private totalCacheSize: number = 0
  private maxCacheSize: number = 100 * 1024 * 1024 // 100MB 默认限制
  private gcThreshold: number = 80 // 内存占用 80% 时触发 GC

  constructor(maxCacheSize?: number, gcThreshold?: number) {
    if (maxCacheSize) this.maxCacheSize = maxCacheSize
    if (gcThreshold) this.gcThreshold = gcThreshold
  }

  /**
   * 注册缓存对象
   */
  registerCache(id: string, size: number): void {
    const existing = this.cacheMap.get(id)
    if (existing) {
      this.totalCacheSize -= existing.size
    }

    const entry: CacheEntry = {
      id,
      size,
      accessTime: Date.now(),
      refCount: 1
    }

    this.cacheMap.set(id, entry)
    this.totalCacheSize += size

    // 检查是否需要清理
    this.checkAndGarbageCollect()
  }

  /**
   * 增加引用计数
   */
  addReference(id: string): void {
    const entry = this.cacheMap.get(id)
    if (entry) {
      entry.refCount++
      entry.accessTime = Date.now()
    }
  }

  /**
   * 减少引用计数
   */
  removeReference(id: string): void {
    const entry = this.cacheMap.get(id)
    if (entry) {
      entry.refCount--
      if (entry.refCount <= 0) {
        this.releaseCache(id)
      }
    }
  }

  /**
   * 手动释放缓存
   */
  releaseCache(id: string): void {
    const entry = this.cacheMap.get(id)
    if (entry) {
      this.totalCacheSize -= entry.size
      this.cacheMap.delete(id)
    }
  }

  /**
   * 获取当前内存状态
   */
  getMemoryStatus(): {
    heapUsed: number
    heapTotal: number
    usage: number
    cacheSize: number
    cacheCount: number
  } {
    const snapshot = this.captureSnapshot()

    return {
      heapUsed: snapshot.heapUsed,
      heapTotal: snapshot.heapTotal,
      usage: (snapshot.heapUsed / snapshot.heapTotal) * 100,
      cacheSize: this.totalCacheSize,
      cacheCount: this.cacheMap.size
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): Array<{ id: string; size: number; refCount: number }> {
    const stats: Array<{ id: string; size: number; refCount: number }> = []

    this.cacheMap.forEach(entry => {
      stats.push({
        id: entry.id,
        size: entry.size,
        refCount: entry.refCount
      })
    })

    return stats.sort((a, b) => b.size - a.size)
  }

  /**
   * 获取内存趋势
   */
  getMemoryTrend(): MemorySnapshot[] {
    return [...this.snapshots]
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    this.cacheMap.clear()
    this.totalCacheSize = 0
  }

  /**
   * 获取内存报告
   */
  getReport(): {
    currentUsage: number
    peakUsage: number
    avgUsage: number
    cacheUtilization: number
    gcTriggered: number
  } {
    const currentStatus = this.getMemoryStatus()
    const peakUsage =
      this.snapshots.length > 0
        ? Math.max(...this.snapshots.map(s => (s.heapUsed / s.heapTotal) * 100))
        : currentStatus.usage

    const avgUsage =
      this.snapshots.length > 0
        ? this.snapshots.reduce((sum, s) => sum + (s.heapUsed / s.heapTotal) * 100, 0) /
          this.snapshots.length
        : currentStatus.usage

    return {
      currentUsage: currentStatus.usage,
      peakUsage,
      avgUsage,
      cacheUtilization: (this.totalCacheSize / this.maxCacheSize) * 100,
      gcTriggered: this.snapshots.length
    }
  }

  /**
   * 强制垃圾回收
   */
  forceGarbageCollection(): number {
    const beforeSize = this.totalCacheSize

    // 清除所有引用计数为 0 或过期（超过 5 分钟未访问）的缓存
    const now = Date.now()
    const expireTime = 5 * 60 * 1000 // 5 分钟

    const idsToDelete: string[] = []
    this.cacheMap.forEach((entry, id) => {
      if (entry.refCount <= 0 || now - entry.accessTime > expireTime) {
        idsToDelete.push(id)
      }
    })

    idsToDelete.forEach(id => this.releaseCache(id))

    const freedSize = beforeSize - this.totalCacheSize
    console.log(`[MemoryManager] GC freed ${(freedSize / 1024 / 1024).toFixed(2)} MB`)

    return freedSize
  }

  // ============ 私有方法 ============

  /**
   * 拍摄内存快照
   */
  private captureSnapshot(): MemorySnapshot {
    const now = performance.now()

    let heapUsed = 0
    let heapTotal = 0
    let external = 0
    let arrayBuffers = 0

    if (performance.memory) {
      heapUsed = (performance.memory.usedJSHeapSize ?? 0) / (1024 * 1024)
      heapTotal = (performance.memory.jsHeapSizeLimit ?? 0) / (1024 * 1024)
      external = ((performance.memory as any).externalMemoryUsage ?? 0) / (1024 * 1024)
    }

    const snapshot: MemorySnapshot = {
      timestamp: now,
      heapUsed,
      heapTotal,
      external,
      arrayBuffers
    }

    this.snapshots.push(snapshot)

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }

    return snapshot
  }

  /**
   * 检查并触发垃圾回收
   */
  private checkAndGarbageCollect(): void {
    const status = this.getMemoryStatus()

    // 内存占用超过阈值，触发 GC
    if (status.usage > this.gcThreshold) {
      console.log(
        `[MemoryManager] Memory usage ${status.usage.toFixed(2)}% exceeds threshold ${this.gcThreshold}%, triggering GC`
      )
      this.forceGarbageCollection()
    }

    // 缓存超过最大限制，清除旧缓存
    if (this.totalCacheSize > this.maxCacheSize) {
      this.evictOldestCache()
    }
  }

  /**
   * 清除最旧的缓存
   */
  private evictOldestCache(): void {
    const entries = Array.from(this.cacheMap.values())
      .sort((a, b) => a.accessTime - b.accessTime)

    // 清除直到缓存大小降低到 70%
    let freed = 0
    const targetSize = this.maxCacheSize * 0.7

    for (const entry of entries) {
      if (this.totalCacheSize <= targetSize) break
      freed += entry.size
      this.releaseCache(entry.id)
    }

    console.log(
      `[MemoryManager] Evicted ${(freed / 1024 / 1024).toFixed(2)} MB of old cache`
    )
  }
}
