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
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'

/**
 * OutlinePanel
 * 大纲面板 - 自动从当前打开的 Markdown 文件提取标题
 * 标题栏和关闭按钮由 RightSidebar 统一管理
 */

interface OutlineItem {
  id: string
  text: string
  level: number // 1-6 对应 h1-h6
  lineNumber: number // 🔥 标题所在的行号
  slug: string // 🔥 标题的 slug（用于预览模式跳转）
}

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

// 大纲项列表
const outlineItems = ref<OutlineItem[]>([])

/**
 * 🔥 当前焦点面板的文件内容
 * 改造：从焦点面板获取内容，而不是从 activeTab
 */
const activeContent = computed(() => {
  // 1. 获取焦点面板
  const focusedPane = paneLayoutStore.focusedPane
  if (!focusedPane) return ''
  
  // 2. 获取面板对应的标签页 ID
  const tabId = focusedPane.tabId
  if (!tabId) return ''
  
  // 3. 获取标签页内容
  const tab = markdownStore.openTabs.find(t => t.id === tabId)
  return tab?.content || ''
})

// 是否有打开的文件
const hasActiveFile = computed(() => {
  return activeContent.value !== ''
})

/**
 * 将标题文本转换为 slug（用于 HTML 锚点）
 */
const textToSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s]+/g, '-')         // 空格转为连字符
    .replace(/[^\w\u4e00-\u9fa5-]/g, '') // 只保留字母、数字、中文、连字符
    .replace(/--+/g, '-')           // 多个连字符合并
    .replace(/^-|-$/g, '')          // 去除首尾连字符
}

/**
 * 计算标题在原始 Markdown 中的行号
 */
const calculateLineNumber = (markdown: string, headingText: string, headingIndex: number): number => {
  const lines = markdown.split('\n')
  let currentHeadingCount = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || ''
    // 匹配 Markdown 标题格式：# 、## 、### 等
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    
    if (headingMatch && headingMatch[2]) {
      const matchedText = headingMatch[2].trim()
      if (matchedText === headingText || matchedText.includes(headingText)) {
        if (currentHeadingCount === headingIndex) {
          return i + 1 // 行号从 1 开始
        }
        currentHeadingCount++
      }
    }
  }
  
  return 1 // 默认返回第1行
}

// 提取大纲
const extractOutline = (markdown: string): OutlineItem[] => {
  if (!markdown) return []
  
  try {
    const tokens = marked.lexer(markdown) as Array<{ type: string; depth?: number; text?: string; raw?: string }>
    
    const headings = tokens
      .filter(token => token.type === 'heading')
      .map((heading, index: number) => {
        const text = heading.text || ''
        const lineNumber = calculateLineNumber(markdown, text, index)
        
        return {
          id: `heading-${index}`,
          level: heading.depth || 1,
          text,
          lineNumber,
          slug: textToSlug(text)
        }
      })
    
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

/**
 * 点击大纲项，跳转到对应标题
 */
const scrollToHeading = (id: string) => {
  const item = outlineItems.value.find(i => i.id === id)
  if (!item) {
    console.warn('[OutlinePanel] Heading not found:', id)
    return
  }
  
  console.log('[OutlinePanel] Scroll to heading:', item)
  
  // 调用 Store 的跳转方法
  markdownStore.scrollToOutline(item.lineNumber, item.slug)
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

