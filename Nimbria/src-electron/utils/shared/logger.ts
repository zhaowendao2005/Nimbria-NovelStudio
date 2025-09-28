/**
 * 简易日志记录器 (临时实现，后续可替换为更完整的日志方案)
 */

export class Logger {
  constructor(private readonly scope: string) {}

  private formatMessage(level: 'info' | 'warn' | 'error' | 'debug', message: unknown, ...args: unknown[]) {
    const timestamp = new Date().toISOString()
    return [`[${timestamp}]`, `[${this.scope}]`, `[${level.toUpperCase()}]`, message, ...args]
  }

  info(message: unknown, ...args: unknown[]) {
    console.info(...this.formatMessage('info', message, ...args))
  }

  warn(message: unknown, ...args: unknown[]) {
    console.warn(...this.formatMessage('warn', message, ...args))
  }

  error(message: unknown, ...args: unknown[]) {
    console.error(...this.formatMessage('error', message, ...args))
  }

  debug(message: unknown, ...args: unknown[]) {
    if (process.env.DEBUG || process.env.DEBUGGING) {
      console.debug(...this.formatMessage('debug', message, ...args))
    }
  }
}

/**
 * 获取日志记录器实例
 * @param scope 日志范围标识
 */
export function getLogger(scope: string): Logger {
  return new Logger(scope)
}
