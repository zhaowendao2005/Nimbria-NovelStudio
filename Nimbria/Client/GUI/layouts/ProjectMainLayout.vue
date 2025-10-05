<template>
  <div class="project-main-layout">
    <!-- 顶部窗口控制栏 -->
    <q-bar class="project-titlebar q-electron-drag">
      <div class="project-titlebar__left">
        <q-icon name="auto_stories" size="20px" class="q-mr-sm" />
        <span class="project-titlebar__title">Nimbria Project</span>
      </div>
      <q-space />
      <q-btn 
        flat 
        dense 
        round 
        size="sm" 
        icon="minimize" 
        @click="minimizeWindow" 
        class="q-electron-drag--exception project-titlebar__btn project-titlebar__btn--minimize" 
      />
      <q-btn 
        flat 
        dense 
        round 
        size="sm" 
        :icon="isMaximized ? 'crop_square' : 'check_box_outline_blank'" 
        @click="toggleMaximize" 
        class="q-electron-drag--exception project-titlebar__btn" 
      />
      <q-btn 
        flat 
        dense 
        round 
        size="sm" 
        icon="close" 
        @click="closeWindow" 
        class="q-electron-drag--exception project-titlebar__btn project-titlebar__btn--close" 
      />
    </q-bar>

    <!-- 主内容区：三栏布局 -->
    <el-container class="project-content">
      <!-- 左栏：导航+文件树 -->
      <el-aside v-show="showLeftPanel" :width="leftWidth" class="left-panel">
        <router-view name="left" />
      </el-aside>
      
      <!-- 左侧分隔器 -->
      <div 
        v-show="showLeftPanel"
        class="splitter left-splitter" 
        @mousedown="startDragLeft"
      ></div>
      
      <!-- 中栏：主内容区 -->
      <el-main class="center-panel">
        <router-view name="center" />
      </el-main>
      
      <!-- 右侧分隔器 -->
      <div 
        v-show="showRightPanel"
        class="splitter right-splitter" 
        @mousedown="startDragRight"
      ></div>
      
      <!-- 右栏：大纲 -->
      <el-aside v-show="showRightPanel" :width="rightWidth" class="right-panel">
        <router-view name="right" />
      </el-aside>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide, readonly } from 'vue'

/**
 * ProjectMainLayout
 * 项目页三栏布局容器
 * 职责：窗口控制栏 + 三栏容器 + 分隔器拖拽逻辑
 * 内容填充：由内联router控制（命名视图）
 */

// ==================== 窗口控制状态 ====================
const isMaximized = ref(false)

// 检查窗口是否最大化
onMounted(async () => {
  try {
    const nimbriaAPI = window.nimbria as any
    if (nimbriaAPI?.window?.isMaximized) {
      const result = await nimbriaAPI.window.isMaximized()
      isMaximized.value = !!result
    }
  } catch (error) {
    console.error('检查窗口状态失败:', error)
  }
})

// 最小化窗口
async function minimizeWindow() {
  try {
    const nimbriaAPI = window.nimbria as any
    if (nimbriaAPI?.window?.minimize) {
      await nimbriaAPI.window.minimize()
    }
  } catch (error) {
    console.error('窗口最小化失败:', error)
  }
}

// 切换最大化/还原
async function toggleMaximize() {
  try {
    const nimbriaAPI = window.nimbria as any
    if (isMaximized.value) {
      if (nimbriaAPI?.window?.unmaximize) {
        await nimbriaAPI.window.unmaximize()
        isMaximized.value = false
      }
    } else {
      if (nimbriaAPI?.window?.maximize) {
        await nimbriaAPI.window.maximize()
        isMaximized.value = true
      }
    }
  } catch (error) {
    console.error('切换窗口最大化失败:', error)
  }
}

// 关闭窗口
async function closeWindow() {
  try {
    const nimbriaAPI = window.nimbria as any
    if (nimbriaAPI?.window?.close) {
      await nimbriaAPI.window.close()
    }
  } catch (error) {
    console.error('窗口关闭失败:', error)
  }
}

// ==================== 面板宽度状态 ====================
const leftWidth = ref('328px')  // 48px导航 + 280px文件树
const rightWidth = ref('280px')

// ==================== 面板显示状态 ====================
const showLeftPanel = ref(true)
const showRightPanel = ref(true)

// 切换左侧面板
const toggleLeftPanel = (show?: boolean) => {
  showLeftPanel.value = show ?? !showLeftPanel.value
  console.log('左侧面板状态:', showLeftPanel.value)
}

// 切换右侧面板
const toggleRightPanel = (show?: boolean) => {
  showRightPanel.value = show ?? !showRightPanel.value
  console.log('右侧面板状态:', showRightPanel.value)
}

// ==================== 提供给子组件 ====================
// 提供只读状态，防止子组件直接修改
provide('showLeftPanel', readonly(showLeftPanel))
provide('showRightPanel', readonly(showRightPanel))
// 提供控制函数
provide('toggleLeftPanel', toggleLeftPanel)
provide('toggleRightPanel', toggleRightPanel)

// ==================== 拖拽状态 ====================
let isDragging = false
let dragType: 'left' | 'right' | null = null
let startX = 0
let startWidth = 0

// ==================== 左侧分隔器拖拽 ====================
const startDragLeft = (e: MouseEvent) => {
  isDragging = true
  dragType = 'left'
  startX = e.clientX
  startWidth = parseInt(leftWidth.value)
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  
  // 防止文本选中
  e.preventDefault()
}

// ==================== 右侧分隔器拖拽 ====================
const startDragRight = (e: MouseEvent) => {
  isDragging = true
  dragType = 'right'
  startX = e.clientX
  startWidth = parseInt(rightWidth.value)
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDrag)
  
  // 防止文本选中
  e.preventDefault()
}

// ==================== 拖拽处理 ====================
const handleDrag = (e: MouseEvent) => {
  if (!isDragging) return
  
  const deltaX = e.clientX - startX
  
  if (dragType === 'left') {
    // 左栏拖拽（向右增大，向左减小）
    const newWidth = Math.max(200, Math.min(600, startWidth + deltaX))
    leftWidth.value = `${newWidth}px`
  } else if (dragType === 'right') {
    // 右栏拖拽（向左增大，向右减小）
    const newWidth = Math.max(200, Math.min(600, startWidth - deltaX))
    rightWidth.value = `${newWidth}px`
  }
}

// ==================== 停止拖拽 ====================
const stopDrag = () => {
  isDragging = false
  dragType = null
  
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDrag)
}
</script>

<style scoped lang="scss">
@import './ProjectMainLayout.scss';
</style>
