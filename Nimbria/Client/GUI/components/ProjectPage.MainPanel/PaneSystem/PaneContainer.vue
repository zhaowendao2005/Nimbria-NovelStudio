<template>
  <!-- Split 节点：使用 QSplitter 递归渲染 -->
  <q-splitter
    v-if="node.type === 'split'"
    :model-value="node.splitRatio || 50"
    :horizontal="node.direction === 'vertical'"
    :limits="[10, 90]"
    separator-class="pane-splitter"
    @update:model-value="handleRatioChange"
  >
    <template #before>
      <PaneContainer :node="node.children![0]" />
    </template>
    
    <template #after>
      <PaneContainer :node="node.children![1]" />
    </template>
  </q-splitter>
  
  <!-- Leaf 节点：渲染实际内容 -->
  <PaneContent
    v-else
    :pane-id="node.id"
    :tab-id="node.tabId || null"
    :is-focused="node.isFocused || false"
  />
</template>

<script setup lang="ts">
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { PaneNode } from '@stores/projectPage/paneLayout/types'
import PaneContent from './PaneContent.vue'

/**
 * PaneContainer
 * 递归组件，负责渲染分屏树结构
 * 
 * - Split 节点：使用 QSplitter 分隔器，递归渲染子节点
 * - Leaf 节点：渲染 PaneContent 组件
 */

interface Props {
  node: PaneNode
}

const props = defineProps<Props>()
const paneLayoutStore = usePaneLayoutStore()

/**
 * 处理分隔比例变化
 */
const handleRatioChange = (newRatio: number) => {
  if (props.node.type === 'split') {
    paneLayoutStore.updateSplitRatio(props.node.id, newRatio)
  }
}
</script>

<style scoped>
/* QSplitter 会自动填充父容器 */
:deep(.q-splitter) {
  width: 100%;
  height: 100%;
}

/* 分隔线样式 */
:deep(.pane-splitter) {
  background: var(--obsidian-border, #e3e5e8);
  transition: background 0.2s;
}

:deep(.pane-splitter:hover) {
  background: var(--obsidian-accent, #5b7fff);
}

/* 分隔线手柄 */
:deep(.q-splitter__separator) {
  background: transparent;
}
</style>

