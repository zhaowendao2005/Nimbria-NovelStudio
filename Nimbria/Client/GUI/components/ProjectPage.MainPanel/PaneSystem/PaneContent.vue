<template>
  <div 
    class="pane-content"
    :class="{ 'is-focused': isFocused }"
    @click="handleClick"
  >
    <!-- 焦点指示器 -->
    <div v-if="isFocused" class="focus-indicator"></div>
    
    <!-- 🔥 使用自定义可拖拽标签栏 -->
    <!-- 
      布局说明：
      1. .pane-tabs-wrapper 是 flex 容器（flex-direction: column）
      2. DraggableTabBar 占据固定高度（flex-shrink: 0）
      3. .tab-content-area 占据剩余空间（flex: 1）
      4. 这与原 el-tabs 的布局结构完全一致
    -->
    <div v-if="paneTabIds.length > 0" class="pane-tabs-wrapper">
      <DraggableTabBar
        :pane-id="paneId"
        :tab-ids="paneTabIds"
        :active-tab-id="localActiveTabId"
        @tab-click="handleTabSwitch"
        @tab-close="handleTabRemove"
        @tab-contextmenu="handleContextMenu"
      />
      
      <!-- 标签页内容区域 -->
      <div class="tab-content-area">
        <MarkdownTab
          v-if="localActiveTabId"
          :tab-id="localActiveTabId"
        />
      </div>
    </div>
    
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { PaneContextMenuItem, SplitAction } from '@stores/projectPage/paneLayout/types'
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'
import DraggableTabBar from './DraggableTabBar.vue'
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
 * 🔥 过滤掉无效的 tabIds（防止缓存数据不一致）
 */
const paneTabIds = computed(() => {
  const allTabIds = paneLayoutStore.getTabIdsByPane(props.paneId)
  // 只保留在 markdownStore 中存在的标签页
  return allTabIds.filter(tid => 
    markdownStore.openTabs.some(tab => tab.id === tid)
  )
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
 * 🔥 监听 paneTabIds，清理 paneLayout 中的无效数据
 * 当缓存恢复导致状态不一致时，自动修复
 */
watch(paneTabIds, (validTabIds) => {
  const currentActiveTabId = paneLayoutStore.getActiveTabIdByPane(props.paneId)
  
  // 如果当前激活的标签不在有效列表中，切换到第一个有效标签
  if (currentActiveTabId && !validTabIds.includes(currentActiveTabId)) {
    const firstValidTabId = validTabIds[0]
    if (firstValidTabId) {
      paneLayoutStore.switchTabInPane(props.paneId, firstValidTabId)
      console.log('[PaneContent] Auto-switched to valid tab:', firstValidTabId)
    } else {
      console.log('[PaneContent] No valid tabs, keeping current state')
    }
  }
}, { immediate: true })

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
const handleTabRemove = (tabId: string) => {
  // 1. 从面板中移除
  paneLayoutStore.closeTabInPane(props.paneId, tabId)
  
  // 2. 从 markdown store 中关闭
  markdownStore.closeTab(tabId)
}

/**
 * 处理标签页切换
 */
const handleTabSwitch = (tabId: string) => {
  // 切换激活标签
  localActiveTabId.value = tabId
  
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
    icon: 'arrow-down'
  },
  {
    action: 'split-down-copy',
    label: '向下拆分（复制）',
    icon: 'copy-document',
    divider: true // 分组分隔线
  },
  // 🔥 窗口操作分组
  {
    action: 'detach-to-window',
    label: '拆分到新窗口',
    icon: 'full-screen'
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
const handleMenuSelect = async (action: SplitAction) => {
  if (!currentContextTabId.value) return
  
  console.log('[PaneContent] Menu action:', { action, tabId: currentContextTabId.value })
  
  // 🔥 处理拆分到新窗口
  if (action === 'detach-to-window') {
    await handleDetachToWindow(currentContextTabId.value)
    contextMenuVisible.value = false
    currentContextTabId.value = null
    return
  }
  
  // 执行分屏操作
  paneLayoutStore.executeSplitAction(
    props.paneId,
    action,
    currentContextTabId.value
  )
  
  contextMenuVisible.value = false
  currentContextTabId.value = null
}

/**
 * 🔥 拆分标签页到新窗口
 */
const handleDetachToWindow = async (tabId: string) => {
  try {
    // 1. 获取标签页数据
    const tab = markdownStore.openTabs.find(t => t.id === tabId)
    if (!tab) {
      console.error('[PaneContent] Tab not found:', tabId)
      return
    }
    
    // 2. 获取当前项目路径
    const projectPath = window.nimbria?.getCurrentProjectPath?.()
    if (!projectPath) {
      console.error('[PaneContent] No project path available')
      return
    }
    
    console.log('🚀 [PaneContent] Detaching tab to new window:', tab)
    
    // 3. 准备标签页数据（深拷贝，避免响应式对象）
    const tabData = {
      id: tab.id,
      title: tab.fileName,
      filePath: tab.filePath,
      content: tab.content || '',
      isDirty: tab.isDirty
    }
    
    // 4. 调用 Electron API 创建新窗口
    const result = await window.nimbria.project.detachTabToWindow({
      tabId: tab.id,
      tabData: tabData,
      projectPath: projectPath
    })
    
    if (result.success) {
      console.log('✅ [PaneContent] Detached window created successfully')
      // 不立即关闭标签，等待握手完成
    } else {
      console.error('❌ [PaneContent] Failed to create detached window:', result.error)
    }
  } catch (error) {
    console.error('❌ [PaneContent] Error detaching to window:', error)
  }
}

/**
 * 🔥 监听关闭源标签事件（来自分离窗口的握手）
 */
const handleCloseSourceTab = (data: { transferId: string; tabId: string }) => {
  console.log('📨 [PaneContent] Received close-source-tab event:', data)
  
  // 关闭对应的标签页
  handleTabRemove(data.tabId)
  
  console.log('✅ [PaneContent] Source tab closed:', data.tabId)
}

// 🔥 生命周期：注册事件监听
onMounted(() => {
  // 监听来自主进程的关闭源标签事件
  if (window.nimbria?.on) {
    window.nimbria.on('project:close-source-tab', handleCloseSourceTab)
    console.log('✅ [PaneContent] Event listener registered: project:close-source-tab')
  }
})

onUnmounted(() => {
  // 清理事件监听（虽然 Electron 的 ipcRenderer 没有 removeListener，但保留结构）
  console.log('👋 [PaneContent] Component unmounted')
})
</script>

<style scoped lang="scss">
.pane-content {
  /* 🔥 经典 flex 布局：占满剩余空间但不溢出 */
  flex: 1;
  flex-shrink: 0;
  min-height: 0;  /* 关键：允许在 flex 中收缩 */
  width: 100%;
  
  display: flex;
  flex-direction: column;
  
  position: relative;
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

/* 🔥 关键布局样式 - 与原 el-tabs 结构保持一致 */
.pane-tabs-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;  // 🔥 关键：允许在 flex 中收缩
}

.tab-content-area {
  flex: 1;        // 🔥 关键：占据剩余空间
  min-height: 0;  // 🔥 关键：允许在 flex 中收缩
  overflow: hidden;
}

/* 
  对比原 el-tabs 布局：
  
  原布局：
  .el-tabs (flex column)
    └── .el-tabs__header (flex-shrink: 0)
    └── .el-tabs__content (flex: 1)
  
  新布局：
  .pane-tabs-wrapper (flex column)
    └── DraggableTabBar > .draggable-tab-bar (flex-shrink: 0)
    └── .tab-content-area (flex: 1)
  
  两者完全等价！
*/

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
