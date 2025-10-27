/**
 * 工作流系统类型定义
 * 
 * 🔥 重要：这些类型是前后端通信的协议，修改时务必保持兼容性
 */

import type { Node, Edge } from '@vue-flow/core'

// ==================== 节点数据结构 ====================

/**
 * 🔥 爬取引擎类型
 */
export type ScraperEngine = 'browserview' | 'cheerio' | 'puppeteer'

/**
 * 工作流节点基础配置
 */
export interface WorkflowNodeData {
  label: string                    // 节点显示名称
  selector?: string                // CSS选择器
  config?: Record<string, any>     // 节点特定配置
  output?: any                     // 存储节点执行结果
}

/**
 * 获取文本节点配置
 */
export interface GetTextNodeConfig {
  strategy: 'direct' | 'max-text'  // 提取策略
  removeSelectors?: string         // 要移除的选择器（逗号分隔）
  engine?: ScraperEngine           // 🔥 爬取引擎选择
  densityWeight?: number           // 🔥 密度权重（0-100，默认70）
}

/**
 * 获取文本节点数据
 */
export interface GetTextNodeData extends WorkflowNodeData {
  config: GetTextNodeConfig
}

/**
 * 🔥 获取链接节点配置
 */
export interface GetLinksNodeConfig {
  containerSelector?: string       // 容器选择器
  filterKeywords?: string          // 黑名单关键词（逗号分隔）
}

/**
 * 🔥 获取链接节点数据
 */
export interface GetLinksNodeData extends WorkflowNodeData {
  config: GetLinksNodeConfig
}

/**
 * 工作流节点（VueFlow格式）
 */
export type WorkflowNode = Node<WorkflowNodeData>

/**
 * 工作流边（VueFlow格式）
 */
export type WorkflowEdge = Edge

// ==================== 节点执行结果 ====================

/**
 * 文本提取结果子对象
 */
export interface TextExtractionResult {
  text: string                     // 提取的文本
  length: number                   // 文本长度
  selector: string                 // 使用的选择器
}

/**
 * 获取文本节点执行结果
 */
export interface GetTextNodeOutput {
  success: boolean
  title?: TextExtractionResult     // 标题提取结果
  content?: TextExtractionResult   // 内容提取结果
  url?: string                     // 页面URL
  engine?: ScraperEngine           // 实际使用的引擎
  duration?: number                // 执行耗时（ms）
  error?: string                   // 错误信息
}

/**
 * 🔥 获取链接节点执行结果
 */
export interface GetLinksNodeOutput {
  links: Array<{ title: string; url: string }>
  count: number
  sourceUrl: string
}

/**
 * 节点执行结果（通用）
 */
export interface NodeExecutionResult {
  nodeId: string
  success: boolean
  output?: any                     // 节点特定的输出数据（可选）
  error?: string
  executedAt: number               // 执行时间戳
  engine?: 'browserview' | 'cheerio' | 'puppeteer'  // 实际使用的引擎
  duration?: number                // 执行耗时（ms）
}

// ==================== 工作流状态 ====================

/**
 * 工作流执行状态
 */
export type WorkflowExecutionStatus = 
  | 'idle'        // 空闲
  | 'running'     // 执行中
  | 'paused'      // 暂停
  | 'completed'   // 完成
  | 'error'       // 错误

/**
 * 工作流实例（存储在Store中）
 */
export interface WorkflowInstance {
  id: string                       // 工作流实例ID（与tabId对应）
  batchId?: string                 // 关联的批次ID
  nodes: WorkflowNode[]            // 节点列表
  edges: WorkflowEdge[]            // 边列表
  
  // 执行状态
  status: WorkflowExecutionStatus
  currentNodeId?: string           // 当前执行的节点ID
  
  // 执行结果
  nodeOutputs: Map<string, NodeExecutionResult>  // 节点ID → 执行结果
  
  // 章节标题选择器配置
  titleSelector?: string           // 章节标题选择器（用于从内容页提取标题）
  
  // 元数据
  createdAt: number
  updatedAt: number
}

// ==================== IPC 通信协议 ====================

/**
 * 执行单个节点的请求
 */
export interface ExecuteNodeRequest {
  tabId: string                    // 标签页ID
  nodeId: string                   // 节点ID
  node: WorkflowNode               // 节点配置
  input?: any                      // 输入数据
}

/**
 * 执行单个节点的响应
 */
export interface ExecuteNodeResponse {
  success: boolean
  output?: any                     // 节点输出
  error?: string
}

// ==================== 抽屉配置 ====================

/**
 * 节点配置抽屉状态
 */
export interface NodeConfigDrawerState {
  visible: boolean
  currentNode: WorkflowNode | null
  currentOutput: NodeExecutionResult | null
}

// ==================== 导出类型（供后端使用） ====================

/**
 * 工作流导出格式（用于保存到数据库）
 */
export interface WorkflowExportData {
  version: string                  // 版本号
  batchId?: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  titleSelector?: string
  createdAt: number
  updatedAt: number
}

