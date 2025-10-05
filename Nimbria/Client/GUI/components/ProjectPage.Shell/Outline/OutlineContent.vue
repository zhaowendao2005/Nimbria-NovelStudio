<template>
  <div class="outline-content">
    <!-- 右侧面板标题栏（带关闭按钮） -->
    <div class="panel-header">
      <span class="panel-title">大纲</span>
      <el-button class="panel-close-btn" link @click="handleClose">
        <el-icon><Close /></el-icon>
      </el-button>
    </div>
    
    <!-- 大纲内容 -->
    <div class="panel-content">
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
  </div>
</template>

<script setup lang="ts">
import { ref, inject } from 'vue'
import { Close } from '@element-plus/icons-vue'

/**
 * OutlineContent
 * 大纲面板（完整版）
 * 包含：标题栏、关闭按钮、大纲内容
 * TODO: 实现自动提取Markdown标题、滚动定位功能
 */

interface OutlineItem {
  id: string
  text: string
  level: number // 1-6 对应 h1-h6
}

// Mock数据（TODO: 从当前打开的Markdown文件提取）
const outlineItems = ref<OutlineItem[]>([])

// ==================== 关闭面板 ====================
// 注入右侧面板控制函数
const toggleRightPanel = inject<(show?: boolean) => void>('toggleRightPanel')

const handleClose = () => {
  console.log('关闭右侧大纲面板')
  if (toggleRightPanel) {
    toggleRightPanel(false)
  } else {
    console.warn('未找到 toggleRightPanel 函数')
  }
}

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
/* ==================== 容器 ==================== */
.outline-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 右侧面板标题栏 ==================== */
.panel-header {
  height: 40px;
  min-height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--obsidian-border);
  background: var(--obsidian-bg-secondary);
  flex-shrink: 0;
  
  .panel-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--obsidian-text-primary);
    font-family: 'Segoe UI', sans-serif;
  }
  
  .panel-close-btn {
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    padding: 0 !important;
    border-radius: 4px !important;
    color: var(--obsidian-text-secondary) !important;
    
    .el-icon {
      font-size: 14px;
    }
    
    &:hover {
      background-color: var(--obsidian-hover-bg) !important;
      color: var(--obsidian-text-primary) !important;
    }
  }
}

/* ==================== 大纲内容区 ==================== */
.panel-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  min-height: 0; /* 🔑 关键！允许flex压缩 */
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
