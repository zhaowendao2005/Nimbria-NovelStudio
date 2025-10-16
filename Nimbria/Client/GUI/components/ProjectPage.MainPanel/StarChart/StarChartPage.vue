<template>
  <div class="starchart-page">
    <StarChartTopBar
      @create-view="handleCreateView"
      @relayout="handleRelayout"
      @export="handleExport"
    />
    
    <div class="starchart-page__viewport">
      <StarChartViewport
        v-if="starChartStore.initialized"
        :elements="starChartStore.cytoscapeElements"
        :layout="starChartStore.layoutConfig"
        @viewport-change="handleViewportChange"
      />
      
      <div v-else-if="!starChartStore.loading" class="empty-state">
        <el-empty description="暂无数据，点击上方【创建视图】按钮开始">
          <el-button type="primary" @click="handleCreateView">创建视图</el-button>
        </el-empty>
      </div>
      
      <div v-else class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { useStarChartStore } from '@stores/projectPage/starChart'
import StarChartTopBar from './StarChartTopBar.vue'
import StarChartViewport from './StarChartViewport.vue'
import type { ViewportState } from '@stores/projectPage/starChart'

const starChartStore = useStarChartStore()

// 处理创建视图
const handleCreateView = async () => {
  try {
    await starChartStore.initialize()
    ;(ElMessage as any).success('StarChart 视图已创建')
  } catch (error) {
    console.error('[StarChartPage] 创建视图失败:', error)
    ;(ElMessage as any).error('创建视图失败')
  }
}

// 处理重新布局
const handleRelayout = () => {
  starChartStore.updateLayout({ name: 'fcose' })
  ;(ElMessage as any).info('正在重新布局...')
}

// 处理导出
const handleExport = () => {
  ;(ElMessage as any).info('导出功能开发中...')
}

// 处理视口变化
const handleViewportChange = (state: Partial<ViewportState>) => {
  starChartStore.updateViewport(state)
}

// 组件挂载时自动初始化
onMounted(() => {
  if (!starChartStore.initialized && !starChartStore.loading) {
    handleCreateView()
  }
})
</script>

<style scoped lang="scss">
.starchart-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.starchart-page__viewport {
  flex: 1;
  min-height: 0;
  position: relative;
}

.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
}

.loading-state {
  gap: 12px;
  
  .el-icon {
    font-size: 32px;
  }
}
</style>

