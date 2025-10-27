<template>
  <div class="vueflow-test-page">
    <div class="test-header">
      <h3>VueFlow 依赖测试</h3>
      <div class="test-status">
        <el-tag v-if="isLoaded" type="success">✅ VueFlow 加载成功</el-tag>
        <el-tag v-else type="danger">❌ VueFlow 加载失败</el-tag>
      </div>
    </div>
    
    <div class="test-content">
      <!-- VueFlow 画布 -->
      <div class="canvas-wrapper">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          :default-viewport="{ zoom: 1 }"
          :min-zoom="0.2"
          :max-zoom="4"
          fit-view-on-init
        >
          <!-- 背景网格 -->
          <Background pattern-color="#aaa" :gap="16" />
          
          <!-- 控制按钮 -->
          <Controls />
          
          <!-- 小地图 -->
          <MiniMap />
        </VueFlow>
      </div>
      
      <!-- 测试信息 -->
      <div class="test-info">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>测试信息</span>
            </div>
          </template>
          <div class="info-content">
            <p><strong>节点数量：</strong> {{ nodes.length }}</p>
            <p><strong>边数量：</strong> {{ edges.length }}</p>
            <p><strong>VueFlow 版本：</strong> 1.33.0</p>
            <p><strong>依赖状态：</strong></p>
            <ul>
              <li>@vue-flow/core: {{ dependencies.core ? '✅' : '❌' }}</li>
              <li>@vue-flow/background: {{ dependencies.background ? '✅' : '❌' }}</li>
              <li>@vue-flow/controls: {{ dependencies.controls ? '✅' : '❌' }}</li>
              <li>@vue-flow/minimap: {{ dependencies.minimap ? '✅' : '❌' }}</li>
            </ul>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { VueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge } from '@vue-flow/core'

// 加载状态
const isLoaded = ref(false)

// 依赖检测
const dependencies = ref({
  core: false,
  background: false,
  controls: false,
  minimap: false
})

// 测试节点
const nodes = ref<Node[]>([
  {
    id: '1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: '测试节点 1' }
  },
  {
    id: '2',
    type: 'default',
    position: { x: 400, y: 100 },
    data: { label: '测试节点 2' }
  },
  {
    id: '3',
    type: 'default',
    position: { x: 250, y: 250 },
    data: { label: '测试节点 3' }
  }
])

// 测试边
const edges = ref<Edge[]>([
  {
    id: 'e1-2',
    source: '1',
    target: '2'
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3'
  }
])

onMounted(() => {
  // 检测依赖是否正确加载
  try {
    dependencies.value.core = !!VueFlow
    dependencies.value.background = !!Background
    dependencies.value.controls = !!Controls
    dependencies.value.minimap = !!MiniMap
    
    isLoaded.value = Object.values(dependencies.value).every(v => v)
    
    console.log('✅ [VueFlow 测试] 依赖加载成功:', dependencies.value)
  } catch (error) {
    console.error('❌ [VueFlow 测试] 依赖加载失败:', error)
    isLoaded.value = false
  }
})
</script>

<style scoped lang="scss">
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';

.vueflow-test-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 16px;
  background: var(--el-bg-color-page);
}

.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }
}

.test-content {
  display: flex;
  flex: 1;
  gap: 16px;
  overflow: hidden;
}

.canvas-wrapper {
  flex: 1;
  background: var(--el-bg-color);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.test-info {
  width: 300px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .info-content {
    p {
      margin: 8px 0;
      line-height: 1.8;
    }
    
    ul {
      margin: 8px 0;
      padding-left: 20px;
      
      li {
        margin: 4px 0;
        line-height: 1.8;
      }
    }
  }
}
</style>

