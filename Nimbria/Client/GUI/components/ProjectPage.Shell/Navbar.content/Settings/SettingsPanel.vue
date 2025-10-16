<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h3>设置</h3>
    </div>
    
    <div class="settings-content">
      <!-- DemoPage按钮 -->
      <el-button 
        type="primary" 
        @click="openDemoPageDrawer"
        class="demo-page-btn"
      >
        <el-icon><Document /></el-icon>
        DemoPage
      </el-button>
    </div>

    <!-- DemoPage抽屉 -->
    <DemoPageDrawer 
      v-model:visible="drawerVisible" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document } from '@element-plus/icons-vue'
import DemoPageDrawer from './DemoPageDrawer.vue'

const drawerVisible = ref(false)

const openDemoPageDrawer = () => {
  drawerVisible.value = true
}
</script>

<style scoped>
.settings-panel {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.settings-header h3 {
  margin: 0 0 16px 0;
  color: var(--obsidian-text-primary);
}

.demo-page-btn {
  width: 100%;
  height: 40px;
}
</style>
