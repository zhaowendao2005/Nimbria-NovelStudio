<template>
  <div class="markdown-tab">
    <!-- Header: 面包屑 + 模式切换 -->
    <div 
      class="tab-header"
      @contextmenu.prevent="handleContextMenu"
    >
      <div class="header-left">
        <!-- 前进后退按钮 -->
        <el-button class="nav-btn" link :disabled="!canGoBack" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>
        <el-button class="nav-btn" link :disabled="!canGoForward" @click="goForward">
          <el-icon><ArrowRight /></el-icon>
        </el-button>

        <!-- 面包屑路径 -->
        <el-breadcrumb separator="/" class="breadcrumb">
          <el-breadcrumb-item 
            v-for="(item, index) in breadcrumbPath" 
            :key="index"
            :to="index === breadcrumbPath.length - 1 ? undefined : item.path"
          >
            <el-icon v-if="index === 0"><Folder /></el-icon>
            {{ item.name }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <div class="header-right" v-if="currentTab">
        <!-- 模式切换 -->
        <el-button-group>
          <el-tooltip content="编辑模式" placement="bottom">
            <el-button 
              :type="currentTab.mode === 'edit' ? 'primary' : ''"
              @click="switchMode('edit')"
            >
              <el-icon><Edit /></el-icon>
            </el-button>
          </el-tooltip>
          <el-tooltip content="阅览模式" placement="bottom">
            <el-button 
              :type="currentTab.mode === 'view' ? 'primary' : ''"
              @click="switchMode('view')"
            >
              <el-icon><View /></el-icon>
            </el-button>
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <!-- Main: 编辑器或查看器 -->
    <div class="tab-main" v-if="currentTab">
      <MarkdownEditor
        v-if="currentTab.mode === 'edit'"
        v-model="currentTab.content"
        @change="handleContentChange"
        @save="handleSave"
      />
      <MarkdownViewer
        v-else
        :content="currentTab.content"
      />
    </div>
    <div v-else class="tab-empty">
      <el-empty description="标签页未找到" />
    </div>
    
    <!-- 右键菜单 -->
    <ContextMenu
      v-model:visible="contextMenuVisible"
      :x="contextMenuX"
      :y="contextMenuY"
      :items="contextMenuItems"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Folder, Edit, View } from '@element-plus/icons-vue'
import MarkdownEditor from './MarkdownEditor.vue'
import MarkdownViewer from './MarkdownViewer.vue'
import ContextMenu from '@components/ProjectPage.MainPanel/PaneSystem/ContextMenu.vue'
import { useMarkdownStore } from '@stores/projectPage'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { PaneContextMenuItem, SplitAction } from '@stores/projectPage/paneLayout/types'

interface Props {
  tabId: string
  paneId?: string  // 🔥 新增：面板 ID
}

const props = defineProps<Props>()

// 使用Pinia Store
const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

// 当前标签页数据
const currentTab = computed(() => {
  return markdownStore.openTabs.find(tab => tab.id === props.tabId)
})

// 面包屑路径
const breadcrumbPath = computed(() => {
  if (!currentTab.value) return []
  
  const parts = currentTab.value.filePath.split('/')
  return parts.map((name, index) => ({
    name: name || '根目录',
    path: parts.slice(0, index + 1).join('/')
  }))
})

// 前进后退控制
const canGoBack = computed(() => markdownStore.canGoBack)
const canGoForward = computed(() => markdownStore.canGoForward)

const goBack = () => {
  markdownStore.goBack()
}

const goForward = () => {
  markdownStore.goForward()
}

// 切换模式
const switchMode = (newMode: 'edit' | 'view') => {
  if (currentTab.value) {
    markdownStore.switchTabMode(props.tabId, newMode)
  }
}

// 内容变化处理
const handleContentChange = (newContent: string) => {
  markdownStore.updateTabContent(props.tabId, newContent)
}

// 手动保存（Ctrl+S触发）
const handleSave = () => {
  void markdownStore.saveTab(props.tabId)
}

// ==================== 右键菜单 ====================

// 右键菜单状态
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

// 菜单项配置
const contextMenuItems: PaneContextMenuItem[] = [
  {
    action: 'split-right-move',
    label: '向右拆分（转移）',
    icon: 'arrow-right'
  },
  {
    action: 'split-right-copy',
    label: '向右拆分（复制）',
    icon: 'copy-document'
  },
  {
    action: 'split-down-move',
    label: '向下拆分（转移）',
    icon: 'arrow-down',
    divider: true
  },
  {
    action: 'split-down-copy',
    label: '向下拆分（复制）',
    icon: 'copy-document'
  }
]

/**
 * 处理右键菜单
 */
const handleContextMenu = (event: MouseEvent) => {
  // 只有当有打开的标签页且有 paneId 时才显示菜单
  if (!currentTab.value || !props.paneId) return
  
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

/**
 * 处理菜单选择
 */
const handleMenuSelect = (action: SplitAction) => {
  if (!currentTab.value || !props.paneId) return
  
  console.log('[MarkdownTab] Menu action:', action)
  
  // 执行分屏操作
  paneLayoutStore.executeSplitAction(
    props.paneId,
    action,
    currentTab.value.id
  )
  
  contextMenuVisible.value = false
}

// 暴露方法
defineExpose({
  getContent: () => currentTab.value?.content || '',
  save: () => markdownStore.saveTab(props.tabId),
  switchToEditMode: () => switchMode('edit'),
  switchToViewMode: () => switchMode('view')
})
</script>

<style scoped>
.markdown-tab {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--obsidian-bg-primary, #ffffff);
  overflow: hidden;  /* 🔑 禁止滚动 */
  min-height: 0;     /* 🔑 关键！允许flex压缩 */
}

/* Header样式 */
.tab-header {
  height: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: var(--obsidian-bg-secondary, #f5f6f8);
  border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 导航按钮 */
.nav-btn {
  width: 32px !important;
  height: 32px !important;
  min-width: 32px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 4px !important;
  color: var(--obsidian-text-secondary, #6a6d74) !important;
}

.nav-btn:hover:not(:disabled) {
  background-color: var(--obsidian-hover-bg, #e9e9e9) !important;
  color: var(--obsidian-text-primary, #2e3338) !important;
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 面包屑样式 */
.breadcrumb {
  flex: 1;
  min-width: 0;
  font-size: 13px;
}

:deep(.el-breadcrumb__item) {
  display: inline-flex;
  align-items: center;
}

:deep(.el-breadcrumb__inner) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--obsidian-text-secondary, #6a6d74);
  font-weight: 400;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--obsidian-text-primary, #2e3338);
  font-weight: 500;
}

:deep(.el-breadcrumb__inner:hover) {
  color: var(--obsidian-accent, #5b7fff);
}

/* 模式切换按钮组 */
:deep(.el-button-group) {
  display: flex;
  gap: 0;
}

:deep(.el-button-group .el-button) {
  width: 36px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
}

:deep(.el-button-group .el-button:first-child) {
  border-top-left-radius: 4px;
  border-bottom-left-radius: 4px;
}

:deep(.el-button-group .el-button:last-child) {
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

/* Main内容区域 */
.tab-main {
  flex: 1;
  min-height: 0;      /* 🔑 关键！允许flex压缩 */
  overflow: hidden;   /* 🔑 禁止滚动 */
}

.tab-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--obsidian-bg-primary, #ffffff);
}
</style>
