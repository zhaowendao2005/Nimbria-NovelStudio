<template>
  <div class="search-panel">
    <el-splitter style="height: 100%;">
      <el-splitter-panel size="30%">
        <div class="left-panel"></div>
      </el-splitter-panel>
      <el-splitter-panel>
        <div class="right-panel"></div>
      </el-splitter-panel>
    </el-splitter>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useSearchStore } from '@stores/projectPage/search'

interface Props {
  tabId: string
}

const props = defineProps<Props>()

const searchStore = useSearchStore()

// 获取当前标签页的实例状态
const instanceState = computed(() => {
  return searchStore.getInstance(props.tabId)
})

// 组件挂载时初始化实例
onMounted(() => {
  searchStore.initInstance(props.tabId)
  console.log('[SearchPanel] Mounted, tabId:', props.tabId)
})

// 组件卸载时清理实例（可选，取决于是否需要保留状态）
onUnmounted(() => {
  // 注意：这里暂不清理，保留标签页的状态
  console.log('[SearchPanel] Unmounted, tabId:', props.tabId)
})
</script>

<style scoped lang="scss">
.search-panel {
  display: flex;
  height: 100%;
  width: 100%;
  background: var(--el-bg-color-page);
}

.left-panel {
  height: 100%;
  overflow-y: auto;
}

.right-panel {
  height: 100%;
  overflow-y: auto;
}
</style>

