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
        class="nav-icon-btn active"
        @click="handleClick('files')"
      >
        <el-icon class="nav-icon"><Folder /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 搜索图标 -->
    <el-tooltip content="搜索" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        @click="handleClick('search')"
      >
        <el-icon class="nav-icon"><Search /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- 笔记本图标 -->
    <el-tooltip content="笔记本" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        @click="handleClick('notebook')"
      >
        <el-icon class="nav-icon"><Calendar /></el-icon>
      </button>
    </el-tooltip>
    
    <!-- DocParser文档解析器 -->
    <el-tooltip content="文档解析器" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
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
          @click="handleClick('settings')"
        >
          <el-icon class="nav-icon"><Setting /></el-icon>
        </button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Folder, Search, Calendar, Setting, HomeFilled, DocumentCopy } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'

/**
 * ProjectNavbar
 * 左侧窄导航栏（48px）
 */

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()
const currentView = ref<string>('files') // 默认是文件浏览器

const handleClick = async (type: string) => {
  console.log('Navbar clicked:', type)
  
  if (type === 'home') {
    try {
      await window.nimbria.window.showMain()
      console.log('Main window shown and focused')
    } catch (error) {
      console.error('Failed to show main window:', error)
    }
    return
  }
  
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
    } else {
      console.error('[ProjectNavbar] Failed to open DocParser: no focused pane available')
    }
    
    return
  }
  
  // 其他导航项
  if (type === 'files') {
    currentView.value = 'files'
  }
  
  // TODO: 实现其他导航逻辑
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
