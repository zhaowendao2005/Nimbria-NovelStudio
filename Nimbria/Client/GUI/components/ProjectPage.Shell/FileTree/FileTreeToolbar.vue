<template>
  <div class="file-tree-toolbar">
    <span class="toolbar-title">文件浏览器</span>
    <div class="toolbar-actions">
      <el-tooltip content="新建文件" placement="bottom">
        <el-button link size="small" @click="handleNewFile">
          <el-icon><DocumentAdd /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="新建文件夹" placement="bottom">
        <el-button link size="small" @click="handleNewFolder">
          <el-icon><FolderAdd /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DocumentAdd, FolderAdd } from '@element-plus/icons-vue'

/**
 * FileTreeToolbar
 * 文件树工具栏
 * TODO: 实现新建文件/文件夹功能
 */

const handleNewFile = () => {
  console.log('New file')
  // TODO: 实现新建文件逻辑
}

const handleNewFolder = () => {
  console.log('New folder')
  // TODO: 实现新建文件夹逻辑
}
</script>

<style scoped>
.file-tree-toolbar {
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid var(--obsidian-border);
  background: var(--obsidian-bg-secondary);
  flex-shrink: 0;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--obsidian-text-primary);
}

.toolbar-actions {
  display: flex;
  gap: 4px;
}
</style>
