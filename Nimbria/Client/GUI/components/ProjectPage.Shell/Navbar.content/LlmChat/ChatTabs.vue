<template>
  <div class="chat-tabs">
    <!-- 多行标签容器 -->
    <div class="tabs-container">
      <div class="tabs-wrapper">
        <!-- 对话标签 -->
        <div
          v-for="tab in tabManager.tabs"
          :key="tab.id"
          class="tab-item"
          :class="{ active: tab.isActive, dirty: tab.isDirty }"
          @click="handleTabClick(tab.id)"
          @dblclick="handleTabEdit(tab.id)"
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useLlmChatStore } from '@/stores/llmChat/llmChatStore'
import { useChatTabManager } from '@/stores/llmChat/chatTabManager'
import ChatHistoryDialog from './ChatHistoryDialog.vue'

const $q = useQuasar()
const llmChatStore = useLlmChatStore()
const tabManager = useChatTabManager()

// 历史记录对话框
const showHistoryDialog = ref(false)

// 编辑状态
const editingTabId = ref<string | null>(null)
const editingTitle = ref('')

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

const handleTitleSave = async (tab: any) => {
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
      cancel: true,
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
    cancel: true,
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
  overflow-x: auto;
  overflow-y: hidden;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--q-border-color);
    border-radius: 2px;
  }
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 80px;
  max-width: 150px;
  height: 32px;
  padding: 0 8px;
  background: var(--q-secondary);
  border: 1px solid var(--q-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    background: var(--q-hover-background);
    border-color: var(--q-primary);
    
    .close-icon {
      opacity: 1;
    }
  }
  
  &.active {
    background: var(--q-primary);
    border-color: var(--q-primary);
    color: white;
  }
  
  &.dirty {
    border-color: var(--q-warning);
  }
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.tab-input {
  flex: 1;
  font-size: 12px;
}

.dirty-indicator {
  flex-shrink: 0;
  color: var(--q-warning);
}

.close-icon {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s;
  
  &:hover {
    color: var(--q-negative);
  }
}

.active .close-icon {
  opacity: 0.7;
  
  &:hover {
    opacity: 1;
  }
}

.toolbox-button {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
