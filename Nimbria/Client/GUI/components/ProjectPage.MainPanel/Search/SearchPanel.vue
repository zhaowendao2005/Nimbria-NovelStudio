<template>
  <div class="search-panel">
    <div class="panel-content">
      <h2>Search Panel</h2>
      <p>空的搜索面板，待实现</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSearchStore } from '@stores/projectPage/search'

const searchStore = useSearchStore()
</script>

<style scoped lang="scss">
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
}

.panel-content {
  flex: 1;
  padding: 20px;
}
</style>

