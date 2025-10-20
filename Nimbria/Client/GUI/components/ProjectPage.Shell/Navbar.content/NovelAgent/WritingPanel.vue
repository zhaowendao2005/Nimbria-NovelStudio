<template>
  <div class="novel-agent-container">
    <!-- Tree 组件 - 功能域选择 -->
    <div class="tree-wrapper">
      <el-tree 
        :data="agentTree" 
        :props="{ children: 'children', label: 'label' }"
        node-key="id"
        @node-click="handleNodeClick"
        class="agent-tree"
      />
    </div>
    
    <!-- 面板内容容器 -->
    <div class="panel-container">
      <!-- 1.1 控制台面板 -->
      <console-panel v-if="selectedPanel === 'console'" />
      
      <!-- 1.2 配置面板（初始化） -->
      <config-init-panel v-if="selectedPanel === 'config-init'" />
      
      <!-- 1.3 配置面板（即时） -->
      <config-live-panel v-if="selectedPanel === 'config-live'" />
      
      <!-- 1.4 进度面板 -->
      <progress-panel v-if="selectedPanel === 'progress'" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ConsolePanel from './ConsolePanel.vue'
import ConfigInitPanel from './ConfigInitPanel.vue'
import ConfigLivePanel from './ConfigLivePanel.vue'
import ProgressPanel from './ProgressPanel.vue'

/**
 * NovelAgent 主组件
 * 星图系统和其他功能的统一入口
 */

// Tree 数据结构
const agentTree = ref([
  {
    id: 'starchart',
    label: 'StarChart 星图 - 世界树系统',
    children: [
      { id: 'console', label: '控制台' },
      { id: 'config-init', label: '视图配置面板（初始化）' },
      { id: 'config-live', label: '视图配置面板（即时）' },
      { id: 'progress', label: '初始化进度面板' }
    ]
  },
  {
    id: 'other',
    label: '其他',
    children: []
  }
])

// 当前选中的面板
const selectedPanel = ref('console')

// 节点点击处理
const handleNodeClick = (data: any) => {
  // 只有叶子节点才切换面板
  if (!data.children || data.children.length === 0) {
    selectedPanel.value = data.id
  }
}
</script>

<style scoped>
.novel-agent-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 2px solid #ADD8E6;  /* 淡蓝色边框 */
  border-radius: 4px;
  overflow: hidden;
  background: var(--obsidian-background-primary);
}

/* Tree 包装器 - 固定高度，不滚动 */
.tree-wrapper {
  flex-shrink: 0;
  border-bottom: 1px solid #ADD8E6;
  background: var(--obsidian-background-secondary);
  max-height: 180px;
  overflow-y: auto;
}

.agent-tree {
  --el-tree-node-hover-bg-color: transparent;
  --el-tree-text-color: var(--obsidian-text-primary);
  --el-tree-expand-icon-color: var(--obsidian-text-secondary);
}

/* 面板容器 - 撑满剩余空间 */
.panel-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>

