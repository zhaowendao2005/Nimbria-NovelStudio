<template>
  <div class="devtools-tabbar">
    <div class="tabbar-inner">
      <template v-for="(item, index) in tabs" :key="item.id">
        <!-- 组分割线 -->
        <div
          v-if="item.groupStart && index > 0"
          class="group-divider"
        ></div>
        
        <!-- Tab项 -->
        <div
          class="tab-item"
          :class="{
            'is-active': item.id === activeTabId,
            'group-first': item.groupStart
          }"
          @click="handleTabClick(item.id)"
        >
          <!-- 图标 -->
          <el-icon v-if="item.icon" class="tab-icon">
            <component :is="item.icon" />
          </el-icon>
          
          <!-- 标签文本 -->
          <span class="tab-label">{{ item.label }}</span>
          
          <!-- Badge（可选） -->
          <el-badge
            v-if="item.badge"
            :value="item.badge"
            class="tab-badge"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabItem } from './types'

/**
 * DevToolsTabBar 组件
 * Chrome DevTools 风格的标签栏
 * 支持图标、分组、Badge等
 */

interface Props {
  tabs: TabItem[]
  activeTabId: string
}

interface Emits {
  (e: 'tab-click', tabId: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

/**
 * 处理标签页点击
 */
const handleTabClick = (tabId: string): void => {
  emit('tab-click', tabId)
}
</script>

<style scoped lang="scss">
.devtools-tabbar {
  width: 100%;
  height: 32px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tabbar-inner {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 4px;
  gap: 0;
}

.group-divider {
  width: 1px;
  height: 18px;
  background: var(--el-border-color);
  margin: 0 4px;
  flex-shrink: 0;
}

.tab-item {
  height: 24px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s ease;
  user-select: none;
  white-space: nowrap;
  flex-shrink: 0;
  
  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }
  
  &.is-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    font-weight: 500;
  }
  
  &.group-first {
    margin-left: 0;
  }
}

.tab-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tab-label {
  flex-shrink: 0;
}

.tab-badge {
  :deep(.el-badge__content) {
    font-size: 10px;
    height: 14px;
    line-height: 14px;
    padding: 0 4px;
  }
}
</style>

