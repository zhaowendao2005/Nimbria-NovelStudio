<template>
  <q-dialog v-model="isVisible" persistent maximized>
    <q-card style="width: 900px; max-width: 95vw; height: 700px; max-height: 95vh">
      <!-- 标题栏 -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <div class="text-h6">对话历史</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="closeDialog" />
      </q-card-section>

      <!-- 搜索栏 -->
      <q-card-section class="q-pt-md q-pb-sm">
        <q-input
          v-model="searchQuery"
          placeholder="搜索对话标题或模型..."
          outlined
          dense
          clearable
          @update:model-value="onSearchQueryChange"
        >
          <template v-slot:prepend>
            <q-icon name="search" />
          </template>
          <template v-slot:append v-if="isSearching">
            <q-spinner size="20px" />
          </template>
        </q-input>

        <!-- 过滤选项 -->
        <div class="row q-gutter-sm q-mt-sm">
          <q-chip
            v-for="filter in filters"
            :key="filter.value"
            :selected="selectedFilter === filter.value"
            clickable
            @click="selectedFilter = filter.value"
            color="primary"
            text-color="white"
            :outline="selectedFilter !== filter.value"
          >
            {{ filter.label }}
          </q-chip>
        </div>
      </q-card-section>

      <!-- 对话列表 -->
      <q-card-section class="q-pt-none" style="height: calc(100% - 200px)">
        <q-scroll-area style="height: 100%">
          <!-- 加载状态 -->
          <div v-if="isLoading" class="text-center q-pa-lg">
            <q-spinner size="50px" color="primary" />
            <div class="q-mt-md text-grey-6">加载对话历史...</div>
          </div>

          <!-- 空状态 -->
          <div v-else-if="filteredConversations.length === 0" class="text-center q-pa-lg">
            <q-icon name="chat_bubble_outline" size="64px" color="grey-5" />
            <div class="text-h6 text-grey-6 q-mt-md">
              {{ searchQuery ? '未找到匹配的对话' : '暂无对话历史' }}
            </div>
            <div class="text-caption text-grey-5 q-mt-sm">
              {{ searchQuery ? '尝试使用其他关键词搜索' : '开始新对话后会在这里显示' }}
            </div>
          </div>

          <!-- 对话列表 -->
          <q-list v-else separator>
            <q-item
              v-for="conversation in filteredConversations"
              :key="conversation.id"
              clickable
              @click="openConversation(conversation)"
              class="conversation-item"
            >
              <q-item-section>
                <q-item-label class="text-bold">
                  {{ conversation.title }}
                </q-item-label>
                <q-item-label caption lines="2">
                  <q-icon name="smart_toy" size="14px" class="q-mr-xs" />
                  {{ conversation.modelId }}
                  <span class="q-mx-sm">•</span>
                  <q-icon name="chat" size="14px" class="q-mr-xs" />
                  {{ conversation.messages?.length || 0 }} 条消息
                  <span class="q-mx-sm">•</span>
                  <q-icon name="access_time" size="14px" class="q-mr-xs" />
                  {{ formatDate(new Date(conversation.updatedAt)) }}
                </q-item-label>
              </q-item-section>
              
              <q-item-section side>
                <div class="row items-center q-gutter-xs">
                  <q-btn
                    flat
                    round
                    dense
                    icon="edit"
                    size="sm"
                    @click.stop="editConversationTitle(conversation)"
                  >
                    <q-tooltip>重命名</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    size="sm"
                    color="negative"
                    @click.stop="confirmDeleteConversation(conversation)"
                  >
                    <q-tooltip>删除对话</q-tooltip>
                  </q-btn>
                </div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-scroll-area>
      </q-card-section>

      <!-- 底部操作栏 -->
      <q-card-actions align="between" class="bg-grey-2 q-pa-md">
        <div class="text-caption text-grey-7">
          共 {{ totalConversations }} 个对话
        </div>
        <div class="row q-gutter-sm">
          <q-btn
            flat
            label="清空所有历史"
            color="negative"
            @click="confirmClearAllHistory"
            :disable="totalConversations === 0"
          />
          <q-btn
            unelevated
            label="关闭"
            color="primary"
            @click="closeDialog"
          />
        </div>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import { useChatTabManager } from '@stores/llmChat/chatTabManager'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type { Conversation } from '../../../../../types/llmChat'

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// Quasar
const $q = useQuasar()

// Stores
const llmChatStore = useLlmChatStore()
const tabManager = useChatTabManager()

// 状态
const isVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const searchQuery = ref('')
const selectedFilter = ref('all')
const isLoading = ref(false)
const isSearching = ref(false)

// 过滤选项
const filters = [
  { label: '全部', value: 'all' },
  { label: '最近', value: 'recent' },
  { label: '今天', value: 'today' },
  { label: '本周', value: 'week' },
  { label: '本月', value: 'month' }
]

// 计算属性
const filteredConversations = computed(() => {
  let result = llmChatStore.conversations

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((conv: Conversation) => 
      conv.title.toLowerCase().includes(query) ||
      conv.modelId.toLowerCase().includes(query)
    )
  }

  // 时间过滤
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  if (selectedFilter.value === 'today') {
    result = result.filter((conv: Conversation) => new Date(conv.updatedAt) >= today)
  } else if (selectedFilter.value === 'week') {
    result = result.filter((conv: Conversation) => new Date(conv.updatedAt) >= weekAgo)
  } else if (selectedFilter.value === 'month') {
    result = result.filter((conv: Conversation) => new Date(conv.updatedAt) >= monthAgo)
  } else if (selectedFilter.value === 'recent') {
    result = result.slice(0, 20)
  }

  // 按更新时间排序
  return result.sort((a: Conversation, b: Conversation) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
})

const totalConversations = computed(() => llmChatStore.conversations.length)

// 方法
const formatDate = (date: Date | string) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: zhCN })
}

const onSearchQueryChange = async (value: string | number | null) => {
  if (!value || typeof value !== 'string' || !value.trim()) return

  isSearching.value = true
  
  try {
    // 调用搜索 API
    await llmChatStore.searchConversations(value)
  } catch (error) {
    console.error('搜索对话失败:', error)
  } finally {
    isSearching.value = false
  }
}

const openConversation = async (conversation: any) => {
  console.log('打开对话:', conversation.id)
  
  // 通过标签页管理器打开对话
  tabManager.openConversation(conversation.id, conversation.title)
  
  // 如果对话没有消息，从数据库加载完整对话
  if (!conversation.messages || conversation.messages.length === 0) {
    await llmChatStore.loadConversation(conversation.id)
  }
  
  // 设置为活动对话
  llmChatStore.activeConversationId = conversation.id
  
  // 关闭对话框
  closeDialog()
}

const editConversationTitle = (conversation: Conversation) => {
  $q.dialog({
    title: '重命名对话',
    message: '请输入新的对话标题',
    prompt: {
      model: conversation.title,
      type: 'text'
    },
    cancel: true,
    persistent: true
  }).onOk(async (newTitle: string) => {
    if (newTitle && newTitle.trim() !== conversation.title) {
      try {
        await llmChatStore.updateConversationTitle(conversation.id, newTitle.trim())
        
        // 更新标签页标题
        tabManager.updateTabTitleByConversationId(conversation.id, newTitle.trim())
        
        $q.notify({
          type: 'positive',
          message: '对话标题已更新',
          position: 'top'
        })
      } catch (error) {
        console.error('更新对话标题失败:', error)
        $q.notify({
          type: 'negative',
          message: '更新失败，请重试',
          position: 'top'
        })
      }
    }
  })
}

const confirmDeleteConversation = (conversation: Conversation) => {
  $q.dialog({
    title: '删除对话',
    message: `确定要删除对话"${conversation.title}"吗？此操作不可恢复。`,
    persistent: true,
    ok: {
      label: '删除',
      color: 'negative'
    },
    cancel: {
      label: '取消',
      flat: true
    }
  }).onOk(async () => {
    try {
      await llmChatStore.deleteConversation(conversation.id)
      
      // 关闭相关标签页
      tabManager.closeTabsByConversationId(conversation.id)
      
      $q.notify({
        type: 'positive',
        message: '对话已删除',
        position: 'top'
      })
    } catch (error) {
      console.error('删除对话失败:', error)
      $q.notify({
        type: 'negative',
        message: '删除失败，请重试',
        position: 'top'
      })
    }
  })
}

const confirmClearAllHistory = () => {
  $q.dialog({
    title: '清空所有历史',
    message: `确定要删除所有 ${totalConversations.value} 个对话吗？此操作不可恢复。`,
    persistent: true,
    ok: {
      label: '清空',
      color: 'negative'
    },
    cancel: {
      label: '取消',
      flat: true
    }
  }).onOk(async () => {
    try {
      // 删除所有对话
      for (const conversation of llmChatStore.conversations) {
        await llmChatStore.deleteConversation(conversation.id)
      }
      
      // 关闭所有标签页
      tabManager.closeAllTabs()
      
      $q.notify({
        type: 'positive',
        message: '所有对话已清空',
        position: 'top'
      })
    } catch (error) {
      console.error('清空对话失败:', error)
      $q.notify({
        type: 'negative',
        message: '清空失败，请重试',
        position: 'top'
      })
    }
  })
}

const closeDialog = () => {
  isVisible.value = false
}

// 监听对话框打开，加载对话列表
watch(isVisible, async (newVal) => {
  if (newVal) {
    isLoading.value = true
    try {
      await llmChatStore.loadConversations()
    } catch (error) {
      console.error('加载对话列表失败:', error)
      $q.notify({
        type: 'negative',
        message: '加载对话列表失败',
        position: 'top'
      })
    } finally {
      isLoading.value = false
    }
  }
})
</script>

<style scoped lang="scss">
.conversation-item {
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
}
</style>

