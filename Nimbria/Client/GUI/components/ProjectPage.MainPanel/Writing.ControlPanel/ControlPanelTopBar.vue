<template>
  <div class="control-panel-topbar">
    <div class="topbar-left">
      <h3 class="topbar-title">🎛️ 中央控制台</h3>
    </div>
    
    <div class="topbar-right">
      <el-button-group>
        <el-button 
          size="small" 
          :icon="Refresh"
          @click="handleRefresh"
        >
          刷新
        </el-button>
        <el-button 
          size="small" 
          :icon="Setting"
          @click="handleSettings"
        >
          设置
        </el-button>
        <el-button 
          size="small" 
          :icon="Download"
          @click="handleExport"
        >
          导出
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Refresh, Setting, Download } from '@element-plus/icons-vue'

// 定义事件
const emit = defineEmits<{
  refresh: []
  settings: []
  export: []
}>()

// 刷新
const handleRefresh = () => {
  emit('refresh')
}

// 设置
const handleSettings = () => {
  emit('settings')
}

// 导出
const handleExport = () => {
  emit('export')
}
</script>

<style scoped lang="scss">
.control-panel-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>

