<template>
  <div class="draggable-tab-bar">
    <!-- 🔥 使用 VueDraggable 包裹标签头 -->
    <!-- 
      重要说明：
      1. VueDraggable 会渲染为一个 div 容器
      2. 我们通过 class="tab-headers-container" 直接样式化这个容器
      3. data-pane-id 属性用于在拖拽事件中识别源/目标面板
      4. 容器采用 flex 布局，不会影响原有布局流
    -->
    <VueDraggable
      :model-value="localTabIds"
      :group="dragGroup"
      :animation="200"
      handle=".tab-handle"
      ghost-class="tab-ghost"
      chosen-class="tab-chosen"
      drag-class="tab-drag"
      @start="handleDragStart"
      @end="handleDragEnd"
      @add="handleAdd"
      @remove="handleRemove"
      class="tab-headers-container"
      :data-pane-id="paneId"
    >
      <div
        v-for="tabId in localTabIds"
        :key="tabId"
        :class="['custom-tab-item', { 'active': tabId === activeTabId }]"
        @click="handleTabClick(tabId)"
        @contextmenu.prevent.stop="handleTabContextMenu($event, tabId)"
      >
        <!-- 拖拽手柄 -->
        <div class="tab-handle">
          <span class="tab-label">{{ getTabName(tabId) }}</span>
          <SaveStatusBadge :tab="getTab(tabId)" />
        </div>
        
        <!-- 关闭按钮 -->
        <el-icon
          class="tab-close-btn"
          @click.stop="handleTabClose(tabId)"
        >
          <Close />
        </el-icon>
      </div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Close } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import SaveStatusBadge from '@components/ProjectPage.MainPanel/AutoSave/SaveStatusBadge.vue'

interface Props {
  paneId: string
  tabIds: string[]
  activeTabId: string | null
}

interface DragEvent {
  from: HTMLElement & { dataset: { paneId: string } }
  to: HTMLElement & { dataset: { paneId: string } }
  oldIndex: number
  newIndex: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'tab-click': [tabId: string]
  'tab-close': [tabId: string]
  'tab-contextmenu': [event: MouseEvent, tabId: string]
  'tabs-reorder': [newTabIds: string[]]
}>()

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

// 本地标签页列表（用于拖拽）
const localTabIds = ref<string[]>([...props.tabIds])

// 监听外部数据变化
watch(() => props.tabIds, (newTabIds) => {
  localTabIds.value = [...newTabIds]
}, { deep: true })

// 拖拽分组配置
const dragGroup = {
  name: 'pane-tabs',  // 全局统一分组
  pull: true,
  put: true
}

// 获取标签名称
const getTabName = (tabId: string): string => {
  const tab = markdownStore.openTabs.find(t => t.id === tabId)
  return tab?.fileName || 'Untitled'
}

// 获取标签对象
const getTab = (tabId: string) => {
  return markdownStore.openTabs.find(t => t.id === tabId) || null
}

// 拖拽开始
const handleDragStart = (evt: DragEvent) => {
  console.log('[DraggableTabBar] Drag start:', evt)
  // 设置焦点到当前面板
  paneLayoutStore.setFocusedPane(props.paneId)
}

// 拖拽结束
const handleDragEnd = (evt: DragEvent) => {
  console.log('[DraggableTabBar] Drag end:', evt)
  
  const { from, to, newIndex } = evt
  const fromPaneId = from.dataset.paneId
  const toPaneId = to.dataset.paneId
  const draggedTabId = localTabIds.value[newIndex]
  
  // 跨面板拖拽
  if (fromPaneId !== toPaneId) {
    // 通过 store 处理跨面板移动
    paneLayoutStore.moveTabBetweenPanes(
      fromPaneId,
      toPaneId,
      draggedTabId,
      newIndex
    )
  } else {
    // 同面板内重新排序
    paneLayoutStore.reorderTabsInPane(
      props.paneId,
      localTabIds.value
    )
  }
}

// 标签被添加到当前面板
const handleAdd = (evt: DragEvent) => {
  console.log('[DraggableTabBar] Tab added:', evt)
}

// 标签被移除出当前面板
const handleRemove = (evt: DragEvent) => {
  console.log('[DraggableTabBar] Tab removed:', evt)
}

// 标签点击
const handleTabClick = (tabId: string) => {
  emit('tab-click', tabId)
}

// 标签关闭
const handleTabClose = (tabId: string) => {
  emit('tab-close', tabId)
}

// 标签右键菜单
const handleTabContextMenu = (event: MouseEvent, tabId: string) => {
  emit('tab-contextmenu', event, tabId)
}
</script>

<style scoped lang="scss">
.draggable-tab-bar {
  // 🔥 关键：确保标签栏容器不占据额外空间
  flex-shrink: 0;  // 不被压缩
  background: var(--obsidian-bg-secondary, #f5f6f8);
  border-bottom: 1px solid var(--obsidian-border, #e3e5e8);
}

// 🔥 VueDraggablePlus 渲染的容器
// 这个类会应用到 VueDraggablePlus 组件渲染出的 div 元素上
.tab-headers-container {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  gap: 4px;
  overflow-x: auto;
  overflow-y: hidden;
  
  // 🔥 关键：确保容器自身不影响布局
  min-height: 44px;      // 固定最小高度，避免抖动
  flex-shrink: 0;        // 不被压缩
  width: 100%;           // 占满父容器宽度
  
  // 确保拖拽时的交互层不阻挡事件
  // Sortable.js 会自动处理拖拽事件，我们只需要确保正常的点击事件能穿透
  pointer-events: auto;  // 启用鼠标事件
}

.custom-tab-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--obsidian-bg-primary, #fff);
  border: 1px solid var(--obsidian-border, #e3e5e8);
  border-radius: 6px 6px 0 0;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  
  &.active {
    background: var(--obsidian-bg-active, #e8f0fe);
    border-bottom-color: transparent;
  }
  
  &:hover {
    background: var(--obsidian-bg-hover, #f0f2f5);
  }
}

.tab-handle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: move;
}

.tab-label {
  font-size: 14px;
  color: var(--obsidian-text-primary, #1f2329);
}

.tab-close-btn {
  opacity: 0.6;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
    color: var(--obsidian-danger, #ff4d4f);
  }
}

// 拖拽样式
.tab-ghost {
  opacity: 0.4;
  background: var(--obsidian-accent-light, #d6e4ff);
}

.tab-chosen {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.tab-drag {
  cursor: grabbing !important;
}
</style>

