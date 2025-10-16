<template>
  <div class="chat-input">
    <!-- 工具栏（始终显示模型选择器） -->
    <div class="input-toolbar">
      <!-- 左侧工具 -->
      <div class="toolbar-left">
        <!-- 模型选择器 -->
        <ModelSelector />
      </div>
      
      <!-- 右侧：无对话时显示创建按钮 -->
      <div v-if="!hasActiveConversation" class="toolbar-right">
        <el-button
          type="primary"
          :disabled="!hasSelectedModel"
          @click="handleCreateConversation"
        >
          <el-icon><component :is="'Plus'" /></el-icon>
          创建对话
        </el-button>
      </div>
    </div>
    
    <!-- 输入区域（仅在有对话时显示） -->
    <template v-if="hasActiveConversation">
      <!-- 输入框 -->
      <el-input
        v-model="inputText"
        type="textarea"
        :autosize="{ minRows: 2, maxRows: 6 }"
        placeholder="在这里输入消息... (Ctrl+Enter 发送)"
        :disabled="isLoading"
        @keydown.ctrl.enter="handleSend"
        @keydown.meta.enter="handleSend"
      />
      
      <!-- 输入工具栏 -->
      <div class="input-actions">
        <!-- 左侧工具 -->
        <div class="actions-left">
          <!-- 附件按钮 -->
          <el-tooltip content="添加文件引用" placement="top">
            <el-button
              text
              circle
              size="small"
              :icon="Paperclip"
              @click="handleAddAttachment"
            />
          </el-tooltip>
          
          <!-- 项目上下文 -->
          <el-tooltip content="使用项目上下文" placement="top">
            <el-button
              text
              circle
              size="small"
              :icon="FolderOpened"
              @click="handleToggleContext"
            />
          </el-tooltip>
        </div>
        
        <!-- 右侧发送按钮 -->
        <div class="actions-right">
          <el-button
            type="primary"
            :loading="isLoading"
            :disabled="!canSend"
            @click="handleSend"
          >
            <el-icon><component :is="'Promotion'" /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </template>
    
    <!-- 状态提示 -->
    <div v-if="!hasSelectedModel" class="status-hint">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
      >
        <template #title>
          请先选择一个模型
        </template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import { ElMessage } from 'element-plus'
import { Paperclip, FolderOpened } from '@element-plus/icons-vue'
import ModelSelector from './ModelSelector.vue'

const llmChatStore = useLlmChatStore()

const inputText = ref('')
const attachments = ref<any[]>([])

// 计算属性
const isLoading = computed(() => llmChatStore.isLoading)
const hasSelectedModel = computed(() => llmChatStore.hasSelectedModels)
const hasActiveConversation = computed(() => !!llmChatStore.activeConversationId)
const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !isLoading.value && hasActiveConversation.value
})

// 方法
const handleSend = async () => {
  if (!canSend.value) return
  
  const content = inputText.value.trim()
  if (!content) return
  
  try {
    await llmChatStore.sendMessage(content, attachments.value.length > 0 ? attachments.value : undefined)
    
    // 清空输入
    inputText.value = ''
    attachments.value = []
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败，请重试')
  }
}

const handleAddAttachment = () => {
  // TODO: 实现文件选择
  ElMessage.info('文件引用功能开发中')
}

const handleToggleContext = () => {
  // TODO: 实现项目上下文切换
  ElMessage.info('项目上下文功能开发中')
}

const handleCreateConversation = async () => {
  try {
    const conversationId = await llmChatStore.createConversation()
    if (conversationId) {
      ElMessage.success('对话已创建')
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
</script>

<style scoped lang="scss">
.chat-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color);
}

.input-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.actions-left {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-hint {
  margin-top: 4px;
}
</style>

