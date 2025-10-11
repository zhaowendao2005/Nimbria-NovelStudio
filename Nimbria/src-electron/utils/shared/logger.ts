/**
 * 增强日志记录器
 * - 开发环境：输出到 console
 * - 生产环境：同时写入文件和 console
 */

import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

// 日志文件配置
let logDir: string | null = null
let logFilePath: string | null = null
let logStream: fs.WriteStream | null = null

/**
 * 初始化日志系统
 */
function initLogSystem() {
  if (logDir) return // 已经初始化

  try {
    // 获取 AppData 路径
    const userDataPath = app.getPath('userData')
    logDir = path.join(userDataPath, 'logs')
    
    // 确保日志目录存在
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    
    // 创建日志文件（按日期命名）
    const date = new Date().toISOString().split('T')[0]
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0]
    const logFileName = `nimbria-${date}_${timestamp}.log`
    logFilePath = path.join(logDir, logFileName)
    
    // 创建写入流
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' })
    
    console.log(`[Logger] Log file created: ${logFilePath}`)
  } catch (error) {
    console.error('[Logger] Failed to initialize log system:', error)
  }
}

/**
 * 写入日志到文件
 */
function writeToFile(logLine: string) {
  if (logStream && !logStream.destroyed) {
    try {
      logStream.write(logLine + '\n')
    } catch (error) {
      console.error('[Logger] Failed to write to log file:', error)
    }
  }
}

/**
 * 格式化日志消息为字符串
 */
function formatToString(parts: unknown[]): string {
  return parts.map(part => {
    if (typeof part === 'string') return part
    if (part instanceof Error) return `${part.message}\n${part.stack}`
    try {
      return JSON.stringify(part)
    } catch {
      return String(part)
    }
  }).join(' ')
}

export class Logger {
  constructor(private readonly scope: string) {
    // 确保日志系统已初始化
    if (app.isReady()) {
      initLogSystem()
    } else {
      void app.whenReady().then(() => initLogSystem())
    }
  }

  private formatMessage(level: 'info' | 'warn' | 'error' | 'debug', message: unknown, ...args: unknown[]) {
    const timestamp = new Date().toISOString()
    return [`[${timestamp}]`, `[${this.scope}]`, `[${level.toUpperCase()}]`, message, ...args]
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', message: unknown, ...args: unknown[]) {
    const parts = this.formatMessage(level, message, ...args)
    
    // 输出到 console
    switch (level) {
      case 'info':
        console.info(...parts)
        break
      case 'warn':
        console.warn(...parts)
        break
      case 'error':
        console.error(...parts)
        break
      case 'debug':
        if (process.env.DEBUG || process.env.DEBUGGING) {
          console.debug(...parts)
        }
        break
    }
    
    // 写入文件（生产环境或调试模式）
    const isProduction = !process.env.DEV && !process.env.DEBUGGING
    const isDebugMode = !!process.env.ELECTRON_DEBUG
    
    if (isProduction || isDebugMode) {
      const logLine = formatToString(parts)
      writeToFile(logLine)
    }
  }

  info(message: unknown, ...args: unknown[]) {
    this.log('info', message, ...args)
  }

  warn(message: unknown, ...args: unknown[]) {
    this.log('warn', message, ...args)
  }

  error(message: unknown, ...args: unknown[]) {
    this.log('error', message, ...args)
  }

  debug(message: unknown, ...args: unknown[]) {
    this.log('debug', message, ...args)
  }
}

/**
 * 获取日志记录器实例
 * @param scope 日志范围标识
 */
export function getLogger(scope: string): Logger {
  return new Logger(scope)
}

/**
 * 关闭日志系统（应用退出时调用）
 */
export function closeLogSystem() {
  if (logStream && !logStream.destroyed) {
    logStream.end()
    logStream = null
    console.log('[Logger] Log system closed')
  }
}

/**
 * 获取当前日志文件路径
 */
export function getLogFilePath(): string | null {
  return logFilePath
}
