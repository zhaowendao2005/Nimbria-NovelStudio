import type { MessagePortMain } from 'electron/main'

import type { WindowProcess } from '../../types/process'

export interface MessageRouterDependencies {
  onRoute?: (from: string, to: string, data: unknown) => void
}

export class MessageRouter {
  private readonly ports = new Map<string, MessagePortMain>()
  private readonly dependencies: MessageRouterDependencies

  constructor(dependencies: MessageRouterDependencies = {}) {
    this.dependencies = dependencies
  }

  public setupChannel(process: WindowProcess): MessagePortMain {
    const { port, id } = process

    this.closeChannel(id)

    port.on('message', (event) => {
      const payload = {
        fromProcessId: id,
        data: event.data
      }

      this.dependencies.onRoute?.(id, 'broadcast', payload)
    })

    port.start()
    this.ports.set(id, port)
    return port
  }

  public routeMessage(fromProcessId: string, toProcessId: string, data: unknown): void {
    const targetPort = this.ports.get(toProcessId)
    if (!targetPort) return

    this.dependencies.onRoute?.(fromProcessId, toProcessId, data)
    targetPort.postMessage({ fromProcessId, data })
  }

  public broadcastMessage(fromProcessId: string, data: unknown): void {
    for (const [processId, port] of this.ports.entries()) {
      if (processId === fromProcessId) continue
      port.postMessage({ fromProcessId, data })
    }
  }

  public closeChannel(processId: string): void {
    const port = this.ports.get(processId)
    if (!port) return
    port.close()
    this.ports.delete(processId)
  }
}

