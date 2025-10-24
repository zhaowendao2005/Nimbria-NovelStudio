<template>
  <div ref="containerRef" class="browserview-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

/**
 * BrowserViewContainer 组件
 * BrowserView 占位容器
 * 实际的 BrowserView 会覆盖在这个容器上
 */

const containerRef = ref<HTMLElement | null>(null)

// 暴露 ref 给父组件
defineExpose({
  containerRef
})
</script>

<style scoped lang="scss">
.browserview-container {
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-lighter);
  position: relative;
}
</style>

