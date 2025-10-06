import type { BroadcastMessage } from '../../types/ipc'
import type { WindowManager } from '../../services/window-service/window-manager'

export class ProjectProcessBridge {
  constructor(private readonly windowManager: WindowManager) {}

  public broadcastToMain(message: BroadcastMessage): void {
    this.windowManager.broadcast({
      ...message,
      fromProcess: message.fromProcess ?? 'project'
    })
  }
}

