<template>
  <!-- 🔥 统一根容器：确保布局链完整 -->
  <div class="pane-container-root">
    <!-- Split 节点：使用 QSplitter 递归渲染 -->
    <q-splitter
      v-if="node.type === 'split'"
      :model-value="node.splitRatio || 50"
      :horizontal="node.direction === 'vertical'"
      :limits="[10, 90]"
      separator-class="pane-splitter"
      class="pane-splitter"
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
      :is-focused="node.isFocused || false"
    />
  </div>
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
/* 🔥 经典 flex 布局方案 - 确保高度传递链正常 */

/* 统一根容器：无论是split还是leaf都应用相同的flex布局 */
.pane-container-root {
  flex: 1;
  flex-shrink: 0;
  height: 0;      /* 🔥 关键：配合 flex: 1，为子元素提供高度计算基准 */
  min-height: 0;  /* 关键：允许在 flex 中收缩 */
  width: 100%;
  overflow: hidden;
  
  display: flex;
  flex-direction: column;
}

/* QSplitter 本身占满父容器 */
.pane-splitter {
  flex: 1;
  flex-shrink: 0;
  height: 0;      /* 🔥 关键：为 QSplitter 内部的 height: 50% 提供计算基准 */
  min-height: 0;
  width: 100%;
}

/* QSplitter 内部面板 */
:deep(.q-splitter__before),
:deep(.q-splitter__after) {
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 分隔线样式 */
:deep(.q-splitter__separator) {
  background: var(--obsidian-border, #e3e5e8);
  transition: background 0.2s;
}

:deep(.q-splitter__separator:hover) {
  background: var(--obsidian-accent, #5b7fff);
}

/* 分隔线手柄 */
:deep(.q-splitter__separator-area) {
  background: transparent;
}
</style>

