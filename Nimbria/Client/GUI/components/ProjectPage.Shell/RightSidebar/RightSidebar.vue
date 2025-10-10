<template>
  <transition name="slide-left">
    <div v-if="rightSidebarStore.visible && rightSidebarStore.hasPanels" class="right-sidebar">
      <el-tabs
        v-model="rightSidebarStore.activeId"
        type="card"
        class="sidebar-tabs"
        @tab-remove="handleRemove"
      >
        <el-tab-pane
          v-for="panel in rightSidebarStore.availablePanels"
          :key="panel.id"
          :name="panel.id"
          :label="panel.label"
          :closable="panel.closable !== false"
        >
          <template #label>
            <div class="tab-label">
              <el-icon v-if="panel.icon" class="tab-icon">
                <component :is="panel.icon" />
              </el-icon>
              <span>{{ panel.label }}</span>
            </div>
          </template>
          
          <!-- 动态组件（由外部提供） -->
          <div class="panel-content">
            <component :is="panel.component" v-bind="panel.props || {}" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'

const rightSidebarStore = useRightSidebarStore()

/**
 * 处理标签页关闭
 * 逻辑：
 * - 多个标签页：删除当前标签页
 * - 最后一个标签页：删除标签页 + 隐藏右栏
 */
const handleRemove = (panelId: string) => {
  console.log('[RightSidebar] Removing panel:', panelId)
  
  // 删除标签页（注销面板）
  rightSidebarStore.unregister(panelId)
  
  // 如果删除后没有面板了，自动隐藏右栏
  if (!rightSidebarStore.hasPanels) {
    console.log('[RightSidebar] No panels left, hiding sidebar')
    rightSidebarStore.hide()
  }
}
</script>

<style scoped lang="scss">
@import './RightSidebar.scss';
</style>

