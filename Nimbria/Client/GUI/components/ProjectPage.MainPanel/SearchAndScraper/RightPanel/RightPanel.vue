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
      <!-- 选取工具 -->
      <ElementPickerPanel
        v-if="activeTabId === 'element-picker'"
        :tab-id="props.tabId"
      />
      
      <!-- 小说爬取 -->
      <NovelScraperPanel
        v-else-if="activeTabId === 'novel-scraper'"
        :tab-id="props.tabId"
      />
      
      <!-- 占位 -->
      <div v-else class="empty-content">
        <el-empty description="请选择一个标签页" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Pointer, Reading } from '@element-plus/icons-vue'
import DevToolsTabBar from './DevToolsTabBar.vue'
import ElementPickerPanel from './TabContents/ElementPickerPanel.vue'
import NovelScraperPanel from './TabContents/NovelScraperPanel.vue'
import type { TabItem } from './types'

/**
 * RightPanel 组件
 * SearchAndScraper的右侧面板，采用Chrome DevTools风格
 */

interface Props {
  tabId: string // 关联的SearchAndScraper标签页ID
}

const props = defineProps<Props>()

// 标签页配置
const tabs = ref<TabItem[]>([
  // 第一组：选取工具
  {
    id: 'element-picker',
    label: '选取工具',
    icon: Pointer,
    groupStart: false
  },
  // 第二组：小说爬取
  {
    id: 'novel-scraper',
    label: '小说',
    icon: Reading,
    groupStart: true // 显示分割线
  }
])

const activeTabId = ref<string>('element-picker')

/**
 * 处理标签页点击
 */
const handleTabClick = (tabId: string): void => {
  activeTabId.value = tabId
  console.log('[RightPanel] Tab clicked:', tabId)
}

onMounted(() => {
  console.log('[RightPanel] Mounted for tab:', props.tabId)
})
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

