<template>
  <div class="test-page">
    <div class="test-page-header">
      <h1 class="page-title">TestPage Demo</h1>
      <p class="page-subtitle">UI/UX 设计测试页面</p>
    </div>
    
    <div class="test-content">
      <!-- 基础组件测试区 -->
      <div class="test-section">
        <h2 class="section-title">基础组件测试</h2>
        
        <div class="component-grid">
          <!-- 按钮测试 -->
          <div class="component-item">
            <h3>按钮组件</h3>
            <div class="button-group">
              <el-button type="primary">主要按钮</el-button>
              <el-button type="success">成功按钮</el-button>
              <el-button type="warning">警告按钮</el-button>
              <el-button type="danger">危险按钮</el-button>
            </div>
          </div>
          
          <!-- 输入框测试 -->
          <div class="component-item">
            <h3>输入组件</h3>
            <div class="input-group">
              <el-input v-model="testInput" placeholder="请输入内容" />
              <el-input v-model="testPassword" type="password" placeholder="请输入密码" />
            </div>
          </div>
          
          <!-- 卡片测试 -->
          <div class="component-item">
            <h3>卡片组件</h3>
            <el-card class="demo-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>卡片标题</span>
                  <el-button class="button" type="text">操作按钮</el-button>
                </div>
              </template>
              <div>这是一个演示卡片的内容区域</div>
            </el-card>
          </div>
        </div>
      </div>
      
      <!-- 交互效果测试区 -->
      <div class="test-section">
        <h2 class="section-title">交互效果测试</h2>
        
        <div class="interaction-grid">
          <!-- 动画按钮 -->
          <div class="interaction-item">
            <h3>动画效果</h3>
            <el-button 
              @click="triggerAnimation" 
              :class="{ 'animate-bounce': isAnimating }" 
              type="primary"
            >
              点击测试动画
            </el-button>
          </div>
          
          <!-- 状态切换 -->
          <div class="interaction-item">
            <h3>状态切换</h3>
            <el-switch v-model="switchValue" @change="handleSwitchChange" />
            <p class="status-text">当前状态: {{ switchValue ? '开启' : '关闭' }}</p>
          </div>
          
          <!-- 进度条 -->
          <div class="interaction-item">
            <h3>进度展示</h3>
            <el-progress :percentage="progressValue" />
            <div class="progress-controls">
              <el-button @click="decreaseProgress" size="small">减少</el-button>
              <el-button @click="increaseProgress" size="small">增加</el-button>
            </div>
          </div>
          
          <!-- CustomPageAPI 测试 -->
          <div class="interaction-item">
            <h3>页面管理API</h3>
            <el-button @click="addNewDemoPage" type="success" size="small">
              添加新Demo页面
            </el-button>
            <el-button @click="showActiveInstances" type="info" size="small">
              查看活跃实例
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 响应式测试区 -->
      <div class="test-section">
        <h2 class="section-title">响应式布局测试</h2>
        <div class="responsive-grid">
          <div class="grid-item" v-for="i in 6" :key="i">
            <div class="grid-content">
              <h4>网格项 {{ i }}</h4>
              <p>响应式网格布局测试</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 测试数据
const testInput = ref('')
const testPassword = ref('')
const switchValue = ref(false)
const progressValue = ref(50)
const isAnimating = ref(false)

// 交互方法
const triggerAnimation = () => {
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 1000)
  ElMessage({
    type: 'success',
    message: '动画触发成功！'
  })
}

const handleSwitchChange = (value: boolean) => {
  ElMessage({
    type: 'info',
    message: `状态已切换为：${value ? '开启' : '关闭'}`
  })
}

const increaseProgress = () => {
  if (progressValue.value < 100) {
    progressValue.value += 10
  }
}

const decreaseProgress = () => {
  if (progressValue.value > 0) {
    progressValue.value -= 10
  }
}

// CustomPageAPI 功能测试
const addNewDemoPage = async () => {
  try {
    // 动态导入CustomPageAPI
    const { CustomPageAPI } = await import('../../../Service/CustomPageManager')
    
    // 生成随机页面ID
    const randomId = `demo-page-${Date.now()}`
    
    // 注册新页面
    CustomPageAPI.register({
      id: randomId,
      name: `动态页面-${randomId.slice(-4)}`,
      title: `Dynamic Demo Page`,
      description: '这是通过TestPage动态添加的演示页面',
      category: 'demo',
      icon: 'Plus',
      tabType: `dynamicpage-${randomId.slice(-4)}`,
      component: () => Promise.resolve({
        template: `
          <div style="padding: 24px; text-align: center;">
            <h1>动态添加的页面</h1>
            <p>页面ID: ${randomId}</p>
            <p>这个页面是通过CustomPageAPI动态注册的</p>
          </div>
        `
      }),
      showInDrawer: true,
      tags: ['dynamic', 'test', 'api']
    })
    
    ElMessage({
      type: 'success',
      message: `新页面 ${randomId} 已注册成功！可在抽屉中查看`
    })
    
    console.log('[TestPage] New page registered:', randomId)
    console.log('[TestPage] All drawer pages:', CustomPageAPI.getDrawerPages())
    
  } catch (error) {
    console.error('[TestPage] Failed to add new demo page:', error)
    ElMessage({
      type: 'error',
      message: `添加页面失败：${error}`
    })
  }
}

const showActiveInstances = async () => {
  try {
    const { CustomPageAPI } = await import('../../../Service/CustomPageManager')
    
    const instances = CustomPageAPI.getActiveInstances()
    const stats = CustomPageAPI.getRegistryStats()
    
    console.log('[TestPage] Active instances:', instances)
    console.log('[TestPage] Registry stats:', stats)
    
    ElMessage({
      type: 'info',
      message: `活跃实例: ${instances.length}个，已注册页面: ${stats.total}个`
    })
    
    // 调用debug方法显示详细信息
    CustomPageAPI.debug()
    
  } catch (error) {
    console.error('[TestPage] Failed to get instances:', error)
  }
}
</script>

<style scoped lang="scss">
.test-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: var(--obsidian-bg);
  color: var(--obsidian-text-primary);
  min-height: 100vh;
}

.test-page-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 20px;
  border-bottom: 1px solid var(--obsidian-border);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--obsidian-accent);
}

.page-subtitle {
  font-size: 1.1rem;
  color: var(--obsidian-text-secondary);
  margin: 0;
}

.test-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.test-section {
  background: var(--obsidian-card-bg);
  border-radius: 8px;
  padding: 24px;
  border: 1px solid var(--obsidian-border);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 500;
  margin: 0 0 20px 0;
  color: var(--obsidian-text-primary);
  border-bottom: 2px solid var(--obsidian-accent);
  padding-bottom: 8px;
}

.component-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.component-item {
  padding: 16px;
  background: var(--obsidian-hover-bg);
  border-radius: 6px;
  border: 1px solid var(--obsidian-border);
  
  h3 {
    font-size: 1.1rem;
    margin: 0 0 12px 0;
    color: var(--obsidian-text-primary);
  }
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.interaction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.interaction-item {
  padding: 16px;
  background: var(--obsidian-hover-bg);
  border-radius: 6px;
  border: 1px solid var(--obsidian-border);
  text-align: center;
  
  h3 {
    font-size: 1.1rem;
    margin: 0 0 16px 0;
    color: var(--obsidian-text-primary);
  }
}

.status-text {
  margin: 8px 0 0 0;
  font-size: 0.9rem;
  color: var(--obsidian-text-secondary);
}

.progress-controls {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  justify-content: center;
}

.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.grid-item {
  background: var(--obsidian-hover-bg);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--obsidian-border);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.grid-content {
  padding: 16px;
  
  h4 {
    margin: 0 0 8px 0;
    color: var(--obsidian-text-primary);
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
    color: var(--obsidian-text-secondary);
  }
}

// 动画效果
@keyframes bounce {
  0%, 20%, 53%, 80%, 100% {
    transform: translate3d(0, 0, 0);
  }
  40%, 43% {
    transform: translate3d(0, -8px, 0);
  }
  70% {
    transform: translate3d(0, -4px, 0);
  }
  90% {
    transform: translate3d(0, -2px, 0);
  }
}

.animate-bounce {
  animation: bounce 1s ease-in-out;
}

// 响应式设计
@media (max-width: 768px) {
  .test-page {
    padding: 16px;
  }
  
  .page-title {
    font-size: 2rem;
  }
  
  .component-grid,
  .interaction-grid {
    grid-template-columns: 1fr;
  }
  
  .button-group {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
