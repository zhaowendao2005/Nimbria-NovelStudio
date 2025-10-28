<template>
  <div class="standalone-window-shell">
    <!-- 🔥 Nimbria 标题栏（最小化、最大化、关闭） -->
    <DetachedWindowTitleBar :title="title" />
    
    <!-- 🔥 内容槽：业务组件完全独立控制 -->
    <div class="window-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import DetachedWindowTitleBar from '@components/Shared/DetachedWindowTitleBar.vue'

/**
 * 独立窗口壳子（通用组件）
 * 
 * 职责：
 * - 提供 Nimbria 标准标题栏（最小化、最大化、关闭）
 * - 提供可拖拽的窗口外壳
 * - 提供内容槽供业务组件使用
 * 
 * 特点：
 * - 完全无状态，不持有任何业务逻辑
 * - 每个使用它的业务窗口完全独立
 * - 状态管理完全由业务组件自己控制
 * 
 * 使用示例：
 * ```vue
 * <template>
 *   <StandaloneWindowShell title="我的窗口">
 *     <MyBusinessComponent />
 *   </StandaloneWindowShell>
 * </template>
 * ```
 */

interface Props {
  /** 窗口标题 */
  title?: string
}

withDefaults(defineProps<Props>(), {
  title: 'Nimbria'
})
</script>

<style scoped lang="scss">
.standalone-window-shell {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background-primary, #1e1e1e);
  overflow: hidden;
}

.window-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}
</style>

