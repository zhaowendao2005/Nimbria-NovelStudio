<template>
  <div class="project-page-main-panel">
    <!-- 自动保存指示器 - 仅在 markdown 模式下显示 -->
    <AutoSaveIndicator v-if="isMarkdownMode" />
    
    <!-- 🔥 分屏系统（有面板时显示） -->
    <div 
      v-if="paneLayoutStore.hasPanes" 
      class="pane-system-container"
    >
      <PaneContainer :node="paneLayoutStore.paneTree" />
    </div>
    
    <!-- 🔥 欢迎页（无面板时显示） -->
    <div v-else class="welcome-container">
      <div class="welcome-content">
        <h1>欢迎使用 Markdown 编辑器</h1>
        <p>单击左侧文件树中的文件以打开</p>
        <div class="welcome-tips">
          <h3>快捷键提示：</h3>
          <ul>
            <li><kbd>Ctrl/Cmd + S</kbd> - 保存当前文件</li>
            <li><kbd>Ctrl/Cmd + E</kbd> - 切换编辑模式</li>
            <li><kbd>Ctrl/Cmd + V</kbd> - 切换查看模式</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import PaneContainer from '@components/ProjectPage.MainPanel/PaneSystem/PaneContainer.vue'
import AutoSaveIndicator from '@components/ProjectPage.MainPanel/AutoSave/AutoSaveIndicator.vue'
import { useMarkdownStore } from '@stores/projectPage'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'

/**
 * ProjectPage.MainPanel
 * 中栏主面板容器
 * 职责：管理 Markdown 分屏系统
 */

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

// 判断是否为 markdown 模式（仅在 markdown 类型的标签页激活时显示自动保存指示器）
const isMarkdownMode = computed(() => {
  const activeTab = markdownStore.activeTab
  if (!activeTab) return false
  
  // 如果没有设置 type 或者 type 为 'markdown'，则显示自动保存指示器
  return !activeTab.type || activeTab.type === 'markdown'
})

// 初始化文件树
onMounted(async () => {
  // 项目路径会自动从当前项目窗口获取
  await markdownStore.initializeFileTree()
  
  console.log('[ProjectPage.MainPanel] Initialized with pane tree:', paneLayoutStore.paneTree)
})
</script>

<style scoped lang="scss">
@import './ProjectPage.MainPanel.scss';

/* 布局样式 */
.project-page-main-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 🔥 分屏系统容器 - 经典 flex 布局 */
.pane-system-container {
  flex: 1;
  flex-shrink: 0;  /* 🔥 关键：不被压缩 */
  height: 0;       /* 🔥 关键：配合 flex: 1，为子元素的百分比高度提供计算基准 */
  min-height: 0;   /* 🔥 关键：允许收缩 */
  overflow: hidden;
  position: relative;
  
  /* 确保子元素也是flex布局 */
  display: flex;
  flex-direction: column;
}

/* 欢迎页样式 */
.welcome-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  overflow: auto;
}

.welcome-content {
  max-width: 600px;
  text-align: center;
  
  h1 {
    font-size: 2em;
    margin-bottom: 0.5em;
    color: var(--obsidian-text-primary);
  }
  
  p {
    font-size: 1.1em;
    color: var(--obsidian-text-secondary);
    margin-bottom: 2em;
  }
}

.welcome-tips {
  text-align: left;
  background: var(--obsidian-bg-secondary);
  border-radius: 8px;
  padding: 20px;
  
  h3 {
    font-size: 1.2em;
    margin-bottom: 1em;
    color: var(--obsidian-text-primary);
  }
  
  ul {
    list-style: none;
    padding: 0;
    
    li {
      padding: 8px 0;
      color: var(--obsidian-text-secondary);
    }
    
    kbd {
      background: var(--obsidian-bg-primary);
      border: 1px solid var(--obsidian-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-family: monospace;
      font-size: 0.9em;
    }
  }
}
</style>
