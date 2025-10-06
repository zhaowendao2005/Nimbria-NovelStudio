<template>
  <div class="outline-panel">
    <!-- 大纲内容 -->
    <el-empty 
      v-if="outlineItems.length === 0"
      description="当前文档没有标题"
      :image-size="80"
    />
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
import { ref } from 'vue'

/**
 * OutlinePanel
 * 大纲面板（纯内容版）
 * 标题栏和关闭按钮由RightSidebar统一管理
 * TODO: 实现自动提取Markdown标题、滚动定位功能
 */

interface OutlineItem {
  id: string
  text: string
  level: number // 1-6 对应 h1-h6
}

// Mock数据（TODO: 从当前打开的Markdown文件提取）
const outlineItems = ref<OutlineItem[]>([])

// ==================== 大纲功能 ====================
const getMarker = (level: number): string => {
  return '#'.repeat(level)
}

const scrollToHeading = (id: string) => {
  console.log('Scroll to heading:', id)
  // TODO: 实现滚动到标题功能
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

