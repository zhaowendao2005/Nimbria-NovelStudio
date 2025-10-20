# 📖 CustomPageManager 使用文档

## 概述

CustomPageManager 是 Nimbria 项目中的通用页面管理系统，用于统一管理自定义页面的注册、打开、关闭和生命周期。它提供了完整的分屏系统集成，支持单例模式、懒加载、权限控制等高级功能。

## 核心架构

```
CustomPageManager 系统架构
├── CustomPageAPI          # 统一对外接口
├── CustomPageManager      # 核心页面管理器
├── PageRegistry          # 页面注册表
└── PaneContent           # 渲染集成层
```

## 主要接口

### 1. 页面注册

```typescript
import { CustomPageAPI } from '@service/CustomPageManager'

// 单个页面注册
CustomPageAPI.register({
  id: 'my-page',                    // 唯一标识
  name: '我的页面',                  // 显示名称
  title: 'My Custom Page',          // 标签页标题
  description: '这是一个自定义页面',   // 描述
  category: 'tool',                 // 分类
  icon: 'Settings',                 // 图标
  tabType: 'mypage',               // 标签页类型（重要！）
  component: () => import('./MyPage.vue'), // 懒加载组件
  showInDrawer: true,              // 在抽屉中显示
  tags: ['custom', 'tool']         // 搜索标签
})

// 批量注册
CustomPageAPI.registerAll([
  { /* 页面配置1 */ },
  { /* 页面配置2 */ }
])
```

### 2. 页面操作

```typescript
// 打开页面
const instance = await CustomPageAPI.open('my-page')

// 带选项打开
const instance = await CustomPageAPI.open('my-page', {
  paneId: 'specific-pane',     // 指定面板
  forceNew: true,              // 强制新建
  focus: true,                 // 自动聚焦
  params: { mode: 'debug' }    // 传递参数
})

// 关闭页面实例
CustomPageAPI.close(instance.id)

// 关闭页面所有实例
CustomPageAPI.closeAll('my-page')
```

### 3. 页面查询

```typescript
// 获取所有页面
const allPages = CustomPageAPI.getAvailablePages()

// 按分类获取
const demoPages = CustomPageAPI.getPagesByCategory('demo')

// 获取抽屉显示的页面
const drawerPages = CustomPageAPI.getDrawerPages()

// 搜索页面
const results = CustomPageAPI.search('测试')

// 检查页面是否已打开
const isOpen = CustomPageAPI.isPageOpen('my-page')

// 获取活跃实例
const instances = CustomPageAPI.getActiveInstances()
```

## 配置选项详解

### CustomPageConfig 接口

```typescript
interface CustomPageConfig {
  // === 必填字段 ===
  id: string                    // 页面唯一标识
  name: string                  // 显示名称
  title: string                 // 标签页标题
  category: string              // 分类（demo/tool/util等）
  icon: string                  // Element Plus 图标名
  component: () => Promise<any> // Vue组件懒加载函数
  tabType: string              // 标签页类型（用于渲染识别）
  
  // === 可选字段 ===
  description?: string          // 页面描述
  version?: string             // 版本号
  tags?: string[]              // 搜索标签
  
  // === 显示控制 ===
  showInDrawer?: boolean       // 在设置抽屉中显示（默认false）
  showInNavbar?: boolean       // 在导航栏显示（默认false）
  showInMenu?: boolean         // 在菜单中显示（默认false）
  
  // === 行为控制 ===
  singleton?: boolean          // 单例模式（默认true）
  closable?: boolean          // 可关闭（默认true）
  draggable?: boolean         // 可拖拽（默认true）
  
  // === 权限控制 ===
  permissions?: string[]       // 需要的权限列表
  devOnly?: boolean           // 仅开发模式显示（默认false）
}
```

### PageOpenOptions 接口

```typescript
interface PageOpenOptions {
  paneId?: string             // 指定打开的面板ID
  forceNew?: boolean          // 强制创建新实例（忽略单例）
  focus?: boolean             // 是否自动聚焦（默认true）
  params?: Record<string, any> // 传递给页面的参数
}
```

## 高级功能

### 1. 单例模式

```typescript
// 单例页面（默认行为）
CustomPageAPI.register({
  id: 'settings-page',
  singleton: true,  // 只允许一个实例
  // ...
})

// 多实例页面
CustomPageAPI.register({
  id: 'editor-page',
  singleton: false, // 允许多个实例
  // ...
})
```

### 2. 权限控制

```typescript
CustomPageAPI.register({
  id: 'admin-panel',
  permissions: ['admin', 'manage'],
  devOnly: true,  // 仅开发模式
  // ...
})
```

### 3. 参数传递

```typescript
// 打开时传递参数
const instance = await CustomPageAPI.open('editor-page', {
  params: { 
    fileId: '123',
    mode: 'edit'
  }
})

// 在组件中接收参数
// MyPage.vue
<script setup lang="ts">
const props = defineProps<{
  instanceId?: string
  tabId?: string
}>()

// 获取实例参数
const instance = CustomPageAPI.findInstanceByTabId(props.tabId)
const params = instance?.params // { fileId: '123', mode: 'edit' }
</script>
```

### 4. 生命周期管理

```typescript
// 监听实例变化
const instances = CustomPageAPI.getActiveInstances()

// 更新活跃时间
CustomPageAPI.updateActivity(instanceId)

// 获取统计信息
const stats = CustomPageAPI.getInstanceStats()
```

## 最佳实践

### 1. 组件结构

```vue
<!-- MyPage.vue -->
<template>
  <div class="my-page">
    <div class="page-header">
      <h1>{{ pageTitle }}</h1>
    </div>
    <div class="page-content">
      <!-- 页面内容 -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CustomPageAPI } from '@service/CustomPageManager'

const props = defineProps<{
  instanceId?: string
  tabId?: string
}>()

// 获取实例信息
const instance = computed(() => 
  props.tabId ? CustomPageAPI.findInstanceByTabId(props.tabId) : null
)

const pageTitle = computed(() => instance.value?.config.title || '未知页面')
</script>
```

### 2. 错误处理

```typescript
try {
  const instance = await CustomPageAPI.open('my-page')
  if (!instance) {
    console.error('页面打开失败')
    return
  }
  // 成功处理
} catch (error) {
  console.error('页面操作异常:', error)
  ElMessage.error('操作失败')
}
```

### 3. 性能优化

```typescript
// 使用懒加载
component: () => import('./MyPage.vue')

// 预加载关键页面
await import('./CriticalPage.vue')
```

