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
        @open-drawer="handleOpenDrawer"
      />
      
      <!-- 占位 -->
      <div v-else class="empty-content">
        <el-empty description="请选择一个标签页" />
      </div>
    </div>
    
    <!-- 🔥 对话框专用容器 - 避免被BrowserView覆盖 -->
    <div id="right-panel-dialog-container" class="dialog-container"></div>
    
    <!-- 🔥 抽屉组件 -->
    <RightDrawer
      v-model:visible="drawerVisible"
      :title="drawerTitle"
      :width="500"
      :min-width-percent="70"
    >
      <!-- 动态内容 - 传递 tabId -->
      <component :is="drawerContent" v-if="drawerContent" :tab-id="props.tabId" />
    </RightDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, type Component } from 'vue'
import { Pointer, Reading } from '@element-plus/icons-vue'
import DevToolsTabBar from './DevToolsTabBar.vue'
import ElementPickerPanel from './TabContents/ElementPickerPanel.vue'
import NovelScraperPanel from './TabContents/NovelScraperPanel.vue'
import RightDrawer from './RightDrawer.vue'
import SettingsContent from './DrawerContents/SettingsContent.vue'
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

// 抽屉状态
const drawerVisible = ref(false)
const drawerTitle = ref('抽屉')
const drawerContent = ref<Component | null>(null)

/**
 * 处理标签页点击
 */
const handleTabClick = (tabId: string): void => {
  activeTabId.value = tabId
  console.log('[RightPanel] Tab clicked:', tabId)
}

/**
 * 打开抽屉
 */
const handleOpenDrawer = (contentType: string): void => {
  console.log('[RightPanel] Opening drawer with content:', contentType)
  
  // 根据内容类型加载不同的组件
  switch (contentType) {
    case 'settings':
      drawerTitle.value = '设置'
      drawerContent.value = SettingsContent
      break
    // 可以添加更多内容类型
    default:
      drawerTitle.value = '未知内容'
      drawerContent.value = null
  }
  
  drawerVisible.value = true
}

onMounted(() => {
  console.log('[RightPanel] Mounted for tab:', props.tabId)
})
</script>

<style scoped lang="scss">
.right-panel {
  position: relative; // 建立定位上下文
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  // z-index: 10 移除 - splitter 需要更高 z-index，不应该被右侧面板遮挡
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

// 对话框容器
.dialog-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none; // 不阻止下层交互
  z-index: 1000;
  overflow: hidden; // 🔥 防止对话框溢出右栏
  
  // 允许对话框本身和遮罩层可交互
  :deep(.el-dialog),
  :deep(.el-overlay),
  :deep(.el-overlay-dialog) {
    pointer-events: auto;
  }
  
  // 🔥 确保遮罩层正确填充容器
  :deep(.el-overlay) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  // 🔥 对话框居中显示在容器内
  :deep(.el-overlay-dialog) {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
}
</style>

