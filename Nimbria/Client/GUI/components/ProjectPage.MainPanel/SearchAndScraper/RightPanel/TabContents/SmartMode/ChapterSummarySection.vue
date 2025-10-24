<template>
  <div class="chapter-summary-section">
    <div v-if="chapters.length === 0" class="empty-hint">
      <el-empty
        description="暂无爬取的章节"
        :image-size="60"
      />
    </div>
    <el-scrollbar v-else class="summary-scrollbar">
      <div class="summary-cards">
        <div
          v-for="(chapter, index) in chapters"
          :key="index"
          class="summary-card"
        >
          <!-- 卡片头部 -->
          <div class="card-header">
            <span class="chapter-number">#{{ index + 1 }}</span>
            <span class="chapter-name">{{ chapter.title }}</span>
          </div>
          
          <!-- 卡片内容 -->
          <div class="card-content">
            <div class="content-preview">
              {{ chapter.summary }}
            </div>
          </div>
          
          <!-- 卡片操作 -->
          <div class="card-actions">
            <el-button
              :icon="View"
              size="small"
              @click="handleViewDetail(chapter)"
            >
              详情
            </el-button>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { View } from '@element-plus/icons-vue'

/**
 * ChapterSummarySection 组件
 * 显示爬取到的章节摘要卡片
 */

import type { ScrapedChapter } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'

interface Props {
  chapters: ScrapedChapter[]
}

interface Emits {
  (e: 'view-detail', chapter: ScrapedChapter): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 查看详情
 */
const handleViewDetail = (chapter: ScrapedChapter): void => {
  emit('view-detail', chapter)
}
</script>

<style scoped lang="scss">
.chapter-summary-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  overflow: hidden;
}

.empty-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.summary-scrollbar {
  flex: 1;
  
  :deep(.el-scrollbar__view) {
    padding: 12px;
  }
}

.summary-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--el-border-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.chapter-number {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.chapter-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-content {
  padding: 12px;
}

.content-preview {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  max-height: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  word-break: break-all;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  padding: 8px 12px 12px;
  gap: 8px;
}
</style>

