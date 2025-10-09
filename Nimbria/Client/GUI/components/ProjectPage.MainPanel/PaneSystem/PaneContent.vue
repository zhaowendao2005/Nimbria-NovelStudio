<template>
  <div 
    class="pane-content"
    :class="{ 'is-focused': isFocused }"
    @click="handleClick"
  >
    <!-- 焦点指示器 -->
    <div v-if="isFocused" class="focus-indicator"></div>
    
    <!-- 内容区域：有标签页时显示 MarkdownTab -->
    <div v-if="currentTab" class="pane-main">
      <MarkdownTab 
        :tab-id="tabId!" 
        :pane-id="paneId"
      />
    </div>
    
    <!-- 空面板提示 -->
    <div v-else class="empty-pane">
      <el-empty 
        description="点击左侧文件树打开文件"
        :image-size="120"
      >
        <template #image>
          <el-icon :size="80" color="var(--obsidian-text-muted)">
            <Document />
          </el-icon>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'

/**
 * PaneContent
 * 叶子面板组件，显示实际的标签页内容
 * 
 * 功能：
 * - 显示焦点指示器
 * - 渲染 MarkdownTab 或空状态
 * - 处理焦点切换
 */

interface Props {
  paneId: string
  tabId: string | null
  isFocused?: boolean
}

const props = defineProps<Props>()

const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

/**
 * 当前标签页数据
 */
const currentTab = computed(() => {
  if (!props.tabId) return null
  return markdownStore.openTabs.find(t => t.id === props.tabId) || null
})

/**
 * 点击面板，设置焦点
 */
const handleClick = () => {
  if (!props.isFocused) {
    paneLayoutStore.setFocusedPane(props.paneId)
  }
}
</script>

<style scoped>
.pane-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--obsidian-bg-primary, #ffffff);
  border: 2px solid transparent;
  transition: border-color 0.2s;
  overflow: hidden;
}

.pane-content.is-focused {
  border-color: var(--obsidian-accent, #5b7fff);
}

/* 焦点指示器 */
.focus-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--obsidian-accent, #5b7fff) 0%,
    var(--obsidian-accent-light, #7b9fff) 100%
  );
  z-index: 100;
  animation: focus-pulse 2s ease-in-out infinite;
}

@keyframes focus-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 主内容区 */
.pane-main {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 空面板样式 */
.empty-pane {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--obsidian-bg-secondary, #f5f6f8);
}

:deep(.el-empty__description) {
  color: var(--obsidian-text-secondary, #6a6d74);
  font-size: 14px;
}
</style>

