/**
 * Logger - 日志工具
 * 
 * 职责：
 * - 日志输出管理
 * - 日志级别控制
 * - 性能分析日志
 * - 日志过滤和格式化
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: number
  level: LogLevel
  module: string
  message: string
  data?: any
  stack?: string
}

export class Logger {
  private static instance: Logger
  private logs: LogEntry[] = []
  private readonly maxLogs: number = 500
  private logLevel: LogLevel = 'info'
  private enableConsole: boolean = true
  private enablePersist: boolean = true
  private readonly modulePrefix: string

  private constructor(modulePrefix: string = 'StarChart') {
    this.modulePrefix = modulePrefix
  }

  /**
   * 获取单例
   */
  static getInstance(modulePrefix?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(modulePrefix)
    }
    return Logger.instance
  }

  /**
   * 设置日志级别
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  /**
   * 启用/禁用控制台输出
   */
  setConsoleOutput(enabled: boolean): void {
    this.enableConsole = enabled
  }

  /**
   * 启用/禁用日志持久化
   */
  setPersistence(enabled: boolean): void {
    this.enablePersist = enabled
  }

  /**
   * 调试日志
   */
  debug(module: string, message: string, data?: any): void {
    this.log('debug', module, message, data)
  }

  /**
   * 信息日志
   */
  info(module: string, message: string, data?: any): void {
    this.log('info', module, message, data)
  }

  /**
   * 警告日志
   */
  warn(module: string, message: string, data?: any): void {
    this.log('warn', module, message, data)
  }

  /**
   * 错误日志
   */
  error(module: string, message: string, error?: Error | any): void {
    let data: any = error
    let stack: string | undefined

    if (error instanceof Error) {
      data = { name: error.name, message: error.message }
      stack = error.stack
    }

    this.log('error', module, message, data, stack)
  }

  /**
   * 性能日志
   */
  performance(module: string, taskName: string, duration: number, threshold: number = 16): void {
    const level = duration > threshold ? 'warn' : 'debug'
    const message = `[Performance] ${taskName}: ${duration.toFixed(2)}ms`
    this.log(level, module, message, { duration, threshold })
  }

  /**
   * 获取所有日志
   */
  getAllLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * 按级别过滤日志
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level)
  }

  /**
   * 按模块过滤日志
   */
  getLogsByModule(module: string): LogEntry[] {
    return this.logs.filter(log => log.module === module)
  }

  /**
   * 导出日志为 JSON
   */
  exportAsJson(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  /**
   * 导出日志为 CSV
   */
  exportAsCsv(): string {
    if (this.logs.length === 0) return ''

    const headers = ['Timestamp', 'Level', 'Module', 'Message', 'Data']
    const rows = this.logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.level.toUpperCase(),
      log.module,
      log.message,
      JSON.stringify(log.data ?? '')
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    return csv
  }

  /**
   * 清除日志
   */
  clear(): void {
    this.logs = []
  }

  /**
   * 获取日志统计
   */
  getStats(): {
    totalLogs: number
    byLevel: Record<LogLevel, number>
    byModule: Record<string, number>
  } {
    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0
    }

    const byModule: Record<string, number> = {}

    for (const log of this.logs) {
      byLevel[log.level]++
      byModule[log.module] = (byModule[log.module] ?? 0) + 1
    }

    return {
      totalLogs: this.logs.length,
      byLevel,
      byModule
    }
  }

  /**
   * 获取最近的 N 条日志
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count)
  }

  // ============ 私有方法 ============

  /**
   * 核心日志方法
   */
  private log(
    level: LogLevel,
    module: string,
    message: string,
    data?: any,
    stack?: string
  ): void {
    // 检查日志级别过滤
    if (!this.shouldLog(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      message,
      data,
      stack
    }

    // 持久化
    if (this.enablePersist) {
      this.logs.push(entry)

      // 保持日志长度
      if (this.logs.length > this.maxLogs) {
        this.logs.shift()
      }
    }

    // 控制台输出
    if (this.enableConsole) {
      this.outputToConsole(entry)
    }
  }

  /**
   * 检查是否应该记录
   */
  private shouldLog(level: LogLevel): boolean {
    const levelMap: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }

    return levelMap[level] >= levelMap[this.logLevel]
  }

  /**
   * 输出到控制台
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp.toString().slice(-5)}] [${entry.module}]`
    const message = `${prefix} ${entry.message}`

    switch (entry.level) {
      case 'debug':
        console.log(`%c${message}`, 'color: gray; font-size: 11px;', entry.data)
        break

      case 'info':
        console.log(message, entry.data)
        break

      case 'warn':
        console.warn(message, entry.data)
        break

      case 'error':
        console.error(message, entry.data)
        if (entry.stack) {
          console.error(entry.stack)
        }
        break
    }
  }
}
