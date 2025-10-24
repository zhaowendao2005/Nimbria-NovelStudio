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
        <!-- 根据标签页类型渲染不同组件 -->
        <MarkdownTab
          v-if="localActiveTabId && activeTabType === 'markdown'"
          :tab-id="localActiveTabId"
        />
        <DocParserPanel
          v-else-if="localActiveTabId && activeTabType === 'docparser'"
        />
        <StarChart
          v-else-if="localActiveTabId && activeTabType === 'starchart'"
          :tab-id="localActiveTabId"
        />
        <SearchAndScraperPanel
          v-else-if="localActiveTabId && activeTabType === 'search-and-scraper'"
          :tab-id="localActiveTabId"
        />
        
        <!-- 动态渲染自定义页面 -->
        <component 
          v-else-if="localActiveTabId && customPageComponent"
          :is="customPageComponent"
          :instance-id="customPageInstanceId"
          :tab-id="localActiveTabId"
        />
      </div>
    </div>
    
    <!-- 空面板 -->
    <div v-else class="empty-pane-container">
      <!-- 🔥 空面板工具栏 -->
      <div class="empty-pane-toolbar">
        <div class="empty-pane-toolbar__info">
          <q-icon name="view_column" size="16px" />
          <span>空面板</span>
        </div>
        
        <div class="empty-pane-toolbar__actions">
          <q-btn
            flat
            dense
            round
            size="sm"
            icon="close"
            @click="handleClosePane"
            class="empty-pane-toolbar__close-btn"
          >
            <q-tooltip>关闭此面板</q-tooltip>
          </q-btn>
        </div>
      </div>
      
      <!-- 空面板提示 -->
      <div class="empty-pane">
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
import { ref, computed, watch, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import type { PaneContextMenuItem, SplitAction } from '@stores/projectPage/paneLayout/types'
import { CustomPageAPI } from '../../../../Service/CustomPageManager'
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'
import { DocParserPanel } from '@components/ProjectPage.MainPanel/DocParser'
import { StarChart } from '@components/ProjectPage.MainPanel/StarChart'
import { SearchAndScraperPanel } from '@components/ProjectPage.MainPanel/SearchAndScraper'
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
 * 当前激活标签页的类型
 */
const activeTabType = computed(() => {
  if (!localActiveTabId.value) return 'markdown'
  const tab = markdownStore.openTabs.find(t => t.id === localActiveTabId.value)
  const type = tab?.type || 'markdown'
  console.log(`[PaneContent] Active tab type:`, type, 'tabId:', localActiveTabId.value)
  return type
})

/**
 * 🔥 自定义页面组件缓存（避免重复创建defineAsyncComponent）
 */
const componentCache = new Map<string, any>()

/**
 * 自定义页面组件（如果当前标签是自定义页面）
 * 🔥 使用defineAsyncComponent处理懒加载组件
 */
const customPageComponent = computed(() => {
  if (!localActiveTabId.value || !activeTabType.value) {
    console.log(`[PaneContent] No custom page (no activeTabId or activeTabType)`)
    return null
  }
  
  // 查找是否有匹配的自定义页面
  const availablePages = CustomPageAPI.getAvailablePages()
  console.log(`[PaneContent] Looking for custom page with tabType: '${activeTabType.value}'`)
  console.log(`[PaneContent] Available pages:`, availablePages.map(p => ({ id: p.id, tabType: p.tabType })))
  
  const page = availablePages.find(
    page => page.tabType === activeTabType.value
  )
  
  if (!page?.component) {
    console.log(`[PaneContent] No matching custom page found for tabType: '${activeTabType.value}'`)
    return null
  }
  
  console.log(`[PaneContent] Found matching page:`, page.id)
  
  // 🔥 使用缓存避免重复创建异步组件
  const cacheKey = page.id
  if (!componentCache.has(cacheKey)) {
    const asyncComp = defineAsyncComponent({
      loader: page.component,
      loadingComponent: () => null,
      errorComponent: () => null,
      delay: 0,
      timeout: 30000
    })
    componentCache.set(cacheKey, asyncComp)
    console.log(`[PaneContent] ✅ Created async component for page: ${page.id}`)
  }
  
  return componentCache.get(cacheKey)
})

/**
 * 自定义页面实例ID（如果存在）
 */
const customPageInstanceId = computed(() => {
  if (!localActiveTabId.value) return null
  
  const instance = CustomPageAPI.findInstanceByTabId(localActiveTabId.value)
  return instance?.id || null
})

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
 * 处理标签页移除
 * 🔥 优先检查是否为自定义页面，使用CustomPageManager统一管理
 */
const handleTabRemove = (tabId: string) => {
  console.log('[PaneContent] Removing tab:', tabId)
  
  // 🔥 检查是否是自定义页面实例
  const customPageInstance = CustomPageAPI.findInstanceByTabId(tabId)
  
  if (customPageInstance) {
    // 通过CustomPageManager关闭（会正确清理实例）
    console.log('[PaneContent] Closing custom page via CustomPageAPI:', customPageInstance.config.name)
    CustomPageAPI.close(customPageInstance.id)
  } else {
    // 普通markdown标签页，使用原有逻辑
    console.log('[PaneContent] Closing regular tab')
    // 1. 从面板中移除
    paneLayoutStore.closeTabInPane(props.paneId, tabId)
    
    // 2. 从 markdown store 中关闭
    markdownStore.closeTab(tabId)
  }
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
 * 🔥 关闭当前空面板
 * 调用 paneLayoutStore.closePane() 关闭面板
 */
const handleClosePane = () => {
  console.log('🗑️ [PaneContent] Closing empty pane:', props.paneId)
  paneLayoutStore.closePane(props.paneId)
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

/* 🔥 空面板容器 */
.empty-pane-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 🔥 空面板工具栏 */
.empty-pane-toolbar {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--obsidian-background-primary);
  border-bottom: 1px solid var(--obsidian-background-modifier-border);
  flex-shrink: 0;
  
  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--obsidian-text-muted);
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  &__close-btn {
    color: var(--obsidian-text-muted);
    transition: all 0.2s;
    
    &:hover {
      background: var(--obsidian-background-modifier-hover);
      color: var(--obsidian-text-accent);
    }
  }
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
