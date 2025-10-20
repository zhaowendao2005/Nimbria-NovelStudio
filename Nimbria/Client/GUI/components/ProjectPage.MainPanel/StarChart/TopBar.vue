<template>
  <div class="starchart-topbar">
    <div class="topbar-left">
      <h3 class="title">StarChart - 图数据可视化</h3>
      <div class="info">
        <span v-if="hasData">
          节点: {{ nodeCount }} | 边: {{ edgeCount }}
        </span>
      </div>
    </div>
    
    <div class="topbar-right">
      <!-- 刷新按钮 -->
      <el-button
        :icon="Refresh"
        :loading="loading"
        size="small"
        @click="$emit('refresh')"
      >
        刷新
      </el-button>
      
      <!-- 导出按钮 -->
      <el-button
        :icon="Download"
        :disabled="!hasData"
        size="small"
        @click="$emit('export')"
      >
        导出
      </el-button>
      
      <!-- 设置按钮 -->
      <el-button
        :icon="Setting"
        size="small"
        @click="handleSettings"
      >
        设置
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStarChartStore } from '@stores/projectPage/starChart'
import { Refresh, Download, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// ==================== Props ====================
defineProps<{
  loading?: boolean
  hasData?: boolean
}>()

// ==================== Emits ====================
defineEmits<{
  refresh: []
  export: []
}>()

// ==================== Store ====================
const starChartStore = useStarChartStore()

// ==================== 计算属性 ====================
const nodeCount = computed(() => starChartStore.nodeCount)
const edgeCount = computed(() => starChartStore.edgeCount)

// ==================== 方法 ====================
const handleSettings = () => {
  ElMessage.info('设置面板待实现')
  console.log('[TopBar] 设置请求')
}
</script>

<style scoped lang="scss">
.starchart-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  
  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  .info {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.topbar-right {
  display: flex;
  gap: 8px;
}
</style>

