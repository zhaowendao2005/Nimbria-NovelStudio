<template>
  <div ref="panelRef" class="left-panel">
    <!-- 搜索框（未搜索时显示） -->
    <SearchBox
      v-if="!isBrowserViewVisible"
      v-model="searchQuery"
      @search="handleSearch"
    />

    <!-- BrowserView 容器（搜索后显示） -->
    <BrowserViewContainer
      v-else
      ref="browserViewContainerRef"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import SearchBox from './SearchBox.vue'
import BrowserViewContainer from './BrowserViewContainer.vue'

/**
 * LeftPanel 组件
 * 左侧主面板，协调搜索框和 BrowserView 容器的显示
 */

interface Props {
  isBrowserViewVisible: boolean
  searchQuery: string
}

interface Emits {
  (e: 'update:searchQuery', value: string): void
  (e: 'search', query: string, engine: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// DOM 引用
const panelRef = ref<HTMLElement | null>(null)
const browserViewContainerRef = ref<InstanceType<typeof BrowserViewContainer> | null>(null)

// 计算属性
const isBrowserViewVisible = computed(() => props.isBrowserViewVisible)
const searchQuery = computed({
  get: () => props.searchQuery,
  set: (value: string) => emit('update:searchQuery', value)
})

/**
 * 处理搜索
 */
const handleSearch = (query: string, engine: string): void => {
  emit('search', query, engine)
}

// 暴露给父组件
defineExpose({
  panelRef,
  browserViewContainerRef
})
</script>

<style scoped lang="scss">
.left-panel {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>

