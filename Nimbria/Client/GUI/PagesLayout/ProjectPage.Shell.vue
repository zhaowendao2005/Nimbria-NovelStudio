<template>
  <div class="project-page-shell">
    <!-- 左栏内容：导航 + 文件树 -->
    <ProjectNavbar class="navbar" />
    <div class="file-tree-container">
      <FileTreeToolbar />
      <FileTreeContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import { provide, reactive } from 'vue'
import ProjectNavbar from '@components/ProjectPage.Shell/Navbar/ProjectNavbar.vue'
import FileTreeToolbar from '@components/ProjectPage.Shell/FileTree/FileTreeToolbar.vue'
import FileTreeContent from '@components/ProjectPage.Shell/FileTree/FileTreeContent.vue'

/**
 * ProjectPage.Shell
 * 左栏Shell容器
 * 职责：显示导航栏 + 文件树
 * 右栏已迁移至RightSidebar插件式系统
 */

// ==================== 提供展开/折叠状态给子组件 ====================
// 使用reactive对象包装，确保响应式
const expandAllState = reactive({ value: true })
provide('expandAllState', expandAllState)
</script>

<style scoped lang="scss">
@import './ProjectPage.Shell.scss';

// 左栏布局
.project-page-shell {
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
</style>
