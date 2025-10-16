<template>
  <div class="llm-chat-panel">
    <!-- 标签栏容器 -->
    <div class="tabs-header-wrapper">
      <!-- 使用 Element Plus Tabs -->
      <el-tabs
        v-model="llmChatStore.activeConversationId"
        type="card"
        closable
        class="chat-tabs"
        @tab-click="handleTabClick"
        @tab-remove="handleTabRemove"
      >
        <!-- 对话标签页 -->
        <el-tab-pane
          v-for="conversation in llmChatStore.conversations"
          :key="conversation.id"
          :label="conversation.title"
          :name="conversation.id"
        >
          <template #label>
            <span 
              class="tab-label"
              @dblclick.stop="handleRenameConversation(conversation)"
              @contextmenu.prevent="handleTabContextMenu($event, conversation)"
            >
              {{ conversation.title }}
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
      
      <!-- 右侧工具按钮（移到 tabs 外部） -->
      <div class="tabs-actions">
        <el-button-group>
          <!-- 新建对话按钮 -->
          <el-button
            type="primary"
            :icon="Plus"
            circle
            size="small"
            @click="handleCreateConversation"
          />
          
          <!-- 历史记录按钮 -->
          <el-button
            :icon="Clock"
            circle
            size="small"
            @click="showHistoryDialog = true"
          />
          
          <!-- 更多操作 -->
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button :icon="More" circle size="small"></el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="export">
                  <el-icon><Download /></el-icon>
                  导出当前对话
                </el-dropdown-item>
                <el-dropdown-item command="settings">
                  <el-icon><Setting /></el-icon>
                  对话设置
                </el-dropdown-item>
                <el-dropdown-item command="closeAll" divided>
                  <el-icon><Close /></el-icon>
                  关闭所有标签
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-button-group>
      </div>
    </div>

    <!-- 对话内容区域 -->
    <div class="chat-content">
      <!-- 有激活对话时显示消息 -->
      <ChatMessages v-if="llmChatStore.activeConversationId" />
      
      <!-- 无对话时的空状态 -->
      <div v-else class="empty-state">
        <el-empty description="选择或创建一个对话开始聊天">
          <el-button type="primary" :icon="Plus" @click="handleCreateConversation">
            创建新对话
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 输入区域 -->
    <ChatInput v-if="llmChatStore.activeConversationId" />

    <!-- 历史记录对话框 -->
    <ChatHistoryDialog v-model="showHistoryDialog" />

    <!-- 右键菜单 -->
    <el-dropdown
      v-model:visible="showContextMenu"
      trigger="contextmenu"
      :teleported="false"
      @command="handleContextCommand"
    >
      <span></span>
      <template #dropdown>
        <el-dropdown-menu v-if="contextMenuConversation">
          <el-dropdown-item command="rename">
            <el-icon><Edit /></el-icon>
            重命名
          </el-dropdown-item>
          <el-dropdown-item command="export">
            <el-icon><Download /></el-icon>
            导出对话
          </el-dropdown-item>
          <el-dropdown-item command="close" divided>
            <el-icon><Close /></el-icon>
            关闭标签
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, 
  Clock, 
  More, 
  Download, 
  Setting, 
  Close,
  Edit
} from '@element-plus/icons-vue'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import type { Conversation } from '../../../../../types/llmChat'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'
import ChatHistoryDialog from './ChatHistoryDialog.vue'

const llmChatStore = useLlmChatStore()

// 状态
const showHistoryDialog = ref(false)
const showContextMenu = ref(false)
const contextMenuConversation = ref<Conversation | null>(null)

// 初始化
onMounted(async () => {
  await llmChatStore.initialize()
})

// 标签页点击
const handleTabClick = (pane: { paneName: string }) => {
  // activeConversationId 已经通过 v-model 自动更新
  console.log('切换到对话:', pane.paneName)
}

// 关闭标签页
const handleTabRemove = (conversationId: string) => {
  const conversation = llmChatStore.conversations.find(c => c.id === conversationId)
  if (!conversation) return

  // 检查是否不再显示确认对话框
  const dontShowCloseConfirm = localStorage.getItem('llm-chat-dont-show-close-confirm') === 'true'
  
  const closeTab = () => {
    // 只是从显示的对话列表中移除，不删除数据库记录
    const index = llmChatStore.conversations.findIndex(c => c.id === conversationId)
    if (index !== -1) {
      llmChatStore.conversations.splice(index, 1)
    }
    
    // 如果关闭的是当前对话，切换到其他对话
    if (llmChatStore.activeConversationId === conversationId) {
      llmChatStore.activeConversationId = llmChatStore.conversations[0]?.id || null
    }
    
    ElMessage.success('已关闭标签页')
  }

  if (dontShowCloseConfirm) {
    // 直接关闭，不显示确认对话框
    closeTab()
    return
  }

  // 使用 ElMessageBox.confirm 配合 dangerouslyUseHTMLString
  const dontShowAgainCheckbox = `
    <p style="margin-bottom: 12px;">确定要关闭对话"${conversation.title}"吗？</p>
    <p style="color: var(--el-color-info); font-size: 12px; margin-bottom: 16px;">对话数据不会丢失，可以从历史记录中重新打开。</p>
    <label style="display: flex; align-items: center; cursor: pointer; user-select: none;">
      <input 
        type="checkbox" 
        id="dont-show-close-confirm"
        style="width: 16px; height: 16px; margin-right: 8px; cursor: pointer;"
      />
      <span>不再弹出此提示</span>
    </label>
  `

  ElMessageBox.confirm(dontShowAgainCheckbox, '关闭标签', {
    confirmButtonText: '关闭',
    cancelButtonText: '取消',
    type: 'warning',
    dangerouslyUseHTMLString: true,
    beforeClose: (action, instance, done) => {
      if (action === 'confirm') {
        // 检查复选框状态
        const checkbox = document.getElementById('dont-show-close-confirm') as HTMLInputElement
        if (checkbox?.checked) {
          localStorage.setItem('llm-chat-dont-show-close-confirm', 'true')
        }
      }
      done()
    }
  }).then(() => {
    closeTab()
  }).catch(() => {
    // 用户取消
  })
}

// 创建新对话
const handleCreateConversation = async () => {
  try {
    const conversationId = await llmChatStore.createConversation()
    if (conversationId) {
      ElMessage.success('新对话已创建')
    } else {
      ElMessage.warning('创建对话失败，请检查模型配置')
    }
  } catch (error: any) {
    console.error('创建对话失败:', error)
    // 显示具体的错误信息
    const errorMessage = error?.message || '创建对话失败'
    ElMessage.error(errorMessage)
  }
}

// 重命名对话
const handleRenameConversation = async (conversation: Conversation) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的对话标题', '重命名对话', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: conversation.title,
      inputPattern: /.+/,
      inputErrorMessage: '标题不能为空'
    })
    
    if (value && value.trim() !== conversation.title) {
      await llmChatStore.updateConversationTitle(conversation.id, value.trim())
      ElMessage.success('标题已更新')
    }
  } catch {
    // 用户取消
  }
}

// 右键菜单
const handleTabContextMenu = (event: MouseEvent, conversation: Conversation) => {
  event.preventDefault()
  contextMenuConversation.value = conversation
  showContextMenu.value = true
}

const handleContextCommand = async (command: string) => {
  if (!contextMenuConversation.value) return
  
  const conversation = contextMenuConversation.value
  
  switch (command) {
    case 'rename':
      await handleRenameConversation(conversation)
      break
    case 'export':
      // TODO: 实现导出功能
      ElMessage.info('导出功能开发中...')
      break
    case 'close':
      handleTabRemove(conversation.id)
      break
  }
  
  contextMenuConversation.value = null
}

// 下拉菜单命令
const handleCommand = (command: string) => {
  switch (command) {
    case 'export':
      if (llmChatStore.activeConversationId) {
        // TODO: 实现导出功能
        ElMessage.info('导出功能开发中...')
      }
      break
    case 'settings':
      // TODO: 实现设置功能
      ElMessage.info('设置功能开发中...')
      break
    case 'closeAll':
      ElMessageBox.confirm(
        '确定要关闭所有标签页吗？对话数据不会丢失。',
        '关闭所有标签',
        {
          confirmButtonText: '关闭',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        llmChatStore.conversations = []
        llmChatStore.activeConversationId = null
        ElMessage.success('已关闭所有标签页')
      }).catch(() => {
        // 用户取消
      })
      break
  }
}
</script>

<style scoped lang="scss">
.llm-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.tabs-header-wrapper {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color);
}

.chat-tabs {
  flex: 1;
  min-width: 0; // 允许标签页收缩
  
  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: none; // 由外层容器统一处理边框
  }
  
  :deep(.el-tabs__nav-wrap) {
    padding: 0 12px;
  }
  
  :deep(.el-tabs__item) {
    height: 40px;
    line-height: 40px;
    padding: 0 16px;
    border-radius: 8px 8px 0 0;
    transition: all 0.3s;
    
    &:hover {
      background: var(--el-fill-color-light);
    }
    
    &.is-active {
      background: var(--el-color-primary-light-9);
      color: var(--el-color-primary);
      font-weight: 500;
    }
  }
  
  .tab-label {
    display: inline-block;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
      text-decoration-style: dashed;
    }
  }
}

.tabs-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 40px;
  flex-shrink: 0; // 工具按钮不收缩
  border-left: 1px solid var(--el-border-color-lighter);
}

.chat-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
