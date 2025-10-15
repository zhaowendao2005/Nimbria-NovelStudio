<template>
  <div class="chat-messages" ref="messagesContainer">
    <div v-if="messages.length === 0" class="empty-state">
      <el-empty description="开始新的对话吧" />
    </div>
    
    <div v-else class="messages-list">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-item"
        :class="[`message-${message.role}`, `status-${message.status}`]"
      >
        <!-- 消息头部 -->
        <div class="message-header">
          <div class="message-avatar">
            <el-icon v-if="message.role === 'user'">
              <component :is="'User'" />
            </el-icon>
            <el-icon v-else>
              <component :is="'ChatDotRound'" />
            </el-icon>
          </div>
          
          <div class="message-meta">
            <span class="message-role">
              {{ message.role === 'user' ? '你' : 'AI助手' }}
            </span>
            <span v-if="showTimestamp" class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
          
          <div class="message-actions">
            <el-dropdown trigger="click" @command="handleMessageAction($event, message)">
              <el-button text circle size="small">
                <el-icon><component :is="'More'" /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="copy">
                    <el-icon><component :is="'DocumentCopy'" /></el-icon>
                    复制
                  </el-dropdown-item>
                  <el-dropdown-item v-if="message.role === 'assistant'" command="regenerate">
                    <el-icon><component :is="'RefreshRight'" /></el-icon>
                    重新生成
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>
                    <el-icon><component :is="'Delete'" /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <!-- 消息内容 -->
        <div class="message-content">
          <!-- 错误状态 -->
          <div v-if="message.status === 'error'" class="message-error">
            <el-alert
              type="error"
              :closable="false"
            >
              <template #title>
                {{ message.error || '发送失败' }}
              </template>
            </el-alert>
          </div>
          
          <!-- 正常内容 -->
          <div v-else class="message-text" v-html="renderMarkdown(message.content)"></div>
          
          <!-- 附件 -->
          <div v-if="message.attachments && message.attachments.length > 0" class="message-attachments">
            <div
              v-for="(attachment, index) in message.attachments"
              :key="index"
              class="attachment-item"
            >
              <el-icon><component :is="'Document'" /></el-icon>
              <span>{{ attachment.name }}</span>
            </div>
          </div>
          
          <!-- 加载状态 -->
          <div v-if="message.status === 'streaming'" class="message-loading">
            <el-icon class="is-loading"><component :is="'Loading'" /></el-icon>
            思考中...
          </div>
        </div>
        
        <!-- 消息底部操作（仅AI消息） -->
        <div v-if="message.role === 'assistant' && message.status === 'sent'" class="message-footer">
          <el-button-group size="small">
            <el-button text @click="handleFeedback(message.id, 'good')">
              <el-icon><component :is="'CircleCheck'" /></el-icon>
            </el-button>
            <el-button text @click="handleFeedback(message.id, 'bad')">
              <el-icon><component :is="'CircleClose'" /></el-icon>
            </el-button>
          </el-button-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useChatStore } from '@stores/chat/chatStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useClipboard } from '@vueuse/core'
import type { ChatMessage } from './types'

// Markdown渲染（简单实现，实际应使用专业库如marked）
const renderMarkdown = (content: string): string => {
  if (!content) return ''
  
  // 简单的Markdown渲染
  let html = content
  
  // 代码块
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code)}</code></pre>`
  })
  
  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // 粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // 斜体
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  // 换行
  html = html.replace(/\n/g, '<br>')
  
  return html
}

const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const chatStore = useChatStore()
const { copy } = useClipboard()

const messagesContainer = ref<HTMLElement>()
const showTimestamp = ref(true)

// 计算属性
const activeConversation = computed(() => chatStore.activeConversation)
const messages = computed(() => activeConversation.value?.messages || [])

// 格式化时间
const formatTime = (timestamp: Date): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 一分钟内
  if (diff < 60000) {
    return '刚刚'
  }
  
  // 一小时内
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  
  // 今天
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 其他
  return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 消息操作
const handleMessageAction = async (command: string, message: ChatMessage) => {
  switch (command) {
    case 'copy':
      await copy(message.content)
      ElMessage.success('已复制到剪贴板')
      break
      
    case 'regenerate':
      await chatStore.regenerateMessage(message.id)
      break
      
    case 'delete':
      try {
        await ElMessageBox.confirm('确定要删除这条消息吗？', '确认删除', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        chatStore.deleteMessage(message.id)
        ElMessage.success('消息已删除')
      } catch {
        // 用户取消
      }
      break
  }
}

// 反馈
const handleFeedback = (messageId: string, type: 'good' | 'bad') => {
  // TODO: 保存反馈
  ElMessage.success(type === 'good' ? '感谢您的反馈' : '我们会努力改进')
}

// 自动滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 监听消息变化，自动滚动
watch(() => messages.value.length, () => {
  scrollToBottom()
}, { flush: 'post' })
</script>

<style scoped lang="scss">
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--el-bg-color);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-darker);
    border-radius: 3px;
  }
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  
  &.message-user {
    background: var(--el-color-primary-light-9);
  }
  
  &.message-assistant {
    background: var(--el-fill-color-light);
  }
  
  &.status-error {
    background: var(--el-color-danger-light-9);
  }
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.message-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: white;
  font-size: 14px;
  flex-shrink: 0;
  
  .message-assistant & {
    background: var(--el-color-success);
  }
}

.message-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.message-role {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.message-time {
  color: var(--el-text-color-secondary);
}

.message-actions {
  opacity: 0;
  transition: opacity 0.2s;
  
  .message-item:hover & {
    opacity: 1;
  }
}

.message-content {
  padding-left: 32px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
}

.message-text {
  word-wrap: break-word;
  
  :deep(pre) {
    margin: 8px 0;
    padding: 12px;
    background: var(--el-fill-color-darker);
    border-radius: 4px;
    overflow-x: auto;
  }
  
  :deep(code) {
    padding: 2px 6px;
    background: var(--el-fill-color);
    border-radius: 3px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.9em;
  }
  
  :deep(strong) {
    font-weight: 600;
  }
  
  :deep(em) {
    font-style: italic;
  }
}

.message-error {
  margin: 8px 0;
}

.message-attachments {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--el-fill-color);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  
  &:hover {
    background: var(--el-fill-color-dark);
  }
}

.message-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-color-primary);
  font-size: 12px;
}

.message-footer {
  padding-left: 32px;
  
  .el-button-group {
    .el-button {
      font-size: 16px;
      
      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}
</style>

