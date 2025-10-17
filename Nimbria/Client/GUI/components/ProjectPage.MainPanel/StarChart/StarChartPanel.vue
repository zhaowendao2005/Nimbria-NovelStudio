<template>
  <div class="starchart-panel">
    <!-- 顶栏工具 -->
    <StarChartTopBar 
      @create-view="handleCreateView"
      @relayout="handleRelayout"
      @export="handleExport"
    />
    
    <!-- Cytoscape 视口 -->
    <StarChartViewport 
      v-if="starChartStore.initialized"
      :elements="starChartStore.cytoscapeElements"
      :layout="starChartStore.layoutConfig"
      :fast-rebuild="starChartStore.fastRebuild"
      @viewport-change="handleViewportChange"
    />
    
    <!-- 空状态 -->
    <div v-else-if="!starChartStore.loading" class="empty-state">
      <el-empty description="暂无数据">
        <el-button type="primary" @click="handleCreateView">
          创建视图
        </el-button>
      </el-empty>
    </div>
    
    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useStarChartStore } from '@stores/projectPage/starChart'
import StarChartTopBar from './StarChartTopBar.vue'
import StarChartViewport from './StarChartViewport.vue'
import type { ViewportState } from '@stores/projectPage/starChart/starChart.types'

const starChartStore = useStarChartStore()

// 创建视图
const handleCreateView = async () => {
  try {
    await starChartStore.initialize()
    ;(ElMessage as any).success('视图创建成功')
  } catch (error) {
    ;(ElMessage as any).error('创建失败')
  }
}

// 重新布局
const handleRelayout = () => {
  starChartStore.updateLayout({ randomize: true, animate: true })
  ;(ElMessage as any).success('布局已更新')
}

// 导出
const handleExport = () => {
  ;(ElMessage as any).info('导出功能开发中...')
}

// 视口变化
const handleViewportChange = (state: ViewportState) => {
  starChartStore.updateViewport(state)
}

// 生命周期
onMounted(() => {
  console.log('[StarChartPanel] 组件已挂载')
})
</script>

<style scoped lang="scss">
.starchart-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--obsidian-background-primary);
  overflow: hidden;
}

.empty-state,
.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: var(--obsidian-text-secondary);
}

.loading-state {
  font-size: 14px;
  
  .el-icon {
    font-size: 32px;
  }
}
</style>

