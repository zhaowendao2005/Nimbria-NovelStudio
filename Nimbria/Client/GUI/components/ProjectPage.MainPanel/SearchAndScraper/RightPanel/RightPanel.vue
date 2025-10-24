<template>
  <div class="right-panel">
    <!-- Tab标签栏 -->
    <DevToolsTabBar
      :tabs="tabs"
      :active-tab-id="activeTabId"
      @tab-click="handleTabClick"
    />
    
    <!-- Tab内容区域 -->
    <div class="tab-content">
      <!-- 暂时为空，后续添加内容 -->
      <div class="empty-content">
        <el-empty description="功能开发中" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DevToolsTabBar from './DevToolsTabBar.vue'
import type { TabItem } from './types'

/**
 * RightPanel 组件
 * SearchAndScraper的右侧面板，采用Chrome DevTools风格
 */

interface Props {
  tabId: string // 关联的SearchAndScraper标签页ID
}

defineProps<Props>()

// 标签页配置（暂时为空，后续添加）
const tabs = ref<TabItem[]>([])
const activeTabId = ref<string>('')

/**
 * 处理标签页点击
 */
const handleTabClick = (tabId: string): void => {
  activeTabId.value = tabId
  console.log('[RightPanel] Tab clicked:', tabId)
}
</script>

<style scoped lang="scss">
.right-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.tab-content {
  flex: 1;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

.empty-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>

