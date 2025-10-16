<template>
  <div class="writing-panel">
    <div class="writing-header">
      <h3>NovelAgent</h3>
    </div>
    
    <el-collapse v-model="activeNames" class="writing-collapse">
      <!-- 分类一 -->
      <el-collapse-item title="分类一" name="category1">
        <div class="collapse-content">
          <el-empty description="功能开发中..." />
        </div>
      </el-collapse-item>

      <!-- 分类二 -->
      <el-collapse-item title="分类二" name="category2">
        <div class="collapse-content">
          <el-empty description="功能开发中..." />
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * WritingPanel
 * NovelAgent 面板
 * 提供小说创作相关功能
 */

// 默认展开第一个分组
const activeNames = ref(['category1'])
</script>

<style scoped>
.writing-panel {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 面板本身不滚动 */
}

.writing-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--obsidian-border-color);
  flex-shrink: 0; /* 标题固定 */
}

.writing-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

/* Collapse 容器占满剩余空间 */
.writing-collapse {
  flex: 1; /* 关键：填充父容器 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  --el-collapse-border-color: var(--obsidian-border-color);
  --el-collapse-header-bg-color: var(--obsidian-background-secondary);
  --el-collapse-header-text-color: var(--obsidian-text-primary);
}

/* 折叠内容区域高度自适应 */
.collapse-content {
  height: 100%;
  min-height: 200px; /* 最小高度 */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto; /* 内容超出时滚动 */
}
</style>

