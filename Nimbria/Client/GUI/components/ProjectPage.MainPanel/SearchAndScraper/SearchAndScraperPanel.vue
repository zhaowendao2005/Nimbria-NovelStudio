<template>
  <div ref="panelRef" class="search-and-scraper-panel">
    <!-- Toolbar -->
    <div ref="toolbarRef" class="toolbar">
      <div class="nav-buttons">
        <el-button
          :disabled="!navigationState.canGoBack"
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
      <el-splitter style="height: 100%;">
        <el-splitter-panel>
          <div ref="leftPanelRef" class="left-panel">
            <!-- 搜索栏（未搜索时垂直居中显示） -->
            <div v-if="!isBrowserViewVisible" class="search-container-wrapper">
            <div class="search-container">
              <!-- 搜索引擎选择 -->
              <el-dropdown @command="handleEngineSelect" trigger="click">
                <button class="engine-btn">
                  <span class="engine-icon">{{ currentEngine }}</span>
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="google">Google</el-dropdown-item>
                    <el-dropdown-item command="bing">Bing</el-dropdown-item>
                    <el-dropdown-item command="baidu">Baidu</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              
              <!-- 搜索框 -->
              <el-input
                v-model="searchQuery"
                placeholder="搜索..."
                clearable
                @keyup.enter="handleSearch"
                class="search-input"
              >
                <template #suffix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            </div>

            <!-- 🔥 BrowserView 占位区域（空白，BrowserView 会覆盖在这里） -->
            <div v-else ref="browserViewContainerRef" class="browserview-container"></div>
          </div>
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
import { Search, HomeFilled, ArrowLeft, ArrowRight, Loading } from '@element-plus/icons-vue'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import { SearchAndScraperService } from '@service/SearchAndScraper'
import type { NavigationChangedEvent, LoadingChangedEvent, LoadFailedEvent } from '@service/SearchAndScraper/types'

interface Props {
  tabId: string
}

const props = defineProps<Props>()
const searchAndScraperStore = useSearchAndScraperStore()

// ==================== 状态 ====================

const searchQuery = ref<string>('')
const currentEngine = ref<string>('G')
const isBrowserViewVisible = ref<boolean>(false)
const isViewCreated = ref<boolean>(false)
const isLoading = ref<boolean>(false)

// DOM 引用
const panelRef = ref<HTMLElement | null>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const leftPanelRef = ref<HTMLElement | null>(null)
const browserViewContainerRef = ref<HTMLElement | null>(null)

// 导航状态
const navigationState = ref({
  canGoBack: false,
  canGoForward: false,
  currentUrl: ''
})

// ==================== 方法 ====================

const handleEngineSelect = (command: string): void => {
  const engineMap: Record<string, string> = {
    google: 'G',
    bing: 'B',
    baidu: '百'
  }
  currentEngine.value = engineMap[command] ?? 'G'
  localStorage.setItem('search_engine', command)
}

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
  if (!leftPanelRef.value) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  // 使用左侧 splitter-panel 的实际位置和大小
  const leftPanelRect = leftPanelRef.value.getBoundingClientRect()
  
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
  console.log('[SearchAndScraper] Updated BrowserView bounds:', bounds)
}

const handleSearch = async (): Promise<void> => {
  if (!searchQuery.value.trim()) return
  
  const engine = localStorage.getItem('search_engine') || 'google'
  const url = getSearchUrl(searchQuery.value, engine)
  
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
    
    console.log('[SearchAndScraper] Searching:', searchQuery.value, 'URL:', url)
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
    console.log('[SearchAndScraper] Loading:', data.isLoading)
  }
}

/**
 * 处理加载失败事件
 */
const handleLoadFailed = (data: LoadFailedEvent): void => {
  if (data.tabId === props.tabId) {
    console.error('[SearchAndScraper] Failed to load:', data.url, data.errorCode, data.errorDescription)
    // 可以在这里显示错误提示
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

// ==================== 生命周期 ====================

onMounted(async (): Promise<void> => {
  searchAndScraperStore.initInstance(props.tabId)
  
  // 初始化 Session
  try {
    await SearchAndScraperService.initSession()
  } catch (error) {
    console.error('[SearchAndScraper] Failed to initialize session:', error)
  }
  
  // 恢复搜索引擎选择
  const saved = localStorage.getItem('search_engine')
  if (saved) {
    handleEngineSelect(saved)
  }
  
  // 监听导航变化（从主进程发来的事件）
  window.nimbria.searchScraper.onNavigationChanged(handleNavigationChanged)
  window.nimbria.searchScraper.onLoadingChanged(handleLoadingChanged)
  window.nimbria.searchScraper.onLoadFailed(handleLoadFailed)
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

onUnmounted(async (): Promise<void> => {
  window.removeEventListener('resize', handleResize)
  
  // 销毁 BrowserView
  if (isViewCreated.value) {
    try {
      await SearchAndScraperService.destroyView(props.tabId)
      console.log('[SearchAndScraper] BrowserView destroyed for tab:', props.tabId)
    } catch (error) {
      console.error('[SearchAndScraper] Failed to destroy BrowserView:', error)
    }
  }
  
  searchAndScraperStore.removeInstance(props.tabId)
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

// 左侧面板
.left-panel {
  width: 100%;
  height: 100%;
  position: relative;
}

// 搜索栏容器（垂直居中）
.search-container-wrapper {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.search-container {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 600px;
}

.engine-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  
  &:hover {
    background: var(--el-fill-color);
    border-color: var(--el-color-primary);
  }
  
  .engine-icon {
    font-size: 16px;
    font-weight: bold;
  }
}

.search-input {
  flex: 1;
  
  :deep(.el-input__wrapper) {
    border-radius: 20px;
    padding: 0 16px;
    height: 40px;
  }
}

// BrowserView 容器（占位）
.browserview-container {
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-lighter);
  position: relative;
}

// 右侧面板
.right-panel {
  width: 100%;
  height: 100%;
  background: var(--el-bg-color-page);
  overflow-y: auto;
}
</style>
