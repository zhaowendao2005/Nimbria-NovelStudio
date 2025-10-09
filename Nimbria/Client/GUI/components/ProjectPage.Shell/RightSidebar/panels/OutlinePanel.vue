<template>
  <div class="outline-panel">
    <!-- 空状态：无打开文件 -->
    <el-empty 
      v-if="!hasActiveFile"
      description="请先打开一个 Markdown 文件"
      :image-size="80"
    />
    <!-- 空状态：无标题 -->
    <el-empty 
      v-else-if="outlineItems.length === 0"
      description="当前文档没有标题"
      :image-size="80"
    />
    <!-- 大纲列表 -->
    <div v-else class="outline-list">
      <div 
        v-for="item in outlineItems"
        :key="item.id"
        class="outline-item"
        :style="{ paddingLeft: `${item.level * 12 + 12}px` }"
        @click="scrollToHeading(item.id)"
      >
        <span class="item-marker">{{ getMarker(item.level) }}</span>
        <span class="item-text">{{ item.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { marked } from 'marked'
import { useMarkdownStore } from '@stores/projectPage/Markdown'

/**
 * OutlinePanel
 * 大纲面板 - 自动从当前打开的 Markdown 文件提取标题
 * 标题栏和关闭按钮由 RightSidebar 统一管理
 */

interface OutlineItem {
  id: string
  text: string
  level: number // 1-6 对应 h1-h6
}

const markdownStore = useMarkdownStore()

// 大纲项列表
const outlineItems = ref<OutlineItem[]>([])

// 是否有打开的文件
const hasActiveFile = computed(() => {
  return markdownStore.activeTab !== null
})

// 当前激活文件的内容
const activeContent = computed(() => {
  return markdownStore.activeTab?.content || ''
})

// 提取大纲
const extractOutline = (markdown: string): OutlineItem[] => {
  if (!markdown) return []
  
  try {
    const tokens = marked.lexer(markdown) as Array<{ type: string; depth?: number; text?: string }>
    
    const headings = tokens
      .filter(token => token.type === 'heading')
      .map((heading, index: number) => ({
        id: `heading-${index}`,
        level: heading.depth || 1,
        text: heading.text || ''
      }))
    
    return headings
  } catch (error) {
    console.error('Failed to extract outline:', error)
    return []
  }
}

// 监听内容变化，自动更新大纲
watch(activeContent, (newContent) => {
  outlineItems.value = extractOutline(newContent)
  console.log('[OutlinePanel] Outline updated:', outlineItems.value.length, 'items')
}, { immediate: true })

// ==================== 大纲功能 ====================
const getMarker = (level: number): string => {
  return '#'.repeat(level)
}

const scrollToHeading = (id: string) => {
  console.log('[OutlinePanel] Scroll to heading:', id)
  // TODO: 实现滚动到标题功能（需要与 Vditor 编辑器通信）
}
</script>

<style scoped>
.outline-panel {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.outline-list {
  padding: 0;
}

.outline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 13px;
}

.outline-item:hover {
  background: var(--el-fill-color-light);
}

.item-marker {
  color: var(--el-color-primary);
  font-weight: 600;
  font-family: monospace;
  flex-shrink: 0;
}

.item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
}
</style>

