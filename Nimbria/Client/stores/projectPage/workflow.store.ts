/**
 * 工作流Store
 * 管理高级模式工作流的状态
 * 
 * 🔥 多例模式：每个tabId对应一个工作流实例
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import type { 
  WorkflowInstance, 
  WorkflowNode, 
  WorkflowEdge,
  NodeExecutionResult,
  WorkflowExecutionStatus
} from '@gui/components/ProjectPage.MainPanel/SearchAndScraper/RightPanel/TabContents/AdvancedMode/types'

export const useWorkflowStore = defineStore('workflow', () => {
  // ==================== 状态 ====================
  
  /**
   * 所有工作流实例
   * Key: tabId, Value: WorkflowInstance
   */
  const instances = ref<Map<string, WorkflowInstance>>(new Map())
  
  /**
   * 🔥 用户配置的浏览器路径（用于Puppeteer）
   */
  const browserExecutablePath = ref<string | null>(null)
  
  // ==================== Getters ====================
  
  /**
   * 获取指定实例
   */
  const getInstance = computed(() => (tabId: string): WorkflowInstance | undefined => {
    return instances.value.get(tabId)
  })
  
  /**
   * 获取所有实例
   */
  const getAllInstances = computed(() => {
    return Array.from(instances.value.values())
  })
  
  // ==================== Actions ====================
  
  /**
   * 初始化工作流实例
   */
  function initializeInstance(tabId: string, batchId?: string): WorkflowInstance {
    const now = Date.now()
    
    const instance: WorkflowInstance = {
      id: tabId,
      batchId,
      nodes: [
        // 🔥 默认节点：获取文本
        {
          id: nanoid(),
          type: 'get-text',
          position: { x: 100, y: 100 },
          dragHandle: '.node-drag-handle',
          data: {
            label: '获取文本',
            selector: 'body',
            config: {
              strategy: 'direct',
              removeSelectors: 'script, style, nav, header, footer'
            }
          }
        },
        // 🔥 默认节点：获取链接
        {
          id: nanoid(),
          type: 'get-links',
          position: { x: 400, y: 100 },
          dragHandle: '.node-drag-handle',
          data: {
            label: '获取链接',
            config: {
              containerSelector: '',
              filterKeywords: '首页, 书架, 投票, 打赏'
            }
          }
        }
      ],
      edges: [],
      status: 'idle',
      nodeOutputs: new Map(),
      titleSelector: undefined,
      createdAt: now,
      updatedAt: now
    }
    
    instances.value.set(tabId, instance)
    console.log(`[WorkflowStore] Initialized instance for tab: ${tabId}`, instance)
    
    return instance
  }
  
  /**
   * 获取或创建实例
   */
  function getOrCreateInstance(tabId: string, batchId?: string): WorkflowInstance {
    let instance = instances.value.get(tabId)
    
    if (!instance) {
      instance = initializeInstance(tabId, batchId)
    }
    
    return instance
  }
  
  /**
   * 更新实例节点
   */
  function updateNodes(tabId: string, nodes: WorkflowNode[]): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    instance.nodes = nodes
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Updated nodes for tab: ${tabId}`, nodes)
  }
  
  /**
   * 更新实例边
   */
  function updateEdges(tabId: string, edges: WorkflowEdge[]): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    instance.edges = edges
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Updated edges for tab: ${tabId}`, edges)
  }
  
  /**
   * 更新单个节点数据
   */
  function updateNodeData(tabId: string, nodeId: string, data: Partial<WorkflowNode['data']>): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    const node = instance.nodes.find(n => n.id === nodeId)
    if (!node) {
      console.warn(`[WorkflowStore] Node not found: ${nodeId}`)
      return
    }
    
    node.data = { ...node.data, ...data }
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Updated node data:`, nodeId, data)
  }
  
  /**
   * 设置节点执行结果
   */
  function setNodeOutput(tabId: string, nodeId: string, result: NodeExecutionResult): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    instance.nodeOutputs.set(nodeId, result)
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Set node output:`, nodeId, result)
  }
  
  /**
   * 获取节点执行结果
   */
  function getNodeOutput(tabId: string, nodeId: string): NodeExecutionResult | undefined {
    const instance = instances.value.get(tabId)
    if (!instance) {
      return undefined
    }
    
    return instance.nodeOutputs.get(nodeId)
  }
  
  /**
   * 更新工作流状态
   */
  function updateStatus(tabId: string, status: WorkflowExecutionStatus, currentNodeId?: string): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    instance.status = status
    instance.currentNodeId = currentNodeId
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Updated status for tab: ${tabId}`, status, currentNodeId)
  }
  
  /**
   * 设置章节标题选择器
   */
  function setTitleSelector(tabId: string, selector: string): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    instance.titleSelector = selector
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Set title selector for tab: ${tabId}`, selector)
  }
  
  /**
   * 清空工作流
   */
  function clearWorkflow(tabId: string): void {
    const instance = instances.value.get(tabId)
    if (!instance) {
      console.warn(`[WorkflowStore] Instance not found: ${tabId}`)
      return
    }
    
    instance.nodes = []
    instance.edges = []
    instance.nodeOutputs = new Map()
    instance.status = 'idle'
    instance.currentNodeId = undefined
    instance.updatedAt = Date.now()
    
    console.log(`[WorkflowStore] Cleared workflow for tab: ${tabId}`)
  }
  
  /**
   * 删除实例
   */
  function deleteInstance(tabId: string): void {
    instances.value.delete(tabId)
    console.log(`[WorkflowStore] Deleted instance: ${tabId}`)
  }
  
  /**
   * 导出工作流数据（用于保存到数据库）
   */
  function exportWorkflow(tabId: string) {
    const instance = instances.value.get(tabId)
    if (!instance) {
      return null
    }
    
    return {
      version: '1.0.0',
      batchId: instance.batchId,
      nodes: instance.nodes,
      edges: instance.edges,
      titleSelector: instance.titleSelector,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt
    }
  }
  
  /**
   * 🔥 设置浏览器路径
   */
  function setBrowserExecutablePath(path: string | null): void {
    browserExecutablePath.value = path
    
    // 持久化到本地存储
    if (path) {
      localStorage.setItem('nimbria_browser_path', path)
    } else {
      localStorage.removeItem('nimbria_browser_path')
    }
    
    // 同步到后端
    void window.nimbria.workflow.setBrowserPath(path)
    
    console.log(`[WorkflowStore] Browser path set to: ${path || '(auto-detect)'}`)
  }
  
  /**
   * 🔥 加载浏览器路径
   */
  function loadBrowserExecutablePath(): void {
    const saved = localStorage.getItem('nimbria_browser_path')
    if (saved) {
      browserExecutablePath.value = saved
      void window.nimbria.workflow.setBrowserPath(saved)
      console.log(`[WorkflowStore] Loaded browser path: ${saved}`)
    }
  }
  
  // 🔥 初始化时加载浏览器路径
  loadBrowserExecutablePath()
  
  return {
    // State
    instances,
    browserExecutablePath,
    
    // Getters
    getInstance,
    getAllInstances,
    
    // Actions
    initializeInstance,
    getOrCreateInstance,
    updateNodes,
    updateEdges,
    updateNodeData,
    setNodeOutput,
    getNodeOutput,
    updateStatus,
    setTitleSelector,
    clearWorkflow,
    deleteInstance,
    exportWorkflow,
    setBrowserExecutablePath,
    loadBrowserExecutablePath
  }
})

