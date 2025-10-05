<template>
  <div class="project-main-layout">
    <el-container>
      <!-- 左栏：导航+文件树 -->
      <el-aside :width="leftWidth" class="left-panel">
        <router-view name="left" />
      </el-aside>
      
      <!-- 左侧分隔器 -->
      <div 
        class="splitter left-splitter" 
        @mousedown="startDragLeft"
      ></div>
      
      <!-- 中栏：主内容区 -->
      <el-main class="center-panel">
        <router-view name="center" />
      </el-main>
      
      <!-- 右侧分隔器 -->
      <div 
        class="splitter right-splitter" 
        @mousedown="startDragRight"
      ></div>
      
      <!-- 右栏：大纲 -->
      <el-aside :width="rightWidth" class="right-panel">
        <router-view name="right" />
      </el-aside>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * ProjectMainLayout
 * 项目页三栏布局容器
 * 职责：只负责三栏容器 + 分隔器拖拽逻辑
 * 内容填充：由内联router控制（命名视图）
 */

// ==================== 面板宽度状态 ====================
const leftWidth = ref('328px')  // 48px导航 + 280px文件树
const rightWidth = ref('280px')

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
