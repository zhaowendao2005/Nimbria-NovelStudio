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
            <component :is="panel.component" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { useRightSidebarStore } from '@stores/projectPage/rightSidebar'

const rightSidebarStore = useRightSidebarStore()

const handleRemove = (panelId: string) => {
  rightSidebarStore.unregister(panelId)
}
</script>

<style scoped lang="scss">
@import './RightSidebar.scss';
</style>

