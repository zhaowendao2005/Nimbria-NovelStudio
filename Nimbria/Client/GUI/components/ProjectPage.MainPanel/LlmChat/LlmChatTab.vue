<template>
  <div class="llmchat-tab">
    <!-- Header: 模型选择 + 工具栏 -->
    <div class="tab-header">
      <div class="header-left">
        <ModelSelector />
      </div>
      
      <div class="header-right">
        <el-button-group>
          <el-tooltip content="历史记录" placement="bottom">
            <el-button :icon="Clock" @click="showHistory = true" />
          </el-tooltip>
          <el-tooltip content="导出对话" placement="bottom">
            <el-button :icon="Download" @click="handleExport" />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>
    
    <!-- Main: 消息区域 -->
    <div class="tab-main">
      <ChatMessages v-if="currentConversation" />
      <div v-else class="empty-state">
        <el-empty description="对话未加载">
          <el-button type="primary" :icon="Plus" @click="handleCreateConversation">
            创建新对话
          </el-button>
        </el-empty>
      </div>
    </div>
    
    <!-- Footer: 输入区域 -->
    <div class="tab-footer" v-if="currentConversation">
      <ChatInput />
    </div>
    
    <!-- 历史记录对话框 -->
    <ChatHistoryDialog v-model="showHistory" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Clock, Download, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import ModelSelector from '../../ProjectPage.Shell/Navbar.content/LlmChat/ModelSelector.vue'
import ChatMessages from '../../ProjectPage.Shell/Navbar.content/LlmChat/ChatMessages.vue'
import ChatInput from '../../ProjectPage.Shell/Navbar.content/LlmChat/ChatInput.vue'
import ChatHistoryDialog from '../../ProjectPage.Shell/Navbar.content/LlmChat/ChatHistoryDialog.vue'

interface Props {
  tabId: string
  conversationId?: string // 🔥 支持传入特定的对话ID
}

const props = defineProps<Props>()

const llmChatStore = useLlmChatStore()
const showHistory = ref(false)

// 当前对话（根据conversationId或activeConversationId）
const currentConversation = computed(() => {
  // 优先使用传入的conversationId，否则使用activeConversationId
  const targetId = props.conversationId || llmChatStore.activeConversationId
  return llmChatStore.conversations.find(c => c.id === targetId) || null
})

// 初始化
onMounted(async () => {
  console.log('[LlmChatTab] Mounted with conversationId:', props.conversationId)
  
  await llmChatStore.initialize()
  
  // 如果传入了conversationId，加载该对话
  if (props.conversationId) {
    console.log('[LlmChatTab] Loading conversation:', props.conversationId)
    try {
      await llmChatStore.loadConversationById(props.conversationId)
      console.log('[LlmChatTab] Conversation loaded successfully')
    } catch (error) {
      console.error('[LlmChatTab] Failed to load conversation:', error)
      ElMessage.error('加载对话失败')
    }
  } else if (!llmChatStore.activeConversationId && llmChatStore.conversations.length === 0) {
    // 如果没有任何对话，创建一个新对话
    await handleCreateConversation()
  }
})

// 监听conversationId变化
watch(() => props.conversationId, async (newId) => {
  if (newId && newId !== llmChatStore.activeConversationId) {
    console.log('[LlmChatTab] ConversationId changed, loading:', newId)
    try {
      await llmChatStore.loadConversationById(newId)
    } catch (error) {
      console.error('[LlmChatTab] Failed to load conversation:', error)
    }
  }
})

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
    ElMessage.error(error?.message || '创建对话失败')
  }
}

// 导出对话
const handleExport = () => {
  // TODO: 实现导出功能
  ElMessage.info('导出功能开发中...')
}

// 暴露方法
defineExpose({
  getConversation: () => currentConversation.value,
  switchConversation: (conversationId: string) => {
    llmChatStore.loadConversationById(conversationId)
  }
})
</script>

<style scoped lang="scss">
.llmchat-tab {
  height: 100%;
  width: 100%;
  min-height: 0;
  
  display: flex;
  flex-direction: column;
  
  background-color: var(--el-bg-color, #ffffff);
  overflow: hidden;
}

.tab-header {
  height: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: var(--el-bg-color-page, #f5f6f8);
  border-bottom: 1px solid var(--el-border-color, #e3e5e8);
  flex-shrink: 0;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tab-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--el-border-color, #e3e5e8);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

