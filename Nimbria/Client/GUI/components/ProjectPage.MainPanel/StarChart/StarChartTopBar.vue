<template>
  <div class="starchart-topbar">
    <div class="topbar-left">
      <span class="topbar-title">📊 StarChart 可视化视图</span>
      <span class="topbar-desc">基于 Cytoscape.js 的小说设定关系图</span>
    </div>
    
    <div class="topbar-right">
      <el-button size="small" @click="$emit('create-view')">
        <el-icon><Plus /></el-icon>
        创建视图
      </el-button>
      
      <el-button size="small" @click="$emit('relayout')">
        <el-icon><Refresh /></el-icon>
        重新布局
      </el-button>
      
      <el-button size="small" @click="$emit('export')">
        <el-icon><Download /></el-icon>
        导出
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Refresh, Download } from '@element-plus/icons-vue'

defineEmits<{
  'create-view': []
  'relayout': []
  'export': []
}>()
</script>

<style scoped lang="scss">
.starchart-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px; /* 固定高度 */
  padding: 0 16px;
  background: var(--obsidian-background-secondary);
  border-bottom: 1px solid var(--obsidian-border-color);
  flex-shrink: 0; /* 防止被压缩 */
}

.topbar-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.topbar-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

.topbar-desc {
  font-size: 12px;
  color: var(--obsidian-text-secondary);
}

.topbar-right {
  display: flex;
  gap: 8px;
}
</style>

