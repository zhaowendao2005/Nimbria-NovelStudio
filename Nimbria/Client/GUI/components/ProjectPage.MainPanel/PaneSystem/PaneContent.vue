<template>
  <div 
    class="pane-content"
    :class="{ 'is-focused': isFocused }"
    @click="handleClick"
  >
    <!-- 焦点指示器 -->
    <div v-if="isFocused" class="focus-indicator"></div>
    
    <!-- 🔥 标签页系统 -->
    <el-tabs
      v-if="paneTabIds.length > 0"
      v-model="localActiveTabId"
      type="card"
      closable
      class="pane-tabs"
      @tab-remove="handleTabRemove"
      @tab-click="handleTabClick"
    >
      <el-tab-pane
        v-for="tid in paneTabIds"
        :key="tid"
        :name="tid"
      >
        <template #label>
          <!-- 🔥 右键菜单应该在标签上触发 -->
          <div 
            class="tab-label-wrapper"
            @contextmenu.prevent.stop="handleContextMenu($event, tid)"
          >
            <span class="tab-label">
              {{ getTabName(tid) }}
              <SaveStatusBadge :tab="getTab(tid)" />
            </span>
          </div>
        </template>
        <MarkdownTab :tab-id="tid" />
      </el-tab-pane>
    </el-tabs>
    
    <!-- 空面板提示 -->
    <div v-else class="empty-pane">
      <el-empty 
        description="点击左侧文件树打开文件"
        :image-size="120"
      >
        <template #image>
          <el-icon :size="80" color="var(--obsidian-text-muted)">
            <Document />
          </el-icon>
        </template>
      </el-empty>
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
import { ref, computed, watch } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { PaneContextMenuItem, SplitAction } from '@stores/projectPage/paneLayout/types'
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'
import SaveStatusBadge from '@components/ProjectPage.MainPanel/AutoSave/SaveStatusBadge.vue'
import ContextMenu from './ContextMenu.vue'

/**
 * PaneContent
 * 叶子面板组件，包含完整的标签页系统
 * 
 * 功能：
 * - 显示焦点指示器
 * - 渲染多个 MarkdownTab
 * - 标签页切换
 * - 右键菜单（在标签上触发）
 * - 处理焦点切换
 */

interface Props {
  paneId: string
  isFocused?: boolean
}

const props = defineProps<Props>()

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

/**
 * 该面板的所有标签页 ID
 */
const paneTabIds = computed(() => {
  return paneLayoutStore.getTabIdsByPane(props.paneId)
})

/**
 * 本地激活的标签页 ID
 */
const localActiveTabId = ref<string | null>(
  paneLayoutStore.getActiveTabIdByPane(props.paneId)
)

/**
 * 监听 store 中的激活标签变化
 */
watch(
  () => paneLayoutStore.getActiveTabIdByPane(props.paneId),
  (newActiveId) => {
    localActiveTabId.value = newActiveId
  }
)

/**
 * 监听本地激活标签变化，同步到 store
 */
watch(localActiveTabId, (newTabId) => {
  if (newTabId) {
    paneLayoutStore.switchTabInPane(props.paneId, newTabId)
  }
})

/**
 * 获取标签页名称
 */
const getTabName = (tabId: string): string => {
  const tab = markdownStore.openTabs.find(t => t.id === tabId)
  return tab?.fileName || 'Untitled'
}

/**
 * 获取标签页对象
 */
const getTab = (tabId: string) => {
  return markdownStore.openTabs.find(t => t.id === tabId) || null
}

/**
 * 处理标签页移除
 */
const handleTabRemove = (tabId: string | number) => {
  const tid = String(tabId)
  
  // 1. 从面板中移除
  paneLayoutStore.closeTabInPane(props.paneId, tid)
  
  // 2. 从 markdown store 中关闭
  markdownStore.closeTab(tid)
}

/**
 * 处理标签页点击
 */
const handleTabClick = () => {
  // 切换焦点到当前面板
  if (!props.isFocused) {
    paneLayoutStore.setFocusedPane(props.paneId)
  }
}

/**
 * 点击面板，设置焦点
 */
const handleClick = () => {
  if (!props.isFocused) {
    paneLayoutStore.setFocusedPane(props.paneId)
  }
}

// ==================== 右键菜单 ====================

const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const currentContextTabId = ref<string | null>(null)

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
const handleContextMenu = (event: MouseEvent, tabId: string) => {
  console.log('[PaneContent] Context menu on tab:', tabId)
  
  currentContextTabId.value = tabId
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

/**
 * 处理菜单选择
 */
const handleMenuSelect = (action: SplitAction) => {
  if (!currentContextTabId.value) return
  
  console.log('[PaneContent] Menu action:', { action, tabId: currentContextTabId.value })
  
  // 执行分屏操作
  paneLayoutStore.executeSplitAction(
    props.paneId,
    action,
    currentContextTabId.value
  )
  
  contextMenuVisible.value = false
  currentContextTabId.value = null
}
</script>

<style scoped>
.pane-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--obsidian-bg-primary, #ffffff);
  border: 2px solid transparent;
  transition: border-color 0.2s;
  overflow: hidden;
}

.pane-content.is-focused {
  border-color: var(--obsidian-accent, #5b7fff);
}

/* 焦点指示器 */
.focus-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--obsidian-accent, #5b7fff) 0%,
    var(--obsidian-accent-light, #7b9fff) 100%
  );
  z-index: 100;
  animation: focus-pulse 2s ease-in-out infinite;
}

@keyframes focus-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 标签页系统 */
.pane-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  
  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
    background: var(--obsidian-bg-secondary, #f5f6f8);
    flex-shrink: 0;
  }
  
  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0 !important;
    overflow: hidden;
  }
  
  :deep(.el-tab-pane) {
    height: 100%;
    overflow: hidden;
    min-height: 0;
  }
}

/* 标签标题包装器 */
.tab-label-wrapper {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 空面板样式 */
.empty-pane {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--obsidian-bg-secondary, #f5f6f8);
}

:deep(.el-empty__description) {
  color: var(--obsidian-text-secondary, #6a6d74);
  font-size: 14px;
}
</style>
