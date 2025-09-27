<template>
  <div class="system-a">
    <h1>系统A入口</h1>
    <!-- 系统A独立组织入口，包含abc业务模块 -->
    <p>系统A包含业务模块：ModuleA, ModuleB, ModuleC</p>
    
    <!-- 内部导入 PagesLayout -->
    <router-view />
  </div>
</template>

<script setup lang="ts">
// 系统A入口组件
// TODO: 实现系统A的具体逻辑
console.log('System A initialized')
</script>

<style scoped>
.system-a {
  /* TODO: 系统A样式 */
  padding: 2rem;
  
}
</style>