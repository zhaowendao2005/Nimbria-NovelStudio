<template>
  <div class="project-page-shell" :class="[`shell-${type}`]">
    <!-- 左栏内容：导航 + 文件树 -->
    <template v-if="type === 'left'">
      <ProjectNavbar class="navbar" />
      <div class="file-tree-container">
        <FileTreeToolbar />
        <FileTreeContent />
      </div>
    </template>
    
    <!-- 右栏内容：大纲 -->
    <template v-else-if="type === 'right'">
      <OutlineContent />
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineProps, provide, reactive } from 'vue'
import ProjectNavbar from '@components/ProjectPage.Shell/Navbar/ProjectNavbar.vue'
import FileTreeToolbar from '@components/ProjectPage.Shell/FileTree/FileTreeToolbar.vue'
import FileTreeContent from '@components/ProjectPage.Shell/FileTree/FileTreeContent.vue'
import OutlineContent from '@components/ProjectPage.Shell/Outline/OutlineContent.vue'

/**
 * ProjectPage.Shell
 * 左右栏Shell容器（可复用）
 * 通过type prop区分左右栏内容
 * - type="left": 显示Navbar + FileTree
 * - type="right": 显示Outline
 */

defineProps<{
  type: 'left' | 'right'
}>()

// ==================== 提供展开/折叠状态给子组件 ====================
// 使用reactive对象包装，确保响应式
const expandAllState = reactive({ value: true })
provide('expandAllState', expandAllState)
</script>

<style scoped lang="scss">
@import './ProjectPage.Shell.scss';

// 左栏布局
.shell-left {
  display: flex;
  height: 100%;
  overflow: hidden;
  
  .navbar {
    width: 48px;
    flex-shrink: 0;
  }
  
  .file-tree-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0; /* 🔑 关键！允许flex压缩 */
  }
}

/* 右栏布局 */
.shell-right {
  height: 100%;
  overflow: hidden;
  min-height: 0; /* 🔑 关键！允许flex压缩 */
}
</style>
