<template>
  <div class="project-page-main-panel">
    <!-- 自动保存指示器 -->
    <AutoSaveIndicator v-if="markdownStore.openTabs.length > 0" />
    
    <!-- 🔥 分屏系统 -->
    <div class="pane-system-container">
      <PaneContainer :node="paneLayoutStore.paneTree" />
    </div>
    
    <!-- 无打开文件时的欢迎页（已由 PaneContent 处理，保留此处作为后备）-->
    <div v-if="false" class="welcome-container">
      <div class="welcome-content">
        <h1>欢迎使用 Markdown 编辑器</h1>
        <p>双击左侧文件树中的文件以打开</p>
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
import { onMounted } from 'vue'
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
