import type { BrowserWindowConstructorOptions } from 'electron'

import type { WindowType } from './process'

export interface WindowTemplate {
  id: string
  type: WindowType
  options: BrowserWindowConstructorOptions
}

export interface WindowFactory {
  createWindow(config: CreateWindowConfig): BrowserWindowConstructorOptions
}

export interface CreateWindowConfig {
  type: WindowType
  templateId?: string
  projectPath?: string
  overrides?: Partial<BrowserWindowConstructorOptions>
}

export interface WindowStateSnapshot {
  id: string
  type: WindowType
  bounds: {
    width: number
    height: number
    x?: number
    y?: number
  }
  isMaximized: boolean
  isFullScreen: boolean
  isVisible: boolean
  lastFocusedAt: string
}

export interface WindowCreationContext {
  type: WindowType
  projectPath?: string
  template?: WindowTemplate
  options: BrowserWindowConstructorOptions
}

export interface WindowControlAPI {
  minimize(): Promise<void>
  maximize(): Promise<void>
  unmaximize(): Promise<void>
  close(): Promise<void>
  isMaximized(): Promise<boolean>
  focus(): Promise<void>
}

