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
        
        <!-- 快速启动按钮 -->
        <div class="demo-actions-header">
          <el-button 
            type="primary" 
            @click="openTestPage"
            :icon="Document"
          >
            启动 TestPage
          </el-button>
          
          <el-button 
            type="success" 
            @click="openLlmTranslatePage"
            :icon="Promotion"
          >
            启动 LLM翻译
          </el-button>
          
          <el-button 
            type="warning" 
            @click="openVueFlowTestPage"
            :icon="Connection"
          >
            VueFlow测试
          </el-button>
        </div>
      </div>
      
      <div class="demo-list">
        <div class="demo-item" v-for="page in demoPages" :key="page.id">
          <div class="demo-card" @click="openDemoPage(page)">
            <div class="demo-icon">
              <el-icon><Document /></el-icon>
            </div>
            
            <div class="demo-info">
              <h3 class="demo-title">{{ page.title }}</h3>
              <p class="demo-desc">{{ page.description || '暂无描述' }}</p>
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
import { computed, ref, watch } from 'vue'
import { Document, ArrowRight, Promotion, Connection } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { CustomPageAPI } from '../../../../../Service/CustomPageManager'
import type { CustomPageConfig } from '../../../../../Service/CustomPageManager'

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

// 🔥 使用ref强制触发响应式更新
const pageListVersion = ref(0)

// 🔥 监听抽屉打开，刷新页面列表
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    console.log('[DemoPageDrawer] Drawer opened, refreshing page list')
    // 强制刷新页面列表（触发computed重新计算）
    pageListVersion.value++
  }
})

// 获取所有抽屉显示的页面配置
// 🔥 依赖pageListVersion，确保每次打开抽屉都会重新获取
const demoPages = computed(() => {
  // 这个访问会建立响应式依赖
  const _ = pageListVersion.value
  
  const pages = CustomPageAPI.getDrawerPages()
  console.log('[DemoPageDrawer] Available pages:', pages, 'version:', _)
  return pages
})

// 直接启动TestPage
const openTestPage = async () => {
  console.log('[DemoPageDrawer] Opening TestPage directly')
  
  try {
    // 先确保页面已注册
    console.log('[DemoPageDrawer] Ensuring pages are registered...')
    const { ensureRegistration } = await import('@demo')
    await ensureRegistration()
    console.log('[DemoPageDrawer] Pages registered, now opening...')
    
    // 使用CustomPageAPI打开TestPage
    const instance = await CustomPageAPI.open('ui-test-page')
    
    if (instance) {
      ElMessage({
        type: 'success',
        message: '已在分屏中打开TestPage'
      })
      // 关闭抽屉
      visible.value = false
    } else {
      ElMessage({
        type: 'error',
        message: '无法打开TestPage'
      })
    }
  } catch (error) {
    console.error('[DemoPageDrawer] Failed to open TestPage:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage({
      type: 'error',
      message: `打开TestPage失败：${errorMessage}`
    })
  }
}

// 直接启动LlmTranslatePage
const openLlmTranslatePage = async () => {
  console.log('[DemoPageDrawer] Opening LlmTranslatePage directly')
  
  try {
    // 先确保页面已注册
    console.log('[DemoPageDrawer] Ensuring pages are registered...')
    const { ensureRegistration } = await import('@demo')
    await ensureRegistration()
    console.log('[DemoPageDrawer] Pages registered, now opening...')
    
    // 使用CustomPageAPI打开LlmTranslatePage
    const instance = await CustomPageAPI.open('llm-translate-page')
    
    if (instance) {
      ElMessage({
        type: 'success',
        message: '已在分屏中打开LLM批量翻译'
      })
      // 关闭抽屉
      visible.value = false
    } else {
      ElMessage({
        type: 'error',
        message: '无法打开LLM批量翻译'
      })
    }
  } catch (error) {
    console.error('[DemoPageDrawer] Failed to open LlmTranslatePage:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage({
      type: 'error',
      message: `打开LLM批量翻译失败：${errorMessage}`
    })
  }
}

// 直接启动VueFlowTestPage（阶段0测试）
const openVueFlowTestPage = async () => {
  console.log('[DemoPageDrawer] Opening VueFlowTestPage directly')
  
  try {
    // 先确保页面已注册
    console.log('[DemoPageDrawer] Ensuring pages are registered...')
    const { ensureRegistration } = await import('@demo')
    await ensureRegistration()
    console.log('[DemoPageDrawer] Pages registered, now opening...')
    
    // 使用CustomPageAPI打开VueFlowTestPage
    const instance = await CustomPageAPI.open('vueflow-test-page')
    
    if (instance) {
      ElMessage({
        type: 'success',
        message: '✅ 阶段0测试：VueFlow测试页已打开'
      })
      // 关闭抽屉
      visible.value = false
    } else {
      ElMessage({
        type: 'error',
        message: '❌ 无法打开VueFlow测试页'
      })
    }
  } catch (error) {
    console.error('[DemoPageDrawer] Failed to open VueFlowTestPage:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage({
      type: 'error',
      message: `❌ 打开VueFlow测试页失败：${errorMessage}`
    })
  }
}

// 打开Demo页面的处理函数
const openDemoPage = async (page: CustomPageConfig) => {
  console.log('[DemoPageDrawer] Opening page:', page.id)
  
  try {
    // 先确保页面已注册
    console.log('[DemoPageDrawer] Ensuring pages are registered...')
    const { ensureRegistration } = await import('@demo')
    await ensureRegistration()
    console.log('[DemoPageDrawer] Pages registered, now opening...')
    
    // 使用CustomPageAPI打开页面
    const instance = await CustomPageAPI.open(page.id)
    
    if (instance) {
      ElMessage({
        type: 'success',
        message: `已打开：${page.name}`
      })
      // 关闭抽屉
      visible.value = false
    } else {
      ElMessage({
        type: 'error',
        message: `无法打开页面：${page.name}`
      })
    }
  } catch (error) {
    console.error('[DemoPageDrawer] Failed to open page:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    ElMessage({
      type: 'error',
      message: `打开页面失败：${errorMessage}`
    })
  }
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
    margin: 0 0 16px 0;
    color: var(--obsidian-text-secondary);
    font-size: 0.9rem;
  }
  
  .demo-actions-header {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    
    .el-button {
      font-weight: 500;
    }
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
