import type { BroadcastMessage } from '../../types/ipc'
import type { WindowProcess } from '../../types/process'

import { WindowManager } from '../../services/window-service/window-manager'

export class MainProcessBridge {
  constructor(private readonly windowManager: WindowManager) {}

  public broadcast(message: BroadcastMessage): void {
    this.windowManager.broadcast(message)
  }

  public focusWindow(processId: string): void {
    const process = this.windowManager.getProcess(processId)
    if (!process) return
    process.window.focus()
  }

  public getMainProcess(): WindowProcess | null {
    return this.windowManager.getProcess('main')
  }
}

