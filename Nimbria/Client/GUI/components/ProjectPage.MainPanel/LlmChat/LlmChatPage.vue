<template>
  <LlmChatTab :tab-id="tabId" :conversation-id="conversationId" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LlmChatTab from './LlmChatTab.vue'
import { CustomPageAPI } from '../../../../Service/CustomPageManager'

interface Props {
  tabId: string
  instanceId?: string
}

const props = defineProps<Props>()

// 🔥 从 CustomPageManager instance 中提取 conversationId
const conversationId = computed(() => {
  if (!props.instanceId) return undefined
  
  const instance = CustomPageAPI.getActiveInstances().find(i => i.id === props.instanceId)
  return instance?.params?.conversationId
})

console.log('[LlmChatPage] Rendering with:', { 
  tabId: props.tabId, 
  instanceId: props.instanceId,
  conversationId: conversationId.value 
})
</script>

