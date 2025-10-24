<template>
  <div class="chapter-list-section">
    <!-- 标题栏 -->
    <div class="section-header">
      <span class="section-title">匹配到的章节</span>
      <div class="section-controls">
        <el-checkbox
          :model-value="urlPrefixEnabled"
          @update:model-value="$emit('update:urlPrefixEnabled', $event)"
        />
        <span class="label">链接拼接规则：</span>
        <el-input
          :model-value="urlPrefix"
          :disabled="!urlPrefixEnabled"
          size="small"
          placeholder="可选，如：https://example.com"
          style="width: 240px"
          clearable
          @update:model-value="$emit('update:urlPrefix', $event)"
        />
      </div>
    </div>
    
    <!-- 章节列表 -->
    <el-scrollbar class="chapter-scrollbar">
      <div v-if="chapters.length === 0" class="empty-hint">
        <el-empty
          description="暂无匹配到的章节"
          :image-size="60"
        />
      </div>
      <div v-else class="chapter-items">
              <div
                v-for="(chapter, index) in chapters"
                :key="index"
                class="chapter-row"
              >
                <span class="chapter-index">{{ index + 1 }}</span>
                <span class="chapter-title">{{ chapter.title }}</span>
                <span class="chapter-link">{{ chapter.url }}</span>
              </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
/**
 * ChapterListSection 组件
 * 显示匹配到的章节列表
 */

import type { Chapter } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'

interface Props {
  chapters: Chapter[]
  urlPrefix: string
  urlPrefixEnabled: boolean
}

interface Emits {
  (e: 'update:urlPrefix', value: string): void
  (e: 'update:urlPrefixEnabled', value: boolean): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped lang="scss">
.chapter-list-section {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color);
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .label {
    font-size: 13px;
    color: var(--el-text-color-regular);
    white-space: nowrap;
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

.chapter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
  transition: all 0.2s;
  
  &:hover {
    background: var(--el-fill-color);
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

