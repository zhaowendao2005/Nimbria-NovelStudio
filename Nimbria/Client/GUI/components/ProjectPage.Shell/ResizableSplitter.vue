<template>
  <div
    class="resizable-splitter"
    :class="{ 'is-dragging': isDragging }"
    @mousedown="handleMouseDown"
    @touchstart="handleTouchStart"
  >
    <div class="splitter-handle">
      <div class="splitter-line"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

interface Props {
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  minWidth: 280,
  maxWidth: 600,
  defaultWidth: 328
})

const emit = defineEmits<{
  resize: [width: number]
  resizeEnd: [width: number]
}>()

const isDragging = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  startDrag(e.clientX)
}

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    startDrag(e.touches[0].clientX)
  }
}

const startDrag = (clientX: number) => {
  isDragging.value = true
  startX.value = clientX
  
  // 获取当前左侧栏宽度
  const sidebar = document.querySelector('.project-shell-left-sidebar') as HTMLElement
  if (sidebar) {
    startWidth.value = sidebar.offsetWidth
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
  
  // 禁用文本选择
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
}

const handleMouseMove = (e: MouseEvent) => {
  if (isDragging.value) {
    updateWidth(e.clientX)
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (isDragging.value && e.touches.length === 1) {
    updateWidth(e.touches[0].clientX)
  }
}

const updateWidth = (clientX: number) => {
  const delta = clientX - startX.value
  let newWidth = startWidth.value + delta
  
  // 限制宽度范围
  newWidth = Math.max(props.minWidth, Math.min(newWidth, props.maxWidth))
  
  emit('resize', newWidth)
}

const handleMouseUp = () => {
  if (isDragging.value) {
    endDrag()
  }
}

const handleTouchEnd = () => {
  if (isDragging.value) {
    endDrag()
  }
}

const endDrag = () => {
  isDragging.value = false
  
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  
  // 恢复文本选择
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  
  // 获取最终宽度
  const sidebar = document.querySelector('.project-shell-left-sidebar') as HTMLElement
  if (sidebar) {
    emit('resizeEnd', sidebar.offsetWidth)
  }
}

onBeforeUnmount(() => {
  // 清理事件监听器
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
})
</script>

<style scoped lang="scss">
.resizable-splitter {
  position: relative;
  width: 3px;
  background: transparent;
  cursor: col-resize;
  user-select: none;
  flex-shrink: 0;
  z-index: 10;
  
  &:hover,
  &.is-dragging {
    .splitter-handle {
      opacity: 1;
    }
  }
  
  &.is-dragging {
    .splitter-line {
      background: var(--el-color-primary);
    }
  }
}

.splitter-handle {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}

.splitter-line {
  width: 2px;
  height: 100%;
  background: var(--el-border-color-darker);
  border-radius: 1px;
  transition: background-color 0.2s;
}
</style>

