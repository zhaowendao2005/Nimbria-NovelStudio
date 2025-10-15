<template>
  <div class="chat-input">
    <!-- 输入框 -->
    <el-input
      v-model="inputText"
      type="textarea"
      :autosize="{ minRows: 2, maxRows: 6 }"
      placeholder="在这里输入消息... (Ctrl+Enter 发送)"
      :disabled="isLoading || !hasSelectedModel"
      @keydown.ctrl.enter="handleSend"
      @keydown.meta.enter="handleSend"
    />
    
    <!-- 工具栏 -->
    <div class="input-toolbar">
      <!-- 左侧工具 -->
      <div class="toolbar-left">
        <!-- 模型选择器 -->
        <ModelSelector />
        
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
      <div class="toolbar-right">
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
import { useChatStore } from '@stores/chat/chatStore'
import { ElMessage } from 'element-plus'
import { Paperclip, FolderOpened } from '@element-plus/icons-vue'
import ModelSelector from './ModelSelector.vue'

const chatStore = useChatStore()

const inputText = ref('')
const attachments = ref<any[]>([])

// 计算属性
const isLoading = computed(() => chatStore.isLoading)
const hasSelectedModel = computed(() => chatStore.hasSelectedModels)
const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !isLoading.value && hasSelectedModel.value
})

// 方法
const handleSend = async () => {
  if (!canSend.value) return
  
  const content = inputText.value.trim()
  if (!content) return
  
  try {
    await chatStore.sendMessage(content, attachments.value.length > 0 ? attachments.value : undefined)
    
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

.status-hint {
  margin-top: 4px;
}
</style>

