import type { BrowserWindow, WebPreferences } from 'electron'
import type { MessagePortMain } from 'electron/main'

export type WindowType = 'main' | 'project'

export interface WindowProcessConfig {
  type: WindowType
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  resizable?: boolean
  show?: boolean
  title?: string
  iconPath?: string
  webPreferences: WebPreferences
}

export interface CreateProcessOptions {
  type: WindowType
  projectPath?: string
  /**
   * 可选的窗口配置补充，用于覆盖默认配置。
   */
  configOverrides?: Partial<WindowProcessConfig>
}

export interface BaseWindowProcess {
  /**
   * 进程ID，由ProcessManager生成。
   */
  id: string
  type: WindowType
  window: BrowserWindow
  port: MessagePortMain
  processId: number
  createdAt: Date
  lastActive: Date
}

export interface MainWindowProcess extends BaseWindowProcess {
  type: 'main'
}

export interface ProjectWindowProcess extends BaseWindowProcess {
  type: 'project'
  projectPath: string
}

export type WindowProcess = MainWindowProcess | ProjectWindowProcess

export interface ProcessRegistryEntry {
  process: WindowProcess
  config: WindowProcessConfig
}

export interface WindowLifecycleHooks {
  onReady?: (process: WindowProcess) => void
  onDestroyed?: (processId: string) => void
  onFocusChanged?: (processId: string, focused: boolean) => void
}

export interface WindowMetrics {
  bounds: {
    width: number
    height: number
    x?: number
    y?: number
  }
  isMaximized: boolean
  isMinimized: boolean
  isVisible: boolean
}

export interface ProcessPersistenceInfo {
  id: string
  type: WindowType
  projectPath?: string
  lastWindowMetrics: WindowMetrics
  lastOpenedAt: string
}

