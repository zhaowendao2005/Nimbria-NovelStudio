<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu-overlay"
      @click="handleClose"
      @contextmenu.prevent
    >
      <div
        class="context-menu"
        :style="menuStyle"
        @click.stop
      >
        <template v-for="(item, index) in items" :key="index">
          <!-- 分隔线 -->
          <div v-if="item.divider" class="menu-divider"></div>
          
          <!-- 菜单项 -->
          <div
            v-else
            class="menu-item"
            @click="handleSelect(item.action)"
          >
            <el-icon v-if="item.icon" class="menu-icon">
              <component :is="getIcon(item.icon)" />
            </el-icon>
            <span class="menu-label">{{ item.label }}</span>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  ArrowRight, 
  ArrowDown, 
  CopyDocument 
} from '@element-plus/icons-vue'
import type { PaneContextMenuItem, SplitAction } from '@stores/projectPage/paneLayout/types'

/**
 * ContextMenu
 * 右键上下文菜单组件
 * 
 * 功能：
 * - 显示分屏操作菜单
 * - 支持图标和分隔线
 * - 点击外部自动关闭
 */

interface Props {
  visible: boolean
  x: number
  y: number
  items: PaneContextMenuItem[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'select', action: SplitAction): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

/**
 * 菜单位置样式
 */
const menuStyle = computed(() => ({
  left: `${props.x}px`,
  top: `${props.y}px`
}))

/**
 * 获取图标组件
 */
const getIcon = (iconName: string) => {
  const iconMap: Record<string, any> = {
    'arrow-right': ArrowRight,
    'arrow-down': ArrowDown,
    'copy-document': CopyDocument
  }
  return iconMap[iconName] || null
}

/**
 * 处理菜单项选择
 */
const handleSelect = (action: SplitAction) => {
  emits('select', action)
  handleClose()
}

/**
 * 关闭菜单
 */
const handleClose = () => {
  emits('update:visible', false)
}
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: transparent;
}

.context-menu {
  position: fixed;
  min-width: 200px;
  background: var(--obsidian-bg-primary, #ffffff);
  border: 1px solid var(--obsidian-border, #e3e5e8);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 4px;
  z-index: 10000;
  animation: context-menu-appear 0.15s ease-out;
}

@keyframes context-menu-appear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}

.menu-item:hover {
  background: var(--obsidian-bg-secondary, #f5f6f8);
}

.menu-item:active {
  background: var(--obsidian-bg-tertiary, #e9e9e9);
}

.menu-icon {
  font-size: 16px;
  color: var(--obsidian-text-secondary, #6a6d74);
}

.menu-label {
  flex: 1;
  font-size: 14px;
  color: var(--obsidian-text-primary, #2e3338);
}

.menu-divider {
  height: 1px;
  background: var(--obsidian-border, #e3e5e8);
  margin: 4px 0;
}
</style>

