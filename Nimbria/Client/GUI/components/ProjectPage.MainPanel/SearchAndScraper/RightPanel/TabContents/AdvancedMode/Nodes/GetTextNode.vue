<template>
  <div class="custom-node get-text-node">
    <!-- 🔥 节点头部 - 可拖拽区域 -->
    <div class="node-header node-drag-handle">
      <el-icon><Document /></el-icon>
      <span>获取文本</span>
    </div>
    
    <!-- 🔥 节点内容区域 -->
    <div class="node-body">
      <div class="node-info">
        <div class="info-row">
          <span class="label">选择器:</span>
          <span class="value">{{ data.selector || '未设置' }}</span>
        </div>
        <div class="info-row">
          <span class="label">策略:</span>
          <span class="value">{{ strategyLabel }}</span>
        </div>
      </div>
      <div class="click-hint">双击节点打开配置</div>
    </div>
    
    <!-- VueFlow 连接点 -->
    <Handle type="target" :position="Position.Left" />
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import { Document } from '@element-plus/icons-vue'

const props = defineProps<NodeProps>()

const strategyLabel = computed(() => {
  const strategy = props.data.config?.strategy || 'direct'
  return strategy === 'max-text' ? '找文字最多的div' : '直接提取'
})
</script>

<style scoped lang="scss">
.custom-node {
  background: var(--el-bg-color);
  border: 2px solid var(--el-color-success);
  border-radius: 8px;
  width: 240px; // 🔥 固定宽度，不随视口变化
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--el-color-success-light-3);
    box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
  }
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-color-success-light-9);
  border-bottom: 1px solid var(--el-color-success-light-7);
  font-weight: 500;
  font-size: 14px;
  color: var(--el-color-success);
}

// 🔥 拖拽手柄样式
.node-drag-handle {
  cursor: move;
  user-select: none;
  
  &:hover {
    background: var(--el-color-success-light-8);
  }
}

.node-body {
  padding: 12px;
  position: relative;
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  
  .label {
    color: var(--el-text-color-secondary);
    font-weight: 500;
    min-width: 60px;
  }
  
  .value {
    color: var(--el-text-color-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.click-hint {
  text-align: center;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  padding: 4px;
  border-top: 1px dashed var(--el-border-color-lighter);
  margin-top: 4px;
}

.get-text-node {
  border-color: var(--el-color-success);
}
</style>

