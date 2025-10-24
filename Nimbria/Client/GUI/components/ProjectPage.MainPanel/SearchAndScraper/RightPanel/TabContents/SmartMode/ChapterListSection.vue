<template>
  <div class="chapter-list-section">
    <!-- 🆕 工具栏 (仿 TaskManagePage) -->
    <div class="chapter-toolbar">
      <div class="toolbar-row toolbar-row-1">
        <el-input
          v-model="searchQuery"
          placeholder="搜索章节标题..."
          :prefix-icon="Search"
          class="search-input"
          clearable
          size="small"
        />
        <div class="toolbar-spacer"></div>
      </div>
      
      <div class="toolbar-row toolbar-row-2">
        <div class="toolbar-tools">
          <!-- 选择模式切换 -->
          <div 
            class="tool-item"
            :class="{ 'tool-item--active': selectMode }"
            @click="toggleSelectMode"
            title="选择模式"
          >
            <el-icon><Check /></el-icon>
          </div>
          
          <!-- 全选 -->
          <div 
            v-show="selectMode"
            class="tool-item"
            @click="toggleSelectAll"
            title="全选"
          >
            <el-icon><Select /></el-icon>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 章节列表 -->
    <el-scrollbar class="chapter-scrollbar">
      <div v-if="filteredChapters.length === 0" class="empty-hint">
        <el-empty
          description="暂无匹配到的章节"
          :image-size="60"
        />
      </div>
      <div v-else class="chapter-items">
        <div
          v-for="(chapter, index) in filteredChapters"
          :key="index"
          class="chapter-row"
          :class="{ 
            selected: selectMode && selectedIndexes.has(index),
            'select-mode': selectMode
          }"
          @click="handleChapterClick(index)"
        >
          <!-- 🆕 选择模式下的复选框 -->
          <div v-if="selectMode" class="chapter-checkbox">
            <el-checkbox
              :model-value="selectedIndexes.has(index)"
              @click.stop="toggleChapterSelection(index)"
            />
          </div>
          
          <span class="chapter-index">{{ index + 1 }}</span>
          <span class="chapter-title">{{ chapter.title }}</span>
          <span class="chapter-link">{{ chapter.url }}</span>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, Select, Search } from '@element-plus/icons-vue'
import type { Chapter } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'

/**
 * ChapterListSection 组件
 * 显示匹配到的章节列表，支持选择功能
 */

interface Props {
  chapters: Chapter[]
  urlPrefix: string
  urlPrefixEnabled: boolean
}

interface Emits {
  (e: 'update:urlPrefix', value: string): void
  (e: 'update:urlPrefixEnabled', value: boolean): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// 🆕 选择功能状态
const selectMode = ref(false)
const selectedIndexes = ref<Set<number>>(new Set())
const searchQuery = ref('')

// 🆕 过滤后的章节列表
const filteredChapters = computed(() => {
  if (!searchQuery.value) return props.chapters
  
  const query = searchQuery.value.toLowerCase()
  return props.chapters.filter(ch => 
    ch.title.toLowerCase().includes(query) ||
    ch.url.toLowerCase().includes(query)
  )
})

// 🆕 切换选择模式
const toggleSelectMode = () => {
  selectMode.value = !selectMode.value
  // 切换出选择模式时清空选择
  if (!selectMode.value) {
    selectedIndexes.value.clear()
  }
}

// 🆕 切换单个章节选择
const toggleChapterSelection = (index: number) => {
  if (selectedIndexes.value.has(index)) {
    selectedIndexes.value.delete(index)
  } else {
    selectedIndexes.value.add(index)
  }
}

// 🆕 处理章节点击
const handleChapterClick = (index: number) => {
  if (selectMode.value) {
    toggleChapterSelection(index)
  }
}

// 🆕 全选/取消全选
const toggleSelectAll = () => {
  if (selectedIndexes.value.size === filteredChapters.value.length) {
    selectedIndexes.value.clear()
  } else {
    selectedIndexes.value = new Set(
      filteredChapters.value.map((_, i) => i)
    )
  }
}
</script>

<style scoped lang="scss">
.chapter-list-section {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  overflow: hidden;
}

// 🆕 工具栏样式
.chapter-toolbar {
  border-bottom: 1px solid var(--el-border-color-lighter);
  padding: 8px 12px;
  background: var(--el-fill-color-lighter);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-row-1 {
  margin-bottom: 0;
}

.toolbar-spacer {
  flex-grow: 1;
}

.search-input {
  width: 100%;
}

.toolbar-tools {
  display: flex;
  gap: 0;
  align-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  
  .tool-item {
    cursor: pointer;
    width: 32px;
    height: 32px;
    border-radius: 0;
    background: var(--el-bg-color);
    border: none;
    border-right: 1px solid var(--el-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    font-size: 16px;
    
    &:last-child {
      border-right: none;
    }
    
    &:hover {
      background: var(--el-color-primary-light-9);
      border-color: var(--el-color-primary);
      position: relative;
      z-index: 1;
    }
    
    &--active {
      background: var(--el-color-primary);
      color: white;
      border-color: var(--el-color-primary);
      position: relative;
      z-index: 1;
    }
  }
}

.chapter-scrollbar {
  flex: 1;
  
  :deep(.el-scrollbar__view) {
    padding: 8px;
  }
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 200px;
}

.chapter-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

// 🆕 章节行选择状态
.chapter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
  cursor: pointer;
  
  &:hover {
    background: var(--el-fill-color);
  }
  
  &.select-mode {
    &.selected {
      background: var(--el-color-primary-light-9);
      border: 1px solid var(--el-color-primary-light-5);
    }
  }
}

.chapter-checkbox {
  flex-shrink: 0;
  margin-right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  :deep(.el-checkbox__input) {
    width: 16px;
    height: 16px;
  }
}

.chapter-index {
  flex-shrink: 0;
  width: 32px;
  text-align: center;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.chapter-title {
  flex: 1;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-link {
  flex-shrink: 0;
  max-width: 200px;
  color: var(--el-color-primary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

