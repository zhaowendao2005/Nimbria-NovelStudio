<template>
  <div class="project-navbar">
    <!-- Home按钮 -->
    <el-tooltip content="主页" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        @click="handleClick('home')"
      >
        <el-icon class="nav-icon"><HomeFilled /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 文件浏览器图标 -->
    <el-tooltip content="文件浏览器" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'files' }"
        @click="handleClick('files')"
      >
        <el-icon class="nav-icon"><Folder /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- LLM对话图标 -->
    <el-tooltip content="AI助手" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'chat' }"
        @click="handleClick('chat')"
      >
        <el-icon class="nav-icon"><ChatDotRound /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- NovelAgent图标 -->
    <el-tooltip content="NovelAgent" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'writing' }"
        @click="handleClick('writing')"
      >
        <el-icon class="nav-icon"><Edit /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 搜索图标 -->
    <el-tooltip content="搜索" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'search' }"
        @click="handleClick('search')"
      >
        <el-icon class="nav-icon"><Search /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 笔记本图标 -->
    <el-tooltip content="笔记本" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'notebook' }"
        @click="handleClick('notebook')"
      >
        <el-icon class="nav-icon"><Calendar /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- DocParser文档解析器 -->
    <el-tooltip content="文档解析器" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'docparser' }"
        @click="handleClick('docparser')"
      >
        <el-icon class="nav-icon"><DocumentCopy /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 底部设置按钮 -->
    <div class="navbar-bottom">
      <el-tooltip content="设置" placement="right" :show-after="500">
        <button 
          class="nav-icon-btn"
          :class="{ active: currentView === 'settings' }"
          @click="handleClick('settings')"
        >
          <el-icon class="nav-icon"><Setting /></el-icon>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Folder, Search, Calendar, Setting, HomeFilled, DocumentCopy, ChatDotRound, Edit } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import { useLeftSidebarStore } from '@stores/projectPage/leftSidebar'

/**
 * ProjectNavbar
 * 左侧窄导航栏（48px）
 * 支持动态高亮和内容区切换
 */

// 定义 emit
const emit = defineEmits<{
  navClick: [type: string]
}>()

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()
const leftSidebarStore = useLeftSidebarStore()

// 从 store 读取当前视图
const currentView = computed(() => leftSidebarStore.currentView)

const handleClick = async (type: string) => {
  console.log('Navbar clicked:', type)
  
  // 主页按钮 - 特殊处理，显示主窗口
  if (type === 'home') {
    try {
      await window.nimbria.window.showMain()
      console.log('Main window shown and focused')
    } catch (error) {
      console.error('Failed to show main window:', error)
    }
    return
  }
  
  // 文档解析器 - 特殊处理，在主内容区创建panel
  if (type === 'docparser') {
    console.log('[ProjectNavbar] 打开DocParser标签页')
    
    // 1. 打开DocParser标签页
    const tab = markdownStore.openDocParser()
    
    if (!tab) {
      console.error('[ProjectNavbar] Failed to create DocParser tab')
      return
    }
      
    // 2. 🔥 如果没有面板，先创建默认面板
    if (!paneLayoutStore.focusedPane) {
      console.log('[ProjectNavbar] No pane exists, creating default layout')
      paneLayoutStore.resetToDefaultLayout()
    }
    
    // 3. 在焦点面板中显示该 tab
    if (paneLayoutStore.focusedPane) {
      paneLayoutStore.openTabInPane(paneLayoutStore.focusedPane.id, tab.id)
      console.log('[ProjectNavbar] Opened DocParser in focused pane:', {
        paneId: paneLayoutStore.focusedPane.id,
        tabId: tab.id
      })
      
      // 更新 leftSidebarStore 的当前视图
      leftSidebarStore.setView('docparser')
    } else {
      console.error('[ProjectNavbar] Failed to open DocParser: no focused pane available')
    }
    
    return
  }
  
  // 其他导航项 - 触发左侧内容区切换
  emit('navClick', type)
}
</script>

<style scoped>
.project-navbar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 8px;
}

.nav-icon-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--obsidian-text-secondary);
  outline: none;
}

.nav-icon-btn:hover {
  background: var(--obsidian-hover-bg);
  color: var(--obsidian-text-primary);
}

.nav-icon-btn:focus {
  outline: none;
}

.nav-icon-btn:active {
  background: var(--obsidian-hover-bg);
}

.nav-icon-btn.active {
  background: var(--obsidian-accent);
  color: #ffffff;
}

.nav-icon {
  font-size: 18px;
}

.navbar-bottom {
  margin-top: auto;
}
</style>
