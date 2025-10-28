/**
 * LinkNodeView IPC API 类型定义
 * 
 * 定义前后端通信的请求和响应格式
 */

import type { LinkItem } from './models'

/**
 * 打开节点视图窗口请求
 */
export interface OpenLinkNodeViewWindowRequest {
  links: LinkItem[]
  tabId: string
  projectPath: string
}

/**
 * 打开节点视图窗口响应
 */
export interface OpenLinkNodeViewWindowResponse {
  success: boolean
  windowId?: number
  transferId?: string
  error?: {
    message: string
  }
}

/**
 * 删除链接请求
 */
export interface DeleteLinksRequest {
  tabId: string
  linkIds: string[]
}

/**
 * 同步删除事件数据
 */
export interface SyncDeleteEventData {
  tabId: string
  linkIds: string[]
}

