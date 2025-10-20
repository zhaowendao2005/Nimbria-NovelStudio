<template>
  <div class="visualization-area" ref="containerRef">
    <div class="canvas-container">
      <!-- 图可视化画布占位 -->
      <div class="placeholder-canvas">
        <div class="nodes-preview">
          <div 
            v-for="node in graphData?.nodes" 
            :key="node.id"
            class="node-item"
            :class="{ selected: isNodeSelected(node.id) }"
            @click="handleNodeClick(node.id)"
          >
            <div class="node-circle"></div>
            <div class="node-label">{{ node.label }}</div>
          </div>
        </div>
        
        <div class="info-text">
          <p>图可视化区域</p>
          <p class="hint">TODO: 集成D3.js或其他图可视化库</p>
        </div>
      </div>
    </div>
    
    <!-- 控制面板 -->
    <div class="controls-panel">
      <el-button-group>
        <el-button :icon="ZoomIn" size="small" @click="handleZoomIn">放大</el-button>
        <el-button :icon="ZoomOut" size="small" @click="handleZoomOut">缩小</el-button>
        <el-button :icon="Refresh" size="small" @click="handleResetView">重置</el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStarChartStore } from '@stores/projectPage/starChart'
import type { GraphData, StarChartConfig } from '@stores/projectPage/starChart'
import { ZoomIn, ZoomOut, Refresh } from '@element-plus/icons-vue'

// ==================== Props ====================
defineProps<{
  graphData: GraphData | null
  config: StarChartConfig
}>()

// ==================== Store ====================
const starChartStore = useStarChartStore()

// ==================== Refs ====================
const containerRef = ref<HTMLElement | null>(null)

// ==================== 计算属性 ====================
const isNodeSelected = (nodeId: string) => {
  return starChartStore.selectedNodeIds.has(nodeId)
}

// ==================== 方法 ====================

/**
 * 节点点击
 */
const handleNodeClick = (nodeId: string) => {
  starChartStore.selectNode(nodeId, false)
  console.log('[VisualizationArea] 节点选中:', nodeId)
}

/**
 * 放大
 */
const handleZoomIn = () => {
  const newScale = starChartStore.viewport.scale * 1.2
  starChartStore.updateViewport({ scale: newScale })
  console.log('[VisualizationArea] 放大至:', newScale)
}

/**
 * 缩小
 */
const handleZoomOut = () => {
  const newScale = starChartStore.viewport.scale / 1.2
  starChartStore.updateViewport({ scale: newScale })
  console.log('[VisualizationArea] 缩小至:', newScale)
}

/**
 * 重置视图
 */
const handleResetView = () => {
  starChartStore.updateViewport({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  })
  console.log('[VisualizationArea] 视图已重置')
}
</script>

<style scoped lang="scss">
.visualization-area {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-fill-color-light);
}

.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.placeholder-canvas {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  .nodes-preview {
    display: flex;
    gap: 40px;
    margin-bottom: 32px;
    
    .node-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        transform: translateY(-4px);
      }
      
      &.selected .node-circle {
        border-color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
      }
      
      .node-circle {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid var(--el-border-color);
        background: var(--el-bg-color);
        transition: all 0.2s;
      }
      
      .node-label {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }
  
  .info-text {
    text-align: center;
    
    p {
      margin: 4px 0;
      color: var(--el-text-color-secondary);
      
      &.hint {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
      }
    }
  }
}

.controls-panel {
  position: absolute;
  bottom: 16px;
  right: 16px;
  background: var(--el-bg-color);
  padding: 8px;
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-light);
}
</style>

