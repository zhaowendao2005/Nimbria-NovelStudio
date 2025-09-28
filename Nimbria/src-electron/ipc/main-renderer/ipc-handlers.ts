import { ipcMain } from 'electron'

import type { IPCChannelName, IPCRequest, IPCResponse } from '../../types/ipc'

type Handler<T extends IPCChannelName> = (
  request: IPCRequest<T>
) => Promise<IPCResponse<T>> | IPCResponse<T>

export class IPCHandlers {
  private readonly handlers = new Map<IPCChannelName, Handler<any>>()

  register<T extends IPCChannelName>(channel: T, handler: Handler<T>) {
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel)
    }

    this.handlers.set(channel, handler)
    ipcMain.handle(channel, async (_event, request: IPCRequest<T>) => handler(request))
  }

  unregister(channel: IPCChannelName) {
    this.handlers.delete(channel)
    ipcMain.removeHandler(channel)
  }

  clear() {
    for (const channel of this.handlers.keys()) {
      ipcMain.removeHandler(channel)
    }
    this.handlers.clear()
  }
}
