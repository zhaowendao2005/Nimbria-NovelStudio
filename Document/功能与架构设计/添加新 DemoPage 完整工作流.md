# 🚀 添加新 DemoPage 完整工作流

## 概述

本文档详细说明如何在 Nimbria 项目中添加一个新的 DemoPage，包括文件创建、代码编写、注册配置等完整流程。

## 工作流步骤

### 步骤 1：创建页面目录结构

```bash
# 在 DemoPage 目录下创建新页面目录
Nimbria/Client/GUI/DemoPage/
├── index.ts                    # 总注册文件
├── TestPage/                   # 现有示例
└── MyNewPage/                  # 🆕 新页面目录
    ├── MyNewPage.vue          # 主组件
    ├── index.ts               # 页面导出
    ├── store.ts               # 状态管理（可选）
    └── composables.ts         # 组合式函数（可选）
```

### 步骤 2：编写页面组件

**创建 `MyNewPage/MyNewPage.vue`**

```vue
<template>
  <div class="my-new-page">
    <div class="page-header">
      <h1 class="page-title">我的新页面</h1>
      <p class="page-subtitle">这是一个演示页面</p>
    </div>
    
    <div class="page-content">
      <div class="demo-section">
        <h2>功能演示</h2>
        <el-button @click="handleClick" type="primary">
          点击测试
        </el-button>
        <p v-if="message">{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

// 接收实例参数
const props = defineProps<{
  instanceId?: string
  tabId?: string
}>()

const message = ref('')

const handleClick = () => {
  message.value = `页面实例ID: ${props.instanceId}`
  ElMessage.success('操作成功！')
}
</script>

<style scoped>
.my-new-page {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 2rem;
  color: #409eff;
  margin-bottom: 8px;
}

.page-subtitle {
  color: #666;
  font-size: 1.1rem;
}

.demo-section {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
}
</style>
```

### 步骤 3：创建页面导出文件

**创建 `MyNewPage/index.ts`**

```typescript
/**
 * MyNewPage 导出模块
 */

export { default as MyNewPage } from './MyNewPage.vue'

// 页面元信息
export const MyNewPageMeta = {
  name: 'MyNewPage',
  title: '我的新页面',
  description: '这是一个演示页面',
  category: 'demo',
  icon: 'Star',
  path: '/demo/my-new-page'
}
```

### 步骤 4：注册页面到系统

**修改 `DemoPage/index.ts`**

```typescript
// 页面注册函数（延迟加载，避免循环依赖）
export function registerDemoPages(): Promise<void> {
  if (registrationPromise) {
    return registrationPromise
  }
  
  registrationPromise = import('../../Service/CustomPageManager')
    .then(({ CustomPageAPI }) => {
      console.log('[DemoPage] Starting to register pages...')
      
      CustomPageAPI.registerAll([
        {
          id: 'ui-test-page',
          name: 'UI/UX测试页面',
          title: 'UI/UX Test Page',
          description: '综合测试各种UI组件和交互效果',
          category: 'demo',
          icon: 'TestTube',
          tabType: 'testpage',
          component: () => import('./TestPage/TestPage.vue'),
          showInDrawer: true,
          tags: ['ui', 'test', 'component', 'demo']
        },
        // 🆕 添加新页面
        {
          id: 'my-new-page',                    // 唯一ID
          name: '我的新页面',                    // 显示名称
          title: 'My New Page',                // 标签页标题
          description: '这是一个演示页面',        // 描述
          category: 'demo',                    // 分类
          icon: 'Star',                        // 图标
          tabType: 'mynewpage',               // 标签页类型（重要！）
          component: () => import('./MyNewPage/MyNewPage.vue'), // 组件
          showInDrawer: true,                 // 在抽屉中显示
          tags: ['demo', 'example', 'new']    // 搜索标签
        }
      ])
      
      console.log('[DemoPage] Pages registered successfully')
      console.log('[DemoPage] Registered pages:', CustomPageAPI.getDrawerPages().map(p => p.id))
    })
    .catch(err => {
      console.error('[DemoPage] Failed to register pages:', err)
      registrationPromise = null
      throw err
    })
  
  return registrationPromise
}
```

### 步骤 5：验证和测试

1. **启动开发服务器**
   ```bash
   cd Nimbria
   npm run dev
   ```

2. **测试页面注册**
   - 打开浏览器控制台
   - 查看是否有 `[DemoPage] Pages registered successfully` 日志
   - 确认新页面ID出现在注册列表中

3. **测试页面打开**
   - 点击左侧设置按钮
   - 打开 DemoPage 抽屉
   - 确认能看到新页面卡片
   - 点击卡片测试页面打开

4. **测试页面功能**
   - 确认页面正确渲染
   - 测试页面内的交互功能
   - 测试页面关闭和重新打开

## 高级配置选项

### 1. 添加状态管理

**创建 `MyNewPage/store.ts`**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMyNewPageStore = defineStore('myNewPage', () => {
  const count = ref(0)
  const message = ref('')
  
  const increment = () => {
    count.value++
  }
  
  const setMessage = (msg: string) => {
    message.value = msg
  }
  
  return {
    count,
    message,
    increment,
    setMessage
  }
})
```

### 2. 添加组合式函数

**创建 `MyNewPage/composables.ts`**

```typescript
import { ref, computed } from 'vue'

export function useMyNewPageState() {
  const loading = ref(false)
  const data = ref<any[]>([])
  
  const isEmpty = computed(() => data.value.length === 0)
  
  const loadData = async () => {
    loading.value = true
    try {
      // 模拟数据加载
      await new Promise(resolve => setTimeout(resolve, 1000))
      data.value = [1, 2, 3, 4, 5]
    } finally {
      loading.value = false
    }
  }
  
  return {
    loading,
    data,
    isEmpty,
    loadData
  }
}
```

### 3. 高级页面配置

```typescript
{
  id: 'advanced-page',
  name: '高级页面',
  title: 'Advanced Page',
  description: '具有高级功能的页面',
  category: 'tool',
  icon: 'Setting',
  tabType: 'advancedpage',
  component: () => import('./AdvancedPage/AdvancedPage.vue'),
  
  // 显示配置
  showInDrawer: true,
  showInNavbar: false,
  showInMenu: true,
  
  // 行为配置
  singleton: false,        // 允许多实例
  closable: true,
  draggable: true,
  
  // 权限配置
  permissions: ['admin'],
  devOnly: false,
  
  // 元数据
  version: '1.0.0',
  tags: ['advanced', 'tool', 'admin']
}
```

## 常见问题和解决方案

### 问题 1：页面不显示在抽屉中

**原因**：`showInDrawer: false` 或页面注册失败

**解决**：
1. 检查 `showInDrawer: true`
2. 查看控制台是否有注册错误
3. 确认 `framework-init.ts` 正确加载了 DemoPage

### 问题 2：页面显示 `[object Promise]`

**原因**：组件懒加载配置错误

**解决**：
1. 确认 `component: () => import('./MyPage.vue')` 语法正确
2. 检查组件文件路径是否正确
3. 确认组件有正确的 `export default`

### 问题 3：页面参数传递失败

**原因**：props 定义不正确

**解决**：
```vue
<script setup lang="ts">
// 正确的 props 定义
const props = defineProps<{
  instanceId?: string
  tabId?: string
}>()

// 获取实例参数
import { CustomPageAPI } from '@service/CustomPageManager'
const instance = CustomPageAPI.findInstanceByTabId(props.tabId)
const params = instance?.params
</script>
```

### 问题 4：页面关闭后无法重新打开

**原因**：实例清理问题（已在系统中修复）

**解决**：确保使用最新版本的 CustomPageManager

## 文件清单

添加一个新 DemoPage 需要修改/创建的文件：

### 必须创建的文件：
- ✅ `DemoPage/MyNewPage/MyNewPage.vue` - 主组件
- ✅ `DemoPage/MyNewPage/index.ts` - 导出文件

### 必须修改的文件：
- ✅ `DemoPage/index.ts` - 添加页面注册

### 可选创建的文件：
- 🔄 `DemoPage/MyNewPage/store.ts` - 状态管理
- 🔄 `DemoPage/MyNewPage/composables.ts` - 组合式函数
- 🔄 `DemoPage/MyNewPage/types.ts` - 类型定义

### 自动处理的文件：
- ✅ `boot/framework-init.ts` - 自动预加载注册
- ✅ `PaneContent.vue` - 自动渲染组件
- ✅ `DemoPageDrawer.vue` - 自动显示页面卡片

