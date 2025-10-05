<template>
  <div class="outline-content">
    <div class="outline-header">
      <span class="header-title">大纲</span>
    </div>
    
    <div class="outline-body">
      <el-empty 
        v-if="outlineItems.length === 0"
        description="暂无大纲"
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * OutlineContent
 * 大纲面板
 * TODO: 实现自动提取Markdown标题、滚动定位功能
 */

interface OutlineItem {
  id: string
  text: string
  level: number // 1-6 对应 h1-h6
}

// Mock数据（TODO: 从当前打开的Markdown文件提取）
const outlineItems = ref<OutlineItem[]>([])

const getMarker = (level: number): string => {
  return '#'.repeat(level)
}

const scrollToHeading = (id: string) => {
  console.log('Scroll to heading:', id)
  // TODO: 实现滚动到标题功能
}
</script>

<style scoped>
.outline-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.outline-header {
  height: 40px;
  min-height: 40px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-bottom: 1px solid var(--obsidian-border);
  background: var(--obsidian-bg-secondary);
  flex-shrink: 0;
}

.header-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--obsidian-text-primary);
}

.outline-body {
  flex: 1;
  overflow-y: auto;  /* ✅ 大纲可滚动 */
  padding: 8px 0;
  min-height: 0; /* 🔑 关键！ */
}

.outline-list {
  padding: 0 4px;
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
  background: var(--obsidian-hover-bg);
}

.item-marker {
  color: var(--obsidian-accent);
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
  color: var(--obsidian-text-primary);
}
</style>
