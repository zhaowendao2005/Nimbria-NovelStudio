import type { IpcMainInvokeEvent } from 'electron/main'

import type { IPCChannelName, IPCRequest, IPCResponse } from '../../types/ipc'

export interface IpcHandler<TRequest = unknown, TResponse = unknown> {
  channel: string
  handle(event: IpcMainInvokeEvent, request: TRequest): Promise<TResponse> | TResponse
}

export type TypedIpcHandler<TChannel extends IPCChannelName> = IpcHandler<
  IPCRequest<TChannel>,
  IPCResponse<TChannel>
>

export interface InvokeHandlerRegistry {
  registerHandler<TChannel extends IPCChannelName>(handler: TypedIpcHandler<TChannel>): void
  unregisterHandler(channel: IPCChannelName): void
}
