<template>
  <div class="chat-tabs">
    <!-- 多行标签容器 -->
    <div class="tabs-container">
      <div class="tabs-wrapper">
        <!-- 对话标签 -->
        <div
          v-for="tab in tabManager.visibleTabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: tab.isActive, dirty: tab.isDirty }"
          @click="handleTabClick(tab.id)"
          @dblclick="handleTabEdit(tab.id)"
          @contextmenu.prevent="handleTabRightClick($event, tab)"
        >
          <!-- 标签标题 -->
          <span v-if="editingTabId !== tab.id" class="tab-title">
            {{ tab.title }}
          </span>
          <q-input
            v-else
            v-model="editingTitle"
            dense
            borderless
            class="tab-input"
            @blur="handleTitleSave(tab)"
            @keyup.enter="handleTitleSave(tab)"
            @click.stop
          />
          
          <!-- 未保存指示器 -->
          <q-icon v-if="tab.isDirty" name="fiber_manual_record" size="8px" class="dirty-indicator" />
          
          <!-- 关闭按钮 -->
          <q-btn
            flat
            dense
            round
            size="xs"
            icon="close"
            class="close-icon"
            @click.stop="handleTabClose(tab.id)"
          />
        </div>
      </div>
      
      <!-- 标签页数量指示器 -->
      <div v-if="tabManager.hasMoreTabs" class="tabs-indicator">
        {{ tabManager.visibleTabs.length }}/{{ tabManager.totalTabsCount }}
      </div>
      
      <!-- 工具箱按钮 -->
      <div class="toolbox-button">
        <q-btn round dense icon="more_vert" size="sm">
          <q-menu>
            <q-list style="min-width: 180px">
              <q-item clickable v-close-popup @click="handleCreateNewConversation">
                <q-item-section avatar>
                  <q-icon name="add" />
                </q-item-section>
                <q-item-section>创建新对话</q-item-section>
              </q-item>
              
              <q-item clickable v-close-popup @click="handleShowHistory">
                <q-item-section avatar>
                  <q-icon name="history" />
                </q-item-section>
                <q-item-section>历史记录</q-item-section>
              </q-item>
              
              <q-item clickable v-close-popup @click="handleExportConversation">
                <q-item-section avatar>
                  <q-icon name="download" />
                </q-item-section>
                <q-item-section>导出对话</q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item clickable v-close-popup @click="handleCloseAllTabs">
                <q-item-section avatar>
                  <q-icon name="close" color="negative" />
                </q-item-section>
                <q-item-section>关闭所有标签</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>
  </div>

  <!-- 历史记录对话框 -->
  <ChatHistoryDialog v-model="showHistoryDialog" />
  
  <!-- 右键菜单 -->
  <q-menu
    v-model="showContextMenu"
    :target="false"
    :offset="[contextMenuPosition.x, contextMenuPosition.y]"
    context-menu
  >
    <q-list style="min-width: 150px">
      <q-item clickable v-close-popup @click="handleRename">
        <q-item-section avatar>
          <q-icon name="edit" />
        </q-item-section>
        <q-item-section>重命名</q-item-section>
      </q-item>
      
      <q-separator />
      
      <q-item clickable v-close-popup @click="handleCloseTab">
        <q-item-section avatar>
          <q-icon name="close" />
        </q-item-section>
        <q-item-section>关闭标签页</q-item-section>
      </q-item>
      
      <q-item 
        clickable 
        v-close-popup 
        @click="handleCloseOthers"
        :disable="tabManager.totalTabsCount <= 1"
      >
        <q-item-section avatar>
          <q-icon name="clear_all" />
        </q-item-section>
        <q-item-section>关闭其他标签页</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import { useChatTabManager, type ChatTab } from '@stores/llmChat/chatTabManager'
import ChatHistoryDialog from './ChatHistoryDialog.vue'

const $q = useQuasar()
const llmChatStore = useLlmChatStore()
const tabManager = useChatTabManager()

// 历史记录对话框
const showHistoryDialog = ref(false)

// 编辑状态
const editingTabId = ref<string | null>(null)
const editingTitle = ref('')

// 右键菜单状态
const contextMenuTab = ref<ChatTab | null>(null)
const showContextMenu = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })

// 方法
const handleTabClick = (tabId: string) => {
  tabManager.setActiveTab(tabId)
}

const handleTabEdit = (tabId: string) => {
  const tab = tabManager.tabs.find(t => t.id === tabId)
  if (tab) {
    editingTabId.value = tabId
    editingTitle.value = tab.title
  }
}

// 右键菜单处理
const handleTabRightClick = (event: MouseEvent, tab: ChatTab) => {
  contextMenuTab.value = tab
  contextMenuPosition.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

const handleRename = () => {
  if (contextMenuTab.value) {
    handleTabEdit(contextMenuTab.value.id)
  }
  showContextMenu.value = false
}

const handleCloseTab = () => {
  if (contextMenuTab.value) {
    handleTabClose(contextMenuTab.value.id)
  }
  showContextMenu.value = false
}

const handleCloseOthers = () => {
  if (contextMenuTab.value) {
    const keepTabId = contextMenuTab.value.id
    const tabsToClose = tabManager.tabs.filter(tab => tab.id !== keepTabId)
    
    $q.dialog({
      title: '确认操作',
      message: `确定要关闭其他 ${tabsToClose.length} 个标签页吗？`,
      cancel: true,
      persistent: true
    }).onOk(() => {
      tabsToClose.forEach(tab => {
        tabManager.closeTab(tab.id)
      })
      $q.notify({
        type: 'positive',
        message: `已关闭 ${tabsToClose.length} 个标签页`,
        position: 'top'
      })
    })
  }
  showContextMenu.value = false
}

const handleTitleSave = async (tab: ChatTab) => {
  if (editingTitle.value.trim() && editingTitle.value !== tab.title) {
    try {
      // 更新对话标题
      await llmChatStore.updateConversationTitle(tab.conversationId, editingTitle.value.trim())
      
      // 更新标签页标题
      tabManager.updateTabTitle(tab.id, editingTitle.value.trim())
      
      $q.notify({
        type: 'positive',
        message: '标题已更新',
        position: 'top'
      })
    } catch (error) {
      console.error('更新标题失败:', error)
      $q.notify({
        type: 'negative',
        message: '更新失败，请重试',
        position: 'top'
      })
    }
  }
  
  editingTabId.value = null
  editingTitle.value = ''
}

const handleTabClose = (tabId: string) => {
  const tab = tabManager.tabs.find(t => t.id === tabId)
  if (!tab) return
  
  // 尝试关闭标签页（如果有未保存内容会返回 false）
  const closed = tabManager.closeTab(tabId)
  
  if (!closed && tab.isDirty) {
    // 显示确认对话框
    $q.dialog({
      title: '未保存的内容',
      message: '此标签页有未保存的内容，确定要关闭吗？',
      persistent: true,
      ok: {
        label: '关闭',
        color: 'negative'
      },
      cancel: {
        label: '取消',
        flat: true
      }
    }).onOk(() => {
      tabManager.forceCloseTab(tabId)
    })
  }
}

const handleCreateNewConversation = async () => {
  try {
    const conversationId = await llmChatStore.createConversation()
    
    if (conversationId) {
      // 通过标签页管理器打开新对话
      tabManager.openConversation(conversationId, '新对话')
      
      $q.notify({
        type: 'positive',
        message: '已创建新对话',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('创建对话失败:', error)
    $q.notify({
      type: 'negative',
      message: '创建失败，请重试',
      position: 'top'
    })
  }
}

const handleShowHistory = () => {
  showHistoryDialog.value = true
}

const handleExportConversation = () => {
  const activeConversation = llmChatStore.activeConversation
  
  if (!activeConversation) {
    $q.notify({
      type: 'warning',
      message: '请先选择一个对话',
      position: 'top'
    })
    return
  }
  
  try {
    // 导出对话为 JSON
    const data = JSON.stringify(activeConversation, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `conversation-${activeConversation.id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    $q.notify({
      type: 'positive',
      message: '对话已导出',
      position: 'top'
    })
  } catch (error) {
    console.error('导出失败:', error)
    $q.notify({
      type: 'negative',
      message: '导出失败，请重试',
      position: 'top'
    })
  }
}

const handleCloseAllTabs = () => {
  $q.dialog({
    title: '关闭所有标签',
    message: '确定要关闭所有标签页吗？对话数据不会丢失。',
    persistent: true,
    ok: {
      label: '关闭',
      color: 'negative'
    },
    cancel: {
      label: '取消',
      flat: true
    }
  }).onOk(() => {
    tabManager.closeAllTabs()
    $q.notify({
      type: 'positive',
      message: '所有标签页已关闭',
      position: 'top'
    })
  })
}
</script>

<style scoped lang="scss">
.chat-tabs {
  display: flex;
  flex-direction: column;
  background: var(--q-background);
  border-bottom: 1px solid var(--q-border-color);
}

.tabs-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--q-border-color);
    border-radius: 2px;
  }
}

.tabs-wrapper {
  flex: 1;
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
  min-width: 0;
  overflow-x: scroll; /* 强制显示水平滚动条 */
  overflow-y: hidden;
  scroll-behavior: smooth; /* 平滑滚动 */
  
  &::-webkit-scrollbar {
    height: 6px; /* 稍微增加滚动条高度 */
  }
  
  &::-webkit-scrollbar-track {
    background: var(--q-background);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--q-border-color);
    border-radius: 3px;
    
    &:hover {
      background: var(--q-primary);
    }
  }
}

.tab-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
  max-width: 200px;
  height: 30px;
  padding: 0 12px;
  flex-shrink: 0;
  background: rgba(128, 128, 128, 0.1); /* 浅灰色半透明填充 */
  border: 1px solid rgba(100, 149, 237, 0.3); /* 淡蓝色边框 */
  border-radius: 15px; /* 圆角 */
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  backdrop-filter: blur(2px);
  
  &:hover {
    background: rgba(128, 128, 128, 0.15);
    border-color: rgba(100, 149, 237, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(100, 149, 237, 0.2);
    
    .close-icon {
      opacity: 0.8;
    }
  }
  
  &.active {
    background: rgba(100, 149, 237, 0.15);
    border-color: rgba(100, 149, 237, 0.6);
    color: #4169E1;
    box-shadow: 0 2px 12px rgba(100, 149, 237, 0.3);
    
    .close-icon {
      opacity: 0.9;
    }
  }
  
  &.dirty {
    border-color: rgba(255, 193, 7, 0.5);
    
    &::after {
      content: '';
      position: absolute;
      top: 4px;
      right: 4px;
      width: 6px;
      height: 6px;
      background: #FFC107;
      border-radius: 50%;
    }
  }
}

.tab-title {
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
  margin-right: 4px;
  min-width: 0;
  max-width: 150px;
}

.tab-input {
  flex: 1 1 auto;
  font-size: 13px;
  font-weight: 500;
  background: transparent;
  border: none;
  outline: none;
  color: inherit;
  margin-right: 4px;
  min-width: 60px;
  
  &::placeholder {
    color: rgba(128, 128, 128, 0.6);
  }
}

.dirty-indicator {
  flex-shrink: 0;
  color: var(--q-warning);
}

.close-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  border-radius: 50%;
  margin-left: 2px;
  
  &:hover {
    background: rgba(255, 69, 58, 0.15);
    color: #FF453A;
    opacity: 1 !important;
    transform: scale(1.1);
  }
  
  svg {
    width: 12px;
    height: 12px;
  }
}

.active .close-icon {
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
}

.tabs-indicator {
  flex-shrink: 0;
  padding: 4px 10px;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 500;
  color: rgba(100, 149, 237, 0.8);
  background: rgba(100, 149, 237, 0.08);
  border: 1px solid rgba(100, 149, 237, 0.2);
  border-radius: 12px;
  white-space: nowrap;
  backdrop-filter: blur(2px);
}

.toolbox-button {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
