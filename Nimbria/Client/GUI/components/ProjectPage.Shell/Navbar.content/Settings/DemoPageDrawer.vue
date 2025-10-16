<template>
  <el-drawer
    v-model="visible"
    title="Demo页面"
    direction="rtl"
    size="400px"
    :modal="true"
    :show-close="true"
  >
    <div class="demo-drawer-content">
      <div class="demo-header">
        <h2>Demo页面管理</h2>
        <p class="demo-description">UI/UX 原型设计与测试页面</p>
      </div>
      
      <div class="demo-list">
        <div class="demo-item" v-for="page in demoPages" :key="page.name">
          <div class="demo-card" @click="openDemoPage(page)">
            <div class="demo-icon">
              <el-icon><Document /></el-icon>
            </div>
            
            <div class="demo-info">
              <h3 class="demo-title">{{ page.title }}</h3>
              <p class="demo-desc">{{ page.description }}</p>
              <span class="demo-category">{{ page.category }}</span>
            </div>
            
            <div class="demo-actions">
              <el-icon class="action-icon"><ArrowRight /></el-icon>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 如果没有Demo页面，显示空状态 -->
      <div v-if="demoPages.length === 0" class="empty-state">
        <el-empty description="暂无Demo页面" />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Document, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAllDemoPages } from '@demo'
import type { DemoPageConfig } from '@demo'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 获取所有Demo页面配置
const demoPages = getAllDemoPages()

// 打开Demo页面的处理函数
const openDemoPage = (page: DemoPageConfig) => {
  ElMessage.success(`即将打开：${page.title}`)
  
  // TODO: 这里后续可以实现具体的页面跳转逻辑
  // 比如在新窗口或者主内容区打开Demo页面
  console.log('Opening demo page:', page)
  
  // 暂时关闭抽屉
  visible.value = false
}
</script>

<style scoped>
.demo-drawer-content {
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.demo-header {
  margin-bottom: 24px;
  text-align: center;
  
  h2 {
    margin: 0 0 8px 0;
    color: var(--obsidian-text-primary);
    font-size: 1.5rem;
    font-weight: 600;
  }
  
  .demo-description {
    margin: 0;
    color: var(--obsidian-text-secondary);
    font-size: 0.9rem;
  }
}

.demo-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-item {
  .demo-card {
    display: flex;
    align-items: center;
    padding: 16px;
    background: var(--obsidian-card-bg);
    border: 1px solid var(--obsidian-border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    
    &:hover {
      background: var(--obsidian-hover-bg);
      border-color: var(--obsidian-accent);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
}

.demo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--obsidian-accent);
  border-radius: 8px;
  color: white;
  margin-right: 16px;
  flex-shrink: 0;
}

.demo-info {
  flex: 1;
  min-width: 0;
  
  .demo-title {
    margin: 0 0 4px 0;
    font-size: 1rem;
    font-weight: 500;
    color: var(--obsidian-text-primary);
  }
  
  .demo-desc {
    margin: 0 0 8px 0;
    font-size: 0.85rem;
    color: var(--obsidian-text-secondary);
    line-height: 1.4;
  }
  
  .demo-category {
    display: inline-block;
    padding: 2px 8px;
    background: var(--obsidian-accent);
    color: white;
    font-size: 0.75rem;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.demo-actions {
  display: flex;
  align-items: center;
  margin-left: 12px;
  
  .action-icon {
    font-size: 18px;
    color: var(--obsidian-text-secondary);
    transition: all 0.2s ease;
  }
}

.demo-card:hover .demo-actions .action-icon {
  color: var(--obsidian-accent);
  transform: translateX(2px);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .demo-drawer-content {
    padding: 16px;
  }
  
  .demo-card {
    padding: 12px !important;
  }
  
  .demo-icon {
    width: 32px;
    height: 32px;
    margin-right: 12px;
  }
  
  .demo-info .demo-title {
    font-size: 0.9rem;
  }
  
  .demo-info .demo-desc {
    font-size: 0.8rem;
  }
}
</style>
