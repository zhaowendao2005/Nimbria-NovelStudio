<template>
  <div class="detached-page">
    <!-- 🔥 自定义标题栏 -->
    <DetachedWindowTitleBar :title="windowTitle" />
    
    <!-- 只渲染MainPanel，无左栏、无右栏 -->
    <div class="full-content">
      <!-- 🔥 自动保存指示器 -->
      <AutoSaveIndicator v-if="markdownStore.openTabs.length > 0" />
      
      <!-- 🔥 分屏系统 -->
      <div class="pane-system-container">
        <PaneContainer :node="paneLayoutStore.paneTree" />
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
    
    // 3. 初始化编辑器状态：在 PaneSystem 中创建面板并打开该标签页
    if (tabData.filePath) {
      // 延迟加载文件，确保 Store 已初始化
      await new Promise(resolve => setTimeout(resolve, 300))
      
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
</style>

