<template>
  <div class="settings-panel">
    <div class="settings-header">
      <h3>⚙️ 设置与工具</h3>
    </div>
    
    <el-collapse v-model="activeNames" class="settings-collapse">
      <!-- 📖 文档与演示 -->
      <el-collapse-item title="📖 文档与演示" name="demo">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <span>Demo 页面</span>
              <el-tag>演示</el-tag>
            </div>
          </template>
          <div class="card-content">
            <p class="card-description">查看演示页面和测试组件</p>
            <el-button 
              type="primary" 
              @click="openDemoPageDrawer"
              class="card-btn"
            >
              <el-icon><Document /></el-icon>
              打开 DemoPage
            </el-button>
          </div>
        </el-card>
      </el-collapse-item>

      <!-- 🗂️ 数据库管理 -->
      <el-collapse-item title="🗂️ 数据库管理" name="database">
        <!-- StarChart 卡片 -->
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <span>StarChart 图数据库</span>
              <el-tag 
                :type="starChartInitialized ? 'success' : 'info'"
              >
                {{ starChartInitialized ? '已初始化' : '待初始化' }}
              </el-tag>
            </div>
          </template>
          <div class="card-content">
            <p class="card-description">小说设定图数据库，支持时间维度快照架构</p>
            
            <!-- 初始化按钮 -->
            <el-button 
              v-if="!starChartInitialized"
              type="success" 
              @click="initializeStarChart"
              :loading="starChartLoading"
              class="card-btn"
            >
              <el-icon><Star /></el-icon>
              初始化 StarChart
            </el-button>

            <!-- 测试和操作按钮 -->
            <div v-else class="button-group">
              <el-button 
                type="info" 
                @click="testStarChart"
                class="card-btn"
              >
                <el-icon><View /></el-icon>
                查看元数据
              </el-button>
              <el-button 
                type="warning" 
                class="card-btn"
                disabled
              >
                <el-icon><Star /></el-icon>
                重置数据库
              </el-button>
            </div>

            <!-- 测试结果显示 -->
            <div v-if="testResult" class="test-result">
              <div class="result-item">
                <span class="result-label">创建时间:</span>
                <span class="result-value">{{ new Date(testResult.created_at).toLocaleString() }}</span>
              </div>
              <div class="result-item">
                <span class="result-label">版本:</span>
                <span class="result-value">{{ testResult.version }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-collapse-item>

      <!-- ⚙️ 高级设置 -->
      <el-collapse-item title="⚙️ 高级设置" name="advanced">
        <el-card class="settings-card">
          <template #header>
            <div class="card-header">
              <span>系统配置</span>
              <el-tag type="warning">开发中</el-tag>
            </div>
          </template>
          <div class="card-content">
            <p class="card-description">系统级别的高级配置选项</p>
            <el-button disabled class="card-btn">
              敬请期待...
            </el-button>
          </div>
        </el-card>
      </el-collapse-item>
    </el-collapse>

    <!-- DemoPage抽屉 -->
    <DemoPageDrawer 
      v-model:visible="drawerVisible" 
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document, Star, View } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import DemoPageDrawer from './DemoPageDrawer.vue'

// 折叠面板状态
const activeNames = ref(['database'])

// UI 状态
const drawerVisible = ref(false)
const starChartLoading = ref(false)
const starChartInitialized = ref(false)
const testResult = ref<any>(null)

// ✅ 打开 DemoPage 抽屉
const openDemoPageDrawer = () => {
  drawerVisible.value = true
}

// ✅ 初始化 StarChart
const initializeStarChart = async () => {
  starChartLoading.value = true
  
  try {
    const result = await window.nimbria.starChart.createProject()
    
    if (result.success) {
      ElMessage.success('StarChart 初始化成功！')
      starChartInitialized.value = true
      testResult.value = null
    } else {
      ElMessage.error(`初始化失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`初始化异常: ${error.message}`)
  } finally {
    starChartLoading.value = false
  }
}

// ✅ 测试 StarChart：读取元数据
const testStarChart = async () => {
  try {
    const result = await window.nimbria.starChart.getMetadata()
    
    if (result.success) {
      testResult.value = result.metadata
      ElMessage.success('读取成功！')
    } else {
      ElMessage.error(`读取失败: ${result.error}`)
    }
  } catch (error: any) {
    ElMessage.error(`读取异常: ${error.message}`)
  }
}

// 设置事件监听
onMounted(() => {
  window.nimbria.starChart?.onProjectCreated((data: any) => {
    console.log('StarChart 项目创建成功:', data)
  })
  
  window.nimbria.starChart?.onProjectError((data: any) => {
    console.error('StarChart 错误:', data.error)
  })
})
</script>

<style scoped>
.settings-panel {
  height: 100%;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--obsidian-border-color);
}

.settings-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--obsidian-text-primary);
}

/* Collapse 样式 */
.settings-collapse {
  --el-collapse-border-color: var(--obsidian-border-color);
  --el-collapse-header-bg-color: var(--obsidian-background-secondary);
  --el-collapse-header-text-color: var(--obsidian-text-primary);
}

/* Card 样式 */
.settings-card {
  --el-card-border-color: var(--obsidian-border-color);
  --el-card-bg-color: var(--obsidian-background-tertiary);
  --el-card-text-color: var(--obsidian-text-primary);
  margin-bottom: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.card-header span {
  flex: 1;
  font-weight: 500;
  color: var(--obsidian-text-primary);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-description {
  margin: 0;
  font-size: 12px;
  color: var(--obsidian-text-secondary);
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-btn {
  width: 100%;
  height: 36px;
  flex: 1;
  min-width: 120px;
}

.button-group .card-btn {
  flex: 1;
  width: auto;
  min-width: 110px;
}

/* 测试结果样式 */
.test-result {
  padding: 12px;
  background: var(--obsidian-background-secondary);
  border-radius: 6px;
  border-left: 3px solid var(--el-color-success);
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  margin: 6px 0;
}

.result-label {
  color: var(--obsidian-text-secondary);
  font-weight: 500;
  min-width: 70px;
}

.result-value {
  color: var(--obsidian-text-primary);
  flex: 1;
  text-align: right;
  word-break: break-all;
}
</style>
