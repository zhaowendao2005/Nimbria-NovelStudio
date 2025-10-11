<template>
  <q-bar class="detached-titlebar q-electron-drag">
    <div class="detached-titlebar__left">
      <q-icon name="auto_stories" size="20px" class="q-mr-sm" />
      <span class="detached-titlebar__title">{{ title || 'Nimbria' }}</span>
    </div>
    <q-space />
    <q-btn 
      flat 
      dense 
      round 
      size="sm" 
      icon="minimize" 
      @click="minimizeWindow" 
      class="q-electron-drag--exception detached-titlebar__btn detached-titlebar__btn--minimize" 
    />
    <q-btn 
      flat 
      dense 
      round 
      size="sm" 
      :icon="isMaximized ? 'crop_square' : 'check_box_outline_blank'" 
      @click="toggleMaximize" 
      class="q-electron-drag--exception detached-titlebar__btn" 
    />
    <q-btn 
      flat 
      dense 
      round 
      size="sm" 
      icon="close" 
      @click="closeWindow" 
      class="q-electron-drag--exception detached-titlebar__btn detached-titlebar__btn--close" 
    />
  </q-bar>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

/**
 * DetachedWindowTitleBar
 * 分离窗口专用标题栏组件
 * 
 * 特点：
 * - 直接通过 IPC 操作当前窗口（不依赖 WindowManager）
 * - 使用 detached-window:* 频道确保操作分离窗口
 * - 支持拖动、最小化、最大化、关闭
 */

interface Props {
  title?: string
}

interface NimbriaWithEvents {
  send?: (channel: string, ...args: unknown[]) => void
  on?: (channel: string, callback: (...args: unknown[]) => void) => void
}

defineProps<Props>()

const isMaximized = ref(false)

// 检查窗口是否最大化
onMounted(() => {
  try {
    // 🔥 使用专用频道查询当前窗口状态
    const nimbriaApi = window.nimbria as unknown as NimbriaWithEvents
    if (nimbriaApi?.send && nimbriaApi?.on) {
      // 监听最大化状态响应
      nimbriaApi.on('detached-window:maximized-state', (maximized: unknown) => {
        isMaximized.value = !!maximized
      })
      
      // 请求当前状态
      nimbriaApi.send('detached-window:query-maximized')
    }
  } catch (error) {
    console.error('[DetachedTitleBar] Failed to check window state:', error)
  }
})

// 最小化窗口
function minimizeWindow() {
  try {
    const nimbriaApi = window.nimbria as unknown as NimbriaWithEvents
    if (nimbriaApi?.send) {
      nimbriaApi.send('detached-window:minimize')
      console.log('🔽 [DetachedTitleBar] Minimize command sent')
    }
  } catch (error) {
    console.error('[DetachedTitleBar] Minimize failed:', error)
  }
}

// 切换最大化/还原
function toggleMaximize() {
  try {
    const nimbriaApi = window.nimbria as unknown as NimbriaWithEvents
    if (nimbriaApi?.send) {
      if (isMaximized.value) {
        nimbriaApi.send('detached-window:unmaximize')
        console.log('🔲 [DetachedTitleBar] Unmaximize command sent')
      } else {
        nimbriaApi.send('detached-window:maximize')
        console.log('🔳 [DetachedTitleBar] Maximize command sent')
      }
      isMaximized.value = !isMaximized.value
    }
  } catch (error) {
    console.error('[DetachedTitleBar] Toggle maximize failed:', error)
  }
}

// 关闭窗口
function closeWindow() {
  try {
    const nimbriaApi = window.nimbria as unknown as NimbriaWithEvents
    if (nimbriaApi?.send) {
      nimbriaApi.send('detached-window:close')
      console.log('❌ [DetachedTitleBar] Close command sent')
    }
  } catch (error) {
    console.error('[DetachedTitleBar] Close failed:', error)
  }
}
</script>

<style scoped lang="scss">
.detached-titlebar {
  height: 32px;
  background: var(--obsidian-background-primary);
  border-bottom: 1px solid var(--obsidian-background-modifier-border);
  display: flex;
  align-items: center;
  padding: 0 8px;
  flex-shrink: 0;
  user-select: none;
  -webkit-app-region: drag;

  &__left {
    display: flex;
    align-items: center;
    color: var(--obsidian-text-normal);
    font-size: 13px;
    font-weight: 500;
  }

  &__title {
    font-size: 13px;
    color: var(--obsidian-text-normal);
  }

  &__btn {
    -webkit-app-region: no-drag;
    color: var(--obsidian-text-muted);
    transition: all 0.2s;
    
    &:hover {
      background: var(--obsidian-background-modifier-hover);
      color: var(--obsidian-text-normal);
    }

    &--minimize:hover {
      background: var(--obsidian-background-modifier-hover);
    }

    &--close:hover {
      background: #e81123;
      color: white;
    }
  }
}

/* Quasar 拖拽类名支持 */
:deep(.q-electron-drag) {
  -webkit-app-region: drag;
}

:deep(.q-electron-drag--exception) {
  -webkit-app-region: no-drag;
}
</style>

