<template>
  <transition name="drawer">
    <div v-if="visible" class="right-drawer-overlay" @click="handleOverlayClick">
      <div class="right-drawer" :style="drawerStyle" @click.stop>
        <!-- 抽屉头部 -->
        <div class="drawer-header">
          <h3 class="drawer-title">{{ title }}</h3>
          <el-button
            :icon="Close"
            circle
            size="small"
            @click="handleClose"
          />
        </div>
        
        <!-- 抽屉内容 -->
        <div class="drawer-content">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close } from '@element-plus/icons-vue'

/**
 * RightDrawer 组件
 * 从右向左滑出的抽屉，挂载在右栏根组件
 */

interface Props {
  visible: boolean
  title?: string
  width?: number // 固定宽度（px）
  minWidthPercent?: number // 当右栏宽度不足时，使用百分比
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '抽屉',
  width: 500,
  minWidthPercent: 70
})

const emit = defineEmits<Emits>()

// 抽屉样式
const drawerStyle = computed(() => ({
  width: `min(${props.width}px, ${props.minWidthPercent}%)`
}))

/**
 * 关闭抽屉
 */
const handleClose = (): void => {
  emit('update:visible', false)
  emit('close')
}

/**
 * 点击遮罩层关闭
 */
const handleOverlayClick = (): void => {
  handleClose()
}
</script>

<style scoped lang="scss">
.right-drawer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
}

.right-drawer {
  height: 100%;
  background: var(--el-bg-color);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 抽屉头部
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color);
  flex-shrink: 0;
  background: var(--el-bg-color);
}

.drawer-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

// 抽屉内容
.drawer-content {
  flex: 1;
  overflow: auto; // 垂直和水平都可滚动
  min-height: 0;
  min-width: 0;
}

// 进入/离开动画
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
  
  .right-drawer {
    transition: transform 0.3s ease;
  }
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  
  .right-drawer {
    transform: translateX(100%);
  }
}

.drawer-enter-to,
.drawer-leave-from {
  opacity: 1;
  
  .right-drawer {
    transform: translateX(0);
  }
}
</style>

