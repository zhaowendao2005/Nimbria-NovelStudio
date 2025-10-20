<template>
  <div class="config-init-panel">
    <!-- 卡片 -->
    <div class="card">
      <div class="card-title">
        <span>视图配置（初始化）</span>
      </div>
      
      <div class="card-content">
        <!-- 配置项占位符 -->
        <div class="config-item">
          <span class="config-label">配置项 1</span>
          <el-input placeholder="输入" size="small" />
        </div>
        
        <div class="config-item">
          <span class="config-label">配置项 2</span>
          <el-input placeholder="输入" size="small" />
        </div>
        
        <div class="config-item">
          <span class="config-label">配置项 3</span>
          <el-input placeholder="输入" size="small" />
        </div>
        
        <div class="config-item">
          <span class="config-label">配置项 4</span>
          <el-input placeholder="输入" size="small" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ConfigInitPanel
 * 初始化配置面板 - 用于设置视图初始参数
 */
</script>

<style scoped>
.config-init-panel {
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

/* 卡片内容 */
.card-content {
  flex: 1;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--card-content-bg-color, #f9f9f9);
  overflow-y: auto;
}

/* 配置项 */
.config-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.config-label {
  flex-shrink: 0;
  color: var(--obsidian-text-secondary);
  width: 60px;
  font-size: 10px;
}

:deep(.el-input) {
  font-size: 11px;
}

:deep(.el-input__wrapper) {
  padding: 2px 6px;
}
</style>
