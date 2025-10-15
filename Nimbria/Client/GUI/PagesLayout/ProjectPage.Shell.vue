<template>
  <div class="project-page-shell">
    <!-- 左栏内容：导航 + 动态内容区 -->
    <ProjectNavbar class="navbar" @nav-click="handleNavClick" />
    
    <!-- 动态内容区 -->
    <transition name="fade" mode="out-in">
      <div v-if="isContentVisible" class="content-container" :key="currentView">
        <!-- 文件树 -->
        <div v-if="currentView === 'files'" class="file-tree-container">
          <FileTreeToolbar />
          <FileTreeContent />
        </div>
        
        <!-- LLM对话 -->
        <LlmChatPanel v-else-if="currentView === 'chat'" />
        
        <!-- 搜索 -->
        <div v-else-if="currentView === 'search'" class="search-panel">
          <div class="placeholder-panel">
            <el-empty description="搜索功能开发中" />
          </div>
        </div>
        
        <!-- 笔记本 -->
        <div v-else-if="currentView === 'notebook'" class="notebook-panel">
          <div class="placeholder-panel">
            <el-empty description="笔记本功能开发中" />
          </div>
        </div>
        
        <!-- 设置 -->
        <div v-else-if="currentView === 'settings'" class="settings-panel">
          <div class="placeholder-panel">
            <el-empty description="设置功能开发中" />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, provide, reactive } from 'vue'
import ProjectNavbar from 'components/ProjectPage.Shell/Navbar/ProjectNavbar.vue'
import FileTreeToolbar from 'components/ProjectPage.Shell/FileTree/FileTreeToolbar.vue'
import FileTreeContent from 'components/ProjectPage.Shell/FileTree/FileTreeContent.vue'
import LlmChatPanel from 'components/ProjectPage.Shell/Navbar.content/LlmChat/LlmChatPanel.vue'

/**
 * ProjectPage.Shell
 * 左栏Shell容器
 * 职责：显示导航栏 + 动态内容区（文件树、LLM对话等）
 * 支持导航切换和内容区收起
 */

// ==================== 导航状态管理 ====================
const currentView = ref<string>('files') // 默认显示文件树
const isContentVisible = ref<boolean>(true)
const previousView = ref<string>('files')

// 处理导航点击
const handleNavClick = (navType: string) => {
  console.log('[ProjectPage.Shell] Nav clicked:', navType)
  
  // 如果点击的是当前激活的导航项，切换内容区可见性
  if (navType === currentView.value) {
    isContentVisible.value = !isContentVisible.value
  } else {
    // 切换到新的导航项
    previousView.value = currentView.value
    currentView.value = navType
    isContentVisible.value = true
  }
}

// ==================== 提供展开/折叠状态给子组件 ====================
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
  
  .content-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }
  
  .file-tree-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0; /* 🔑 关键！允许flex压缩 */
  }
  
  .placeholder-panel {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
