<template>
  <div class="config-live-panel">
    <!-- 卡片 -->
    <div class="card">
      <div class="card-title">
        <span>视图配置（即时）</span>
      </div>
      
      <div class="card-content">
        <!-- 实时配置项占位符 -->
        <div class="config-item">
          <span class="config-label">缩放</span>
          <el-slider v-model="zoomValue" :min="0.1" :max="2" :step="0.1" size="small" />
        </div>
        
        <div class="config-item">
          <span class="config-label">不透明度</span>
          <el-slider v-model="opacityValue" :min="0" :max="1" :step="0.1" size="small" />
        </div>
        
        <div class="config-item">
          <span class="config-label">标签</span>
          <el-switch v-model="showLabels" size="small" />
        </div>
        
        <div class="config-item">
          <span class="config-label">动画</span>
          <el-switch v-model="enableAnimation" size="small" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * ConfigLivePanel
 * 即时配置面板 - 用于实时调整视图参数
 */

const zoomValue = ref(1)
const opacityValue = ref(1)
const showLabels = ref(true)
const enableAnimation = ref(true)
</script>

<style scoped>
.config-live-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

/* 卡片容器 */
.card {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--card-border-color, #d0d0d0);
  border-radius: 4px;
  background: var(--obsidian-background-primary);
  overflow: hidden;
  min-height: 0;
}

/* 卡片标题 */
.card-title {
  flex-shrink: 0;
  padding: 8px;
  border-bottom: 1px solid var(--card-border-color, #d0d0d0);
  background: var(--card-title-bg-color, #f5f5f5);
  border-radius: 4px 4px 0 0;
}

.card-title span {
  font-size: 12px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

/* 配置项 */
.config-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  min-width: 0;  /* 防止 flex 子元素溢出 */
}

.config-label {
  flex-shrink: 0;
  color: var(--obsidian-text-secondary);
  width: 60px;
  font-size: 10px;
}

:deep(.el-slider) {
  flex: 1;
  min-width: 0;  /* 关键：允许 flex 项小于内容宽度 */
}

:deep(.el-slider__runway) {
  width: 100%;
}

:deep(.el-switch) {
  flex-shrink: 0;
}

/* 卡片内容 */
.card-content {
  flex: 1;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--card-content-bg-color, #f9f9f9);
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
