<template>
  <div class="chat-tabs">
    <!-- 多行标签容器 -->
    <div class="tabs-container" :style="{ maxHeight: maxHeight }">
      <div class="tabs-wrapper">
        <!-- 对话标签 -->
        <div
          v-for="conversation in displayConversations"
          :key="conversation.id"
          class="tab-item"
          :class="{ active: conversation.id === activeConversationId }"
          @click="handleTabClick(conversation.id)"
          @dblclick="handleTabEdit(conversation.id)"
        >
          <!-- 固定图标 -->
          <el-icon v-if="conversation.isPinned" class="pin-icon">
            <component :is="'Unlock'" />
          </el-icon>
          
          <!-- 标签标题 -->
          <span v-if="editingTabId !== conversation.id" class="tab-title">
            {{ conversation.title }}
          </span>
          <el-input
            v-else
            v-model="editingTitle"
            size="small"
            class="tab-input"
            @blur="handleTitleSave(conversation.id)"
            @keyup.enter="handleTitleSave(conversation.id)"
            @click.stop
          />
          
          <!-- 关闭按钮 -->
          <el-icon class="close-icon" @click.stop="handleTabClose(conversation.id)">
            <component :is="'Close'" />
          </el-icon>
        </div>
      </div>
      
      <!-- 工具箱按钮 -->
      <div class="toolbox-button">
        <el-dropdown trigger="click" @command="handleToolboxCommand">
          <el-button :icon="Setting" circle size="small" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="new">
                <el-icon><component :is="'Plus'" /></el-icon>
                创建新对话
              </el-dropdown-item>
              <el-dropdown-item command="history">
                <el-icon><component :is="'Clock'" /></el-icon>
                历史记录
              </el-dropdown-item>
              <el-dropdown-item command="export">
                <el-icon><component :is="'Download'" /></el-icon>
                导出对话
              </el-dropdown-item>
              <el-dropdown-item command="clear" divided>
                <el-icon><component :is="'Delete'" /></el-icon>
                清空当前对话
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <!-- 更多按钮（当行数超过限制时显示） -->
    <div v-if="hasMore" class="more-indicator">
      <el-button text size="small" @click="showAllTabs">
        <el-icon><component :is="'ArrowDown'" /></el-icon>
        更多 ({{ hiddenCount }})
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useChatStore } from '@stores/chat/chatStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'

const chatStore = useChatStore()

// 最大显示行数
const maxLines = ref(3)
// 每行最多显示的标签数（根据宽度动态计算）
const itemsPerLine = ref(4)

// 编辑状态
const editingTabId = ref<string | null>(null)
const editingTitle = ref('')

// 计算属性
const activeConversationId = computed(() => chatStore.activeConversationId)

const allConversations = computed(() => chatStore.activeConversations)

const maxDisplayCount = computed(() => maxLines.value * itemsPerLine.value)

const displayConversations = computed(() => {
  const conversations = allConversations.value
  
  // 优先显示固定的对话
  const pinned = conversations.filter(c => c.isPinned)
  const unpinned = conversations.filter(c => !c.isPinned)
  
  const sorted = [...pinned, ...unpinned]
  return sorted.slice(0, maxDisplayCount.value)
})

const hasMore = computed(() => allConversations.value.length > maxDisplayCount.value)

const hiddenCount = computed(() => Math.max(0, allConversations.value.length - maxDisplayCount.value))

const maxHeight = computed(() => `${maxLines.value * 40}px`)

// 方法
const handleTabClick = (id: string) => {
  chatStore.setActiveConversation(id)
}

const handleTabEdit = (id: string) => {
  const conversation = allConversations.value.find(c => c.id === id)
  if (conversation) {
    editingTabId.value = id
    editingTitle.value = conversation.title
  }
}

const handleTitleSave = (id: string) => {
  if (editingTitle.value.trim()) {
    chatStore.updateConversationTitle(id, editingTitle.value.trim())
  }
  editingTabId.value = null
  editingTitle.value = ''
}

const handleTabClose = async (id: string) => {
  const conversation = allConversations.value.find(c => c.id === id)
  if (!conversation) return
  
  // 如果对话有消息，弹出确认框
  if (conversation.messages.length > 0) {
    try {
      await ElMessageBox.confirm(
        '确定要关闭这个对话吗？所有消息将被删除。',
        '确认关闭',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      chatStore.deleteConversation(id)
      ElMessage.success('对话已关闭')
    } catch {
      // 用户取消
    }
  } else {
    chatStore.deleteConversation(id)
  }
}

const handleToolboxCommand = (command: string) => {
  switch (command) {
    case 'new':
      chatStore.createConversation()
      ElMessage.success('已创建新对话')
      break
    case 'history':
      // TODO: 显示历史记录对话框
      ElMessage.info('历史记录功能开发中')
      break
    case 'export':
      // TODO: 导出对话
      ElMessage.info('导出功能开发中')
      break
    case 'clear':
      handleClearConversation()
      break
  }
}

const handleClearConversation = async () => {
  const conversation = chatStore.activeConversation
  if (!conversation) return
  
  try {
    await ElMessageBox.confirm(
      '确定要清空当前对话的所有消息吗？',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    conversation.messages = []
    conversation.updatedAt = new Date()
    chatStore.saveToLocalStorage()
    ElMessage.success('对话已清空')
  } catch {
    // 用户取消
  }
}

const showAllTabs = () => {
  // TODO: 显示所有对话的对话框
  ElMessage.info('功能开发中')
}

// 监听窗口大小变化，动态计算每行可显示的标签数
const updateItemsPerLine = () => {
  const containerWidth = 280 // 左侧栏最小宽度
  const itemWidth = 120 // 标签最大宽度
  itemsPerLine.value = Math.max(2, Math.floor(containerWidth / itemWidth))
}

// 初始化时创建一个默认对话
watch(() => allConversations.value.length, (length) => {
  if (length === 0 && !chatStore.activeConversationId) {
    chatStore.createConversation()
  }
}, { immediate: true })

// 初始化
updateItemsPerLine()
</script>

<style scoped lang="scss">
.chat-tabs {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
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
    background: var(--el-border-color-darker);
    border-radius: 2px;
  }
}

.tabs-wrapper {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 80px;
  max-width: 120px;
  height: 32px;
  padding: 0 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: var(--el-fill-color);
    border-color: var(--el-color-primary);
    
    .close-icon {
      opacity: 1;
    }
  }
  
  &.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
  }
}

.pin-icon {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-color-warning);
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
  
  :deep(.el-input__wrapper) {
    padding: 0 4px;
    box-shadow: none;
  }
}

.close-icon {
  flex-shrink: 0;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.2s;
  
  &:hover {
    color: var(--el-color-danger);
  }
}

.toolbox-button {
  flex-shrink: 0;
  margin-left: 8px;
}

.more-indicator {
  padding: 0 8px 8px;
  text-align: center;
  
  .el-button {
    width: 100%;
  }
}
</style>

