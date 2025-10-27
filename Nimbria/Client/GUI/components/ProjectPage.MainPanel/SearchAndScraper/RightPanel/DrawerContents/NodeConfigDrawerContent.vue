<template>
  <NodeConfigContent
    v-if="currentNode"
    :node="currentNode"
    :output="currentOutput"
    :tab-id="props.tabId"
    @update-node="handleUpdateNode"
    @execute-node="handleExecuteNode"
  />
  <el-empty v-else description="未找到节点" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useWorkflowStore } from '@stores/projectPage/workflow.store'
import { NodeConfigContent } from '../TabContents/AdvancedMode'
import type { WorkflowNode } from '../TabContents/AdvancedMode'

/**
 * 节点配置抽屉内容（封装组件）
 * 用于在RightDrawer中显示
 */

interface Props {
  tabId: string
  nodeId?: string
}

const props = defineProps<Props>()
const workflowStore = useWorkflowStore()

// 获取当前节点
const currentNode = computed(() => {
  if (!props.nodeId) return null
  
  const instance = workflowStore.getInstance(props.tabId)
  if (!instance) return null
  
  return instance.nodes.find(n => n.id === props.nodeId) || null
})

// 获取节点执行结果
const currentOutput = computed(() => {
  if (!props.nodeId) return null
  return workflowStore.getNodeOutput(props.tabId, props.nodeId) || null
})

/**
 * 更新节点配置
 */
const handleUpdateNode = (data: Partial<WorkflowNode['data']>): void => {
  if (!props.nodeId) return
  
  workflowStore.updateNodeData(props.tabId, props.nodeId, data)
  console.log(`[NodeConfigDrawer] Node config updated:`, props.nodeId, data)
}

/**
 * 执行节点
 */
const handleExecuteNode = async (): Promise<void> => {
  if (!props.nodeId || !currentNode.value) return
  
  console.log(`[NodeConfigDrawer] Executing node:`, props.nodeId)
  
  try {
    const nodeData = currentNode.value.data
    if (!nodeData) {
      throw new Error('Node data is undefined')
    }
    
    // 🔥 获取当前BrowserView的URL
    const navState = await window.nimbria.searchScraper.getNavigationState(props.tabId)
    const currentUrl = navState.currentUrl
    
    if (!currentUrl) {
      ElMessage({
        type: 'error',
        message: '请先在左侧浏览器中打开一个页面'
      })
      return
    }
    
    console.log(`[NodeConfigDrawer] Current URL: ${currentUrl}`)
    
    // 🔥 构造纯粹的可序列化对象（避免IPC克隆错误）
    const cleanNodeData = {
      label: nodeData.label || '',
      selector: nodeData.selector || undefined,
      config: nodeData.config ? {
        engine: nodeData.config.engine || 'browserview',
        strategy: nodeData.config.strategy || 'direct',
        removeSelectors: nodeData.config.removeSelectors || undefined
      } : undefined
    }
    
    // 🔥 调用后端IPC执行节点，传递currentUrl
    const result = await window.nimbria.workflow.executeNode({
      node: {
        id: currentNode.value.id,
        type: currentNode.value.type as string,
        data: cleanNodeData
      },
      context: {
        tabId: props.tabId,
        currentUrl: currentUrl  // 🔥 传递当前URL
      }
    })
    
    console.log(`[NodeConfigDrawer] Node execution result:`, result)
    
    // 保存执行结果到store
    workflowStore.setNodeOutput(props.tabId, props.nodeId, {
      ...result,
      output: result.output
    })
    
    if (result.success) {
      const engine = result.engine || 'unknown'
      const duration = result.duration ? `${result.duration}ms` : ''
      // @ts-expect-error - ElMessage类型问题
      ElMessage({
        type: 'success',
        message: `节点执行成功 (${engine}) ${duration}` 
      })
    } else {
      // @ts-expect-error - ElMessage类型问题
      ElMessage({
        type: 'error',
        message: `节点执行失败: ${result.error || 'Unknown error'}` 
      })
    }
  } catch (error) {
    console.error(`[NodeConfigDrawer] Failed to execute node:`, error)
    // @ts-expect-error - ElMessage类型问题
    ElMessage({
      type: 'error',
      message: `执行失败: ${error instanceof Error ? error.message : String(error)}` 
    })
  }
}
</script>

