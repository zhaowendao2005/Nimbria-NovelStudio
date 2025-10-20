<template>
  <div class="progress-panel">
    <!-- 卡片 -->
    <div class="card">
      <div class="card-title">
        <span>初始化进度</span>
        <span :class="['status-badge', statusClass]">{{ statusText }}</span>
      </div>
      
      <div class="card-content">
        <!-- 进度条 -->
        <div class="progress-item">
          <span class="progress-label">进度</span>
          <el-progress :percentage="progressValue" :stroke-width="3" />
        </div>
        
        <!-- 操作按钮 -->
        <div class="progress-actions">
          <el-button 
            v-if="!isInitializing" 
            type="primary" 
            size="small"
            @click="handleStart"
          >
            开始
          </el-button>
          
          <el-button 
            v-else 
            type="warning" 
            size="small"
            @click="handleCancel"
          >
            取消
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

/**
 * ProgressPanel
 * 初始化进度面板 - 显示加载进度和操作控制
 */

const progressValue = ref(0)
const isInitializing = ref(false)

const statusText = computed(() => {
  if (!isInitializing.value) {
    return '就绪'
  }
  if (progressValue.value < 100) {
    return '进行中'
  }
  return '完成'
})

const statusClass = computed(() => {
  if (!isInitializing.value) {
    return 'status-idle'
  }
  if (progressValue.value < 100) {
    return 'status-loading'
  }
  return 'status-success'
})

const handleStart = () => {
  isInitializing.value = true
  progressValue.value = 0
  
  // 模拟进度
  const interval = setInterval(() => {
    progressValue.value += Math.random() * 30
    if (progressValue.value >= 100) {
      progressValue.value = 100
      clearInterval(interval)
      setTimeout(() => {
        isInitializing.value = false
      }, 500)
    }
  }, 300)
}

const handleCancel = () => {
  isInitializing.value = false
  progressValue.value = 0
}
</script>

<style scoped>
.progress-panel {
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-title span {
  font-size: 12px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

/* 卡片内容 */
.card-content {
  flex: 1;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--card-content-bg-color, #f9f9f9);
  overflow: hidden;
}

/* 进度项 */
.progress-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
}

.progress-label {
  color: var(--obsidian-text-secondary);
  font-size: 10px;
}

:deep(.el-progress) {
  flex-shrink: 0;
}

/* 状态文字 */
.status-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.status-idle {
  background: #39ba4c97;
  color: #18c46894;
}

.status-loading {
  background: #FFF4E6;
  color: #FF9C00;
}

.status-success {
  background: #E6F7ED;
  color: #26A645;
}

/* 操作按钮 */
.progress-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  margin-top: auto;
}

:deep(.el-button) {
  font-size: 10px;
  padding: 2px 10px;
  height: 24px;
}
</style>
