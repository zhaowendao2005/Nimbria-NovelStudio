<template>
  <div class="detached-page">
    <!-- 🔥 自定义标题栏 -->
    <DetachedWindowTitleBar :title="windowTitle" />
    
    <!-- 只渲染MainPanel，无左栏、无右栏 -->
    <div class="full-content">
      <!-- 🔥 自动保存指示器 -->
      <AutoSaveIndicator v-if="markdownStore.openTabs.length > 0" />
      
      <!-- 🔥 分屏系统（有面板时显示） -->
      <div v-if="paneLayoutStore.hasPanes" class="pane-system-container">
        <PaneContainer :node="paneLayoutStore.paneTree!" />
      </div>
      
      <!-- 🔥 加载中/空状态 -->
      <div v-else class="loading-container">
        <div class="loading-content">
          <q-spinner-dots size="50px" color="primary" />
          <p>正在初始化编辑器...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMarkdownStore } from '@stores/projectPage/Markdown'
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'
import PaneContainer from '@components/ProjectPage.MainPanel/PaneSystem/PaneContainer.vue'
import AutoSaveIndicator from '@components/ProjectPage.MainPanel/AutoSave/AutoSaveIndicator.vue'
import DetachedWindowTitleBar from '@components/Shared/DetachedWindowTitleBar.vue'

/**
 * ProjectPage.DetachedPage
 * 标签页拆分到新窗口的页面
 * 
 * 功能：
 * - 只显示MainPanel（PaneSystem），无左侧栏、无右侧栏
 * - 从URL参数恢复标签页数据
 * - 与母窗口握手关闭源标签
 * - 支持命令面板操作（复用现有系统）
 */

const route = useRoute()
const markdownStore = useMarkdownStore()
const paneLayoutStore = usePaneLayoutStore()

const transferId = ref<string>('')
const projectPath = ref<string>('')
const windowTitle = ref<string>('Nimbria - Detached Window')

onMounted(async () => {
  console.log('🚀 [DetachedPage] Initializing detached window...')
  
  // 1. 解析URL参数
  const params = route.query
  const isNewWindow = params.newWindow === 'true'
  const uiMode = params.ui || 'full'
  transferId.value = params.transferId as string
  projectPath.value = params.projectPath as string
  const tabDataStr = params.tabData as string
  
  console.log('📋 [DetachedPage] URL Parameters:', {
    isNewWindow,
    uiMode,
    transferId: transferId.value,
    projectPath: projectPath.value
  })
  
  if (!isNewWindow || uiMode !== 'minimal') {
    console.error('❌ [DetachedPage] Invalid parameters')
    return
  }
  
  // 2. 解析标签页数据
  try {
    const tabData = JSON.parse(decodeURIComponent(tabDataStr))
    console.log('📄 [DetachedPage] Tab data:', tabData)
    
    // 设置窗口标题
    windowTitle.value = tabData.title || 'Nimbria - Detached Window'
    document.title = windowTitle.value
    
    // 3. 根据标签页类型初始化
    // 延迟加载，确保 Store 已初始化
    await new Promise(resolve => setTimeout(resolve, 300))
    
    if (tabData.tabType === 'starchart') {
      // 🔥 StarChart 类型：恢复 Store 状态并打开视图
      console.log('🌟 [DetachedPage] Restoring StarChart tab...')
      
      // 导入 StarChart 相关模块
      const { CustomPageAPI } = await import('../../Service/CustomPageManager')
      const { useStarChartStore, useStarChartConfigStore } = await import('@stores/projectPage/starChart')
      const starChartStore = useStarChartStore()
      const configStore = useStarChartConfigStore()
      
      // 恢复 Store 状态
      if (tabData.storeState) {
        const startTime = performance.now()
        console.log('⚡ [极速重建] 开始恢复StarChart状态...')
        console.log('📊 [DetachedPage] Restoring StarChart state:', tabData.storeState)
        
        // 🚀 启用快速重建模式
        starChartStore.fastRebuild = tabData.storeState.fastRebuild || true
        
        // 恢复图表数据
        starChartStore.cytoscapeElements = tabData.storeState.cytoscapeElements || []
        starChartStore.layoutConfig = tabData.storeState.layoutConfig || { name: 'preset' }
        starChartStore.viewportState = tabData.storeState.viewport || { zoom: 1, pan: { x: 0, y: 0 } }
        starChartStore.initialized = tabData.storeState.initialized || false
        
        // 🔥 恢复配置状态（配置面板的所有设置）
        if (tabData.storeState.chartConfig) {
          console.log('⚙️ [DetachedPage] Restoring StarChart config:', tabData.storeState.chartConfig)
          configStore.config = tabData.storeState.chartConfig
          // currentPreset 从配置中读取（不是单独的属性）
          console.log('✅ [DetachedPage] StarChart config restored')
        }
        
        const elapsed = performance.now() - startTime
        console.log(`⚡ [极速重建] 状态恢复完成，耗时: ${elapsed.toFixed(2)}ms`)
        console.log('✅ [DetachedPage] StarChart state restored')
      }
      
      // 打开 StarChart 页面
      const focusedPaneId = paneLayoutStore.focusedPane?.id
      if (focusedPaneId) {
        const instance = await CustomPageAPI.open('starchart-view', {
          focus: true,
          paneId: focusedPaneId
        })
        
        if (instance) {
          console.log('✅ [DetachedPage] StarChart tab opened:', instance.tabId)
        } else {
          console.error('❌ [DetachedPage] Failed to open StarChart tab')
        }
      } else {
        console.error('❌ [DetachedPage] No focused pane available')
      }
    } else if (tabData.filePath) {
      // 🔥 文件类型（Markdown等）：打开文件
      console.log('📝 [DetachedPage] Restoring file tab:', tabData.filePath)
      
      // 🔥 步骤1：通过 markdownStore 打开文件（创建或获取 tab）
      const tab = await markdownStore.openFile(tabData.filePath)
      console.log('✅ [DetachedPage] File opened:', tabData.filePath, 'tab:', tab?.id)
      
      // 🔥 步骤2：将 tab 添加到焦点 pane 中（关键步骤！）
      if (tab && paneLayoutStore.focusedPane) {
        const paneId = paneLayoutStore.focusedPane.id
        paneLayoutStore.openTabInPane(paneId, tab.id)
        console.log('✅ [DetachedPage] Tab added to pane:', { paneId, tabId: tab.id })
      } else {
        console.error('❌ [DetachedPage] Failed to add tab to pane:', { 
          hasTab: !!tab, 
          hasFocusedPane: !!paneLayoutStore.focusedPane 
        })
      }
    } else {
      console.warn('⚠️ [DetachedPage] Unknown tab type or missing data')
    }
    
    // 4. 发送就绪事件（触发握手）
    setTimeout(() => {
      // 🔥 使用类型断言避免类型冲突（filesystem.d.ts覆盖了类型）
      interface NimbriaWithEvents {
        send?: (channel: string, ...args: unknown[]) => void
      }
      const nimbriaApi = window.nimbria as unknown as NimbriaWithEvents
      if (nimbriaApi?.send) {
        nimbriaApi.send('project:detached-ready', { transferId: transferId.value })
        console.log('📨 [DetachedPage] Ready signal sent, transferId:', transferId.value)
      } else {
        console.warn('⚠️ [DetachedPage] nimbria.send not available')
      }
    }, 1000)
    
  } catch (error) {
    console.error('❌ [DetachedPage] Failed to parse tab data:', error)
  }
  
  console.log('✅ [DetachedPage] Initialization complete')
})

onUnmounted(() => {
  console.log('👋 [DetachedPage] Detached window closing')
})
</script>

<style scoped lang="scss">
.detached-page {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--obsidian-bg-primary, #ffffff);
  overflow: hidden;
}

.full-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 确保PaneSystem容器正确布局 */
.pane-system-container {
  flex: 1;
  flex-shrink: 0;
  height: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 确保自动保存指示器正确显示 */
:deep(.auto-save-indicator) {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
}

/* 加载状态容器 */
.loading-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--obsidian-bg-primary, #ffffff);
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  
  p {
    color: var(--obsidian-text-muted, #6c757d);
    font-size: 14px;
    margin: 0;
  }
}
</style>

