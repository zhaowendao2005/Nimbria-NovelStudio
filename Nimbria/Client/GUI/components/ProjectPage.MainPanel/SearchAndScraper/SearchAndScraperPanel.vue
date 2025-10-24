<template>
  <div ref="panelRef" class="search-and-scraper-panel">
    <!-- Toolbar -->
    <div ref="toolbarRef" class="toolbar">
      <div class="nav-buttons">
        <el-button
          :disabled="!isBrowserViewVisible"
          :icon="HomeFilled"
          circle
          size="small"
          @click="handleHome"
        />
        <el-button
          :disabled="!navigationState.canGoBack"
          :icon="ArrowLeft"
          circle
          size="small"
          @click="handleGoBack"
        />
        <el-button
          :disabled="!navigationState.canGoForward"
          :icon="ArrowRight"
          circle
          size="small"
          @click="handleGoForward"
        />
      </div>
      
      <!-- 当 BrowserView 可见时，显示当前 URL -->
      <div v-if="isBrowserViewVisible" class="url-display">
        <el-icon v-if="isLoading" class="is-loading"><Loading /></el-icon>
        <el-text truncated>{{ navigationState.currentUrl }}</el-text>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <el-splitter style="height: 100%;" @resize="handleSplitterResize">
        <el-splitter-panel>
          <LeftPanel
            ref="leftPanelRef"
            :is-browser-view-visible="isBrowserViewVisible"
            :search-query="searchQuery"
            @update:search-query="searchQuery = $event"
            @search="handleSearch"
          />
        </el-splitter-panel>

        <!-- 右侧面板 -->
        <el-splitter-panel :min-size="20">
          <div class="right-panel"></div>
        </el-splitter-panel>
      </el-splitter>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { HomeFilled, ArrowLeft, ArrowRight, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import { SearchAndScraperService } from '@service/SearchAndScraper'
import type { NavigationChangedEvent, LoadingChangedEvent, LoadFailedEvent } from '@service/SearchAndScraper/types'
import LeftPanel from './LeftContent/LeftPanel.vue'

// 配置 NProgress
NProgress.configure({ 
  showSpinner: false,  // 不显示右上角的旋转图标
  parent: '.search-and-scraper-panel',  // 挂载到当前组件
  trickleSpeed: 200,  // 自动增长速度
  minimum: 0.08  // 最小百分比
})

interface Props {
  tabId: string
}

const props = defineProps<Props>()
const searchAndScraperStore = useSearchAndScraperStore()

// ==================== 状态 ====================

const searchQuery = ref<string>('')
const isBrowserViewVisible = ref<boolean>(false)
const isViewCreated = ref<boolean>(false)
const isLoading = ref<boolean>(false)

// DOM 引用
const panelRef = ref<HTMLElement | null>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const leftPanelRef = ref<InstanceType<typeof LeftPanel> | null>(null)

// ResizeObserver
let resizeObserver: ResizeObserver | null = null

// 导航状态
const navigationState = ref({
  canGoBack: false,
  canGoForward: false,
  currentUrl: ''
})

// ==================== 方法 ====================

const getSearchUrl = (query: string, engine: string): string => {
  const engineUrls = {
    google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
    baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`
  } as const
  return (engineUrls[engine as keyof typeof engineUrls] || engineUrls.google) as string
}

/**
 * 计算 BrowserView 的 bounds
 */
const calculateBrowserViewBounds = (): { x: number; y: number; width: number; height: number } => {
  if (!leftPanelRef.value?.panelRef) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  // 使用左侧 panel 的实际位置和大小
  const leftPanelRect = leftPanelRef.value.panelRef.getBoundingClientRect()
  
  return {
    x: Math.round(leftPanelRect.x),
    y: Math.round(leftPanelRect.y),
    width: Math.round(leftPanelRect.width),
    height: Math.round(leftPanelRect.height)
  }
}

/**
 * 更新 BrowserView 的位置和大小
 */
const updateBrowserViewBounds = async (): Promise<void> => {
  if (!isBrowserViewVisible.value || !isViewCreated.value) return
  
  const bounds = calculateBrowserViewBounds()
  await SearchAndScraperService.showView(props.tabId, bounds)
  // 日志太频繁，注释掉避免污染控制台
  // console.log('[SearchAndScraper] Updated BrowserView bounds:', bounds)
}

const handleSearch = async (query: string, engine: string): Promise<void> => {
  if (!query.trim()) return
  
  const url = getSearchUrl(query, engine)
  
  try {
    // 创建 BrowserView（如果还未创建）
    if (!isViewCreated.value) {
      await SearchAndScraperService.createView(props.tabId)
      isViewCreated.value = true
      console.log('[SearchAndScraper] BrowserView created for tab:', props.tabId)
    }
    
    // 显示 BrowserView 容器
    isBrowserViewVisible.value = true
    
    // 等待 DOM 更新
    await nextTick()
    
    // 计算并显示 BrowserView
    const bounds = calculateBrowserViewBounds()
    await SearchAndScraperService.showView(props.tabId, bounds)
    
    // 加载 URL
    await SearchAndScraperService.loadURL(props.tabId, url)
    
    // 更新导航状态
    await refreshNavigationState()
    
    console.log('[SearchAndScraper] Searching:', query, 'URL:', url)
  } catch (error) {
    console.error('[SearchAndScraper] Failed to search:', error)
  }
}

const handleHome = async (): Promise<void> => {
  try {
    // 隐藏 BrowserView
    await SearchAndScraperService.hideView(props.tabId)
    isBrowserViewVisible.value = false
    searchQuery.value = ''
    
    // 重置导航状态
    navigationState.value = {
      canGoBack: false,
      canGoForward: false,
      currentUrl: ''
    }
    
    console.log('[SearchAndScraper] Back to home')
  } catch (error) {
    console.error('[SearchAndScraper] Failed to go home:', error)
  }
}

const handleGoBack = async (): Promise<void> => {
  if (!navigationState.value.canGoBack) return
  
  try {
    await SearchAndScraperService.goBack(props.tabId)
    await refreshNavigationState()
  } catch (error) {
    console.error('[SearchAndScraper] Failed to go back:', error)
  }
}

const handleGoForward = async (): Promise<void> => {
  if (!navigationState.value.canGoForward) return
  
  try {
    await SearchAndScraperService.goForward(props.tabId)
    await refreshNavigationState()
  } catch (error) {
    console.error('[SearchAndScraper] Failed to go forward:', error)
  }
}

/**
 * 刷新导航状态
 */
const refreshNavigationState = async (): Promise<void> => {
  try {
    const state = await SearchAndScraperService.getNavigationState(props.tabId)
    navigationState.value = state
  } catch (error) {
    console.error('[SearchAndScraper] Failed to refresh navigation state:', error)
  }
}

/**
 * 处理导航变化事件
 */
const handleNavigationChanged = (data: NavigationChangedEvent): void => {
  if (data.tabId === props.tabId) {
    navigationState.value = {
      canGoBack: data.canGoBack,
      canGoForward: data.canGoForward,
      currentUrl: data.url
    }
    console.log('[SearchAndScraper] Navigation changed:', data.url)
  }
}

/**
 * 处理加载状态变化事件
 */
const handleLoadingChanged = (data: LoadingChangedEvent): void => {
  if (data.tabId === props.tabId) {
    isLoading.value = data.isLoading
    
    // 控制进度条
    if (data.isLoading) {
      NProgress.start()  // 开始加载，进度条快速到达30%，然后慢慢增长
    } else {
      NProgress.done()  // 加载完成，进度条快速到达100%并消失
    }
    
    console.log('[SearchAndScraper] Loading:', data.isLoading)
  }
}

/**
 * 处理加载失败事件
 */
const handleLoadFailed = async (data: LoadFailedEvent): Promise<void> => {
  if (data.tabId === props.tabId) {
    console.error('[SearchAndScraper] Failed to load:', data.url, data.errorCode, data.errorDescription)
    
    // 停止进度条
    NProgress.done()
    
    // 刷新导航状态，确保后退按钮可用
    await refreshNavigationState()
    
    // 显示错误提示
    const hasHistory = navigationState.value.canGoBack
    const msg = hasHistory
      ? `页面加载失败：${data.errorDescription}。您可以点击回退按钮返回上一页，或点击Home按钮返回搜索页面。`
      : `页面加载失败：${data.errorDescription}。您可以点击Home按钮返回搜索页面。`
    // @ts-expect-error - ElMessage类型定义问题，运行时正常
    ElMessage.error({ message: msg })
  }
}

/**
 * 窗口大小调整处理
 */
const handleResize = (): void => {
  if (isBrowserViewVisible.value && isViewCreated.value) {
    updateBrowserViewBounds().catch(error => {
      console.error('[SearchAndScraper] Failed to update bounds on resize:', error)
    })
  }
}

/**
 * Splitter大小调整处理
 */
const handleSplitterResize = (): void => {
  handleResize()
}

// ==================== 生命周期 ====================

onMounted(async (): Promise<void> => {
  const state = searchAndScraperStore.initInstance(props.tabId)
  
  // 🔥 从 store 恢复状态
  isViewCreated.value = state.isViewCreated
  isBrowserViewVisible.value = state.isBrowserViewVisible
  searchQuery.value = state.searchQuery
  navigationState.value.currentUrl = state.currentUrl
  
  // 初始化 Session
  try {
    await SearchAndScraperService.initSession()
  } catch (error) {
    console.error('[SearchAndScraper] Failed to initialize session:', error)
  }
  
  // 监听导航变化（从主进程发来的事件）
  window.nimbria.searchScraper.onNavigationChanged(handleNavigationChanged)
  window.nimbria.searchScraper.onLoadingChanged(handleLoadingChanged)
  window.nimbria.searchScraper.onLoadFailed((data) => {
    void handleLoadFailed(data)
  })
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize as EventListener)
  
  // 🔥 监听左侧面板的大小变化（使用ResizeObserver）
  if (leftPanelRef.value?.panelRef) {
    resizeObserver = new ResizeObserver(() => {
      if (isBrowserViewVisible.value && isViewCreated.value) {
        updateBrowserViewBounds().catch(error => {
          console.error('[SearchAndScraper] Failed to update bounds on panel resize:', error)
        })
      }
    })
    resizeObserver.observe(leftPanelRef.value.panelRef)
    console.log('[SearchAndScraper] ResizeObserver attached to left panel')
  }
  
  // 🔥 如果已有 BrowserView，恢复显示
  if (isViewCreated.value && isBrowserViewVisible.value) {
    await nextTick()
    await updateBrowserViewBounds()
    console.log('[SearchAndScraper] BrowserView restored for tab:', props.tabId)
  }
})

onUnmounted(async (): Promise<void> => {
  window.removeEventListener('resize', handleResize)
  
  // 🔥 断开ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
    console.log('[SearchAndScraper] ResizeObserver disconnected')
  }
  
  // 🔥 保存状态到 store
  searchAndScraperStore.updateInstance(props.tabId, {
    isViewCreated: isViewCreated.value,
    isBrowserViewVisible: isBrowserViewVisible.value,
    searchQuery: searchQuery.value,
    currentUrl: navigationState.value.currentUrl
  })
  
  // 🔥 标签页切换时，只隐藏 BrowserView，不销毁
  // 保持浏览状态，只有真正关闭标签页时才销毁（通过 markdown.store 的清理机制）
  if (isViewCreated.value && isBrowserViewVisible.value) {
    try {
      await SearchAndScraperService.hideView(props.tabId)
      console.log('[SearchAndScraper] BrowserView hidden for tab:', props.tabId)
    } catch (error) {
      console.error('[SearchAndScraper] Failed to hide BrowserView:', error)
    }
  }
  
  console.log('[SearchAndScraper] Component unmounted for tab:', props.tabId, ', state saved')
})

// 监听容器大小变化
watch([leftPanelRef, toolbarRef], () => {
  if (isBrowserViewVisible.value && isViewCreated.value) {
    updateBrowserViewBounds().catch(error => {
      console.error('[SearchAndScraper] Failed to update bounds on watch:', error)
    })
  }
})
</script>

<style scoped lang="scss">
.search-and-scraper-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: var(--el-bg-color-page);
}

// Toolbar
.toolbar {
  height: 50px;
  min-height: 50px;
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  background: var(--el-bg-color);
}

.nav-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.url-display {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  
  .is-loading {
    animation: rotating 2s linear infinite;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 内容区域
.content-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

// 右侧面板
.right-panel {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
  overflow-y: auto;
}

// ==================== NProgress 样式覆盖 ====================
// 自定义进度条样式，使其更像 Chrome/Edge
:deep(#nprogress) {
  pointer-events: none;
  
  .bar {
    background: var(--el-color-primary) !important;  // 使用主题色
    position: fixed;
    z-index: 9999;
    top: 50px;  // toolbar的高度
    left: 0;
    width: 100%;
    height: 3px;  // 稍微粗一点，更明显
  }
  
  .peg {
    display: block;
    position: absolute;
    right: 0px;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px var(--el-color-primary), 0 0 5px var(--el-color-primary);
    opacity: 1;
    transform: rotate(3deg) translate(0px, -4px);
  }
}
</style>
