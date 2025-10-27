<template>
  <div class="workflow-canvas">
    <VueFlow
      v-model:nodes="localNodes"
      v-model:edges="localEdges"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="4"
      :nodes-draggable="true"
      :nodes-connectable="true"
      :elements-selectable="true"
      @node-double-click="(e: NodeMouseEvent) => emit('node-click', e)"
    >
      <!-- 背景网格 -->
      <Background pattern-color="#aaa" :gap="16" />
      
      <!-- 控制按钮 -->
      <Controls />
      
      <!-- 小地图 -->
      <MiniMap />
      
      <!-- 自定义节点：获取文本 -->
      <template #node-get-text="nodeProps">
        <GetTextNode v-bind="nodeProps" />
      </template>
    </VueFlow>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeMouseEvent } from '@vue-flow/core'
import GetTextNode from './Nodes/GetTextNode.vue'

interface Props {
  nodes: Node[]
  edges: Edge[]
}

interface Emits {
  (e: 'update:nodes', nodes: Node[]): void
  (e: 'update:edges', edges: Edge[]): void
  (e: 'node-click', event: NodeMouseEvent): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localNodes = ref<Node[]>(props.nodes)
const localEdges = ref<Edge[]>(props.edges)

// 同步到父组件
watch([localNodes, localEdges], () => {
  emit('update:nodes', localNodes.value)
  emit('update:edges', localEdges.value)
}, { deep: true })

// 同步父组件的变化
watch(() => props.nodes, (newNodes) => {
  localNodes.value = newNodes
}, { deep: true })

watch(() => props.edges, (newEdges) => {
  localEdges.value = newEdges
}, { deep: true })
</script>

<style lang="scss">
// 🔥 不使用scoped，让VueFlow的全局样式生效
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.workflow-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
  
  // 🔥 确保VueFlow的容器占满整个空间
  :deep(.vue-flow) {
    width: 100%;
    height: 100%;
  }
}
</style>

