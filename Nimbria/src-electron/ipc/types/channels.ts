import type { IPCChannelMap, IPCChannelName, IPCRequest, IPCResponse } from '../../types/ipc'

export type ChannelHandler<TChannel extends IPCChannelName> = (
  request: IPCRequest<TChannel>
) => Promise<IPCResponse<TChannel>> | IPCResponse<TChannel>

export type ChannelHandlers = {
  [K in IPCChannelName]?: ChannelHandler<K>
}

export interface ChannelRegistry {
  register<TChannel extends IPCChannelName>(channel: TChannel, handler: ChannelHandler<TChannel>): void
  unregister(channel: IPCChannelName): void
  getHandler<TChannel extends IPCChannelName>(channel: TChannel): ChannelHandler<TChannel> | undefined
}

export type ChannelMap = IPCChannelMap

