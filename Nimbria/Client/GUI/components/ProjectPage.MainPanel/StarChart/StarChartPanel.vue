<template>
  <div class="starchart-panel">
    <!-- 工具栏 -->
    <TopBar 
      v-if="showToolbar"
      :loading="starChartStore.loading"
      :has-data="starChartStore.hasData"
      @refresh="handleRefresh"
      @export="handleExport"
    />
    
    <!-- 主内容区 -->
    <div class="panel-content">
      <!-- 加载状态 -->
      <div v-if="starChartStore.loading" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      
      <!-- 错误状态 -->
      <div v-else-if="starChartStore.error" class="error-state">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ starChartStore.error }}</span>
      </div>
      
      <!-- 可视化区域 -->
      <VisualizationArea
        v-else-if="starChartStore.hasData"
        :graph-data="starChartStore.graphData"
        :config="starChartStore.config"
      />
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-icon><DocumentCopy /></el-icon>
        <p>暂无图数据</p>
        <el-button type="primary" @click="handleRefresh">
          加载示例数据
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useStarChartStore } from '@stores/projectPage/starChart'
import { ElMessage } from 'element-plus'
import { Loading, WarningFilled, DocumentCopy } from '@element-plus/icons-vue'
import TopBar from './TopBar.vue'
import VisualizationArea from './VisualizationArea.vue'

// ==================== Store ====================
const starChartStore = useStarChartStore()

// ==================== 状态 ====================
const showToolbar = ref(true)

// ==================== 方法 ====================

/**
 * 刷新数据
 */
const handleRefresh = async () => {
  try {
    await starChartStore.loadGraphData()
    ElMessage.success('数据加载成功')
  } catch (error) {
    ElMessage.error('数据加载失败')
  }
}

/**
 * 导出数据
 */
const handleExport = () => {
  ElMessage.info('导出功能待实现')
  console.log('[StarChartPanel] 导出请求')
}

// ==================== 生命周期 ====================
onMounted(() => {
  console.log('[StarChartPanel] 组件已挂载')
  // 自动加载数据
  handleRefresh()
})
</script>

<style scoped lang="scss">
.starchart-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.loading-state,
.error-state,
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--el-text-color-secondary);
  
  .el-icon {
    font-size: 48px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

.error-state {
  color: var(--el-color-danger);
}
</style>

