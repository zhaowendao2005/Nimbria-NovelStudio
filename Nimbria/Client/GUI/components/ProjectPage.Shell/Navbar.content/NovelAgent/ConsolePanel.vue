<template>
  <div class="console-panel">
    <!-- 卡片 -->
    <div class="card">
      <div class="card-title">
        <span>控制台</span>
      </div>
      
      <div class="card-content">
        <!-- 介绍文字 -->
        <div class="intro-text">
          <p>这是一个强大的海量结构化数据可视化渲染引擎，支持30000+节点的MC配方图绘制。</p>
          <p>通过手动LOD控制、分层布局和贝塞尔曲线边，提供高性能和灵活的交互体验。</p>
        </div>
        
        <!-- 启动按钮 -->
        <div class="card-actions">
          <el-button type="primary" @click="handleCreate" size="small">
            创建视图
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ConsolePanel
 * 控制台面板 - 提供启动按钮和系统介绍
 */

const handleCreate = () => {
  // TODO: 创建新视图的逻辑
  console.log('创建新的StarChart视图')
}
</script>

<style scoped>
.console-panel {
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
  min-height: 0;  /* 关键：允许flex内容缩放 */
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
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--card-content-bg-color, #f9f9f9);
  overflow-y: auto;
}

/* 介绍文字 */
.intro-text {
  flex: 1;
  font-size: 11px;
  color: var(--obsidian-text-secondary);
  line-height: 1.3;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

.intro-text p {
  margin: 0 0 2px 0;
}

.intro-text p:last-child {
  margin-bottom: 0;
}

/* 卡片操作按钮 */
.card-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
}

:deep(.el-button) {
  font-size: 11px;
  padding: 2px 12px;
  height: 24px;
}
</style>
