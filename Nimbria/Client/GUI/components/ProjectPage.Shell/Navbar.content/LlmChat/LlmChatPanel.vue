<template>
  <div class="llm-chat-panel">
    <!-- 选项卡 -->
    <ChatTabs />
    
    <!-- 消息区域 -->
    <ChatMessages />
    
    <!-- 输入区域 -->
    <ChatInput />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import ChatTabs from './ChatTabs.vue'
import ChatMessages from './ChatMessages.vue'
import ChatInput from './ChatInput.vue'

const llmChatStore = useLlmChatStore()

onMounted(async () => {
  // 初始化Store
  await llmChatStore.initialize()
})
</script>

<style scoped lang="scss">
.llm-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}
</style>

