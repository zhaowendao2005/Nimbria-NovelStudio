<template>
  <div class="project-page-main-panel">
    <div class="main-panel-content">
      <!-- 自动保存指示器 -->
      <AutoSaveIndicator v-if="markdownStore.openTabs.length > 0" />
    
    <!-- 标签页系统 -->
    <el-tabs
      v-if="markdownStore.openTabs.length > 0"
      v-model="markdownStore.activeTabId"
      type="card"
      closable
      class="markdown-tabs"
      @tab-remove="handleTabRemove"
      @tab-click="handleTabClick"
    >
      <el-tab-pane
        v-for="tab in markdownStore.openTabs"
        :key="tab.id"
        :name="tab.id"
      >
        <template #label>
          <span class="tab-label">
            {{ tab.fileName }}
            <SaveStatusBadge :tab="tab" />
          </span>
        </template>
        <MarkdownTab :tab-id="tab.id" />
      </el-tab-pane>
    </el-tabs>
    
    <!-- 无打开文件时的欢迎页 -->
    <div v-else class="welcome-container">
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
    
    <!-- 右侧栏 -->
    <RightSidebar v-if="rightSidebarStore.visible && rightSidebarStore.hasPanels" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'
import AutoSaveIndicator from '@components/ProjectPage.MainPanel/AutoSave/AutoSaveIndicator.vue'
import SaveStatusBadge from '@components/ProjectPage.MainPanel/AutoSave/SaveStatusBadge.vue'
import RightSidebar from '@components/ProjectPage.Shell/RightSidebar/RightSidebar.vue'
import { useMarkdownStore } from '@stores/projectPage'
import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'

/**
 * ProjectPage.MainPanel
 * 中栏主面板容器 + 右侧栏
 * 职责：管理Markdown标签页系统 + 右侧栏显示
 */

const rightSidebarStore = useRightSidebarStore()

const markdownStore = useMarkdownStore()

// 初始化文件树
onMounted(async () => {
  // 项目路径会自动从当前项目窗口获取
  await markdownStore.initializeFileTree()
})

// 处理标签页移除
const handleTabRemove = (tabId: string | number) => {
  markdownStore.closeTab(String(tabId))
}

// 处理标签页点击
const handleTabClick = () => {
  // 可以添加额外的点击处理逻辑
}
</script>

<style scoped lang="scss">
@import './ProjectPage.MainPanel.scss';

/* 布局样式 */
.project-page-main-panel {
  height: 100%;
  display: flex;
  flex-direction: row;
  overflow: hidden;

  .main-panel-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
}

/* 标签页容器 */
.markdown-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0; /* 🔑 关键！ */
  
  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
    background: var(--obsidian-bg-secondary, #f5f6f8);
    flex-shrink: 0;
  }
  
  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0 !important; /* 🔑 必须!important覆盖Element Plus */
    overflow: hidden;
  }
  
  :deep(.el-tab-pane) {
    height: 100%;
    overflow: hidden;
    min-height: 0; /* 🔑 关键！ */
  }
}

/* 标签页标题（带保存状态） */
.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
