# LeftContent 组件模块

SearchAndScraper 的左侧内容区域组件集合。

## 组件结构

```
LeftContent/
├── LeftPanel.vue              # 左侧主面板（容器组件）
├── SearchBox.vue              # 搜索框组件
├── BrowserViewContainer.vue   # BrowserView占位容器
├── index.ts                   # 组件导出
└── README.md                  # 本文档
```

## 组件说明

### 1. LeftPanel.vue
**职责**: 左侧主面板容器，协调子组件的显示切换

**Props**:
- `isBrowserViewVisible: boolean` - BrowserView是否可见
- `searchQuery: string` - 搜索查询文本

**Emits**:
- `update:searchQuery` - 更新搜索查询文本
- `search(query: string, engine: string)` - 触发搜索

**Expose**:
- `panelRef: HTMLElement` - 面板DOM引用
- `browserViewContainerRef: ComponentInstance` - BrowserView容器组件引用

### 2. SearchBox.vue
**职责**: 搜索引擎选择和搜索输入框

**Props**:
- `modelValue: string` - 搜索文本（v-model绑定）

**Emits**:
- `update:modelValue` - 更新搜索文本
- `search(query: string, engine: string)` - 触发搜索

**功能**:
- 搜索引擎选择（Google/Bing/Baidu）
- 搜索引擎偏好保存到localStorage
- 回车键触发搜索

### 3. BrowserViewContainer.vue
**职责**: BrowserView 占位容器

**Expose**:
- `containerRef: HTMLElement` - 容器DOM引用

**说明**: 
这是一个简单的占位容器，实际的BrowserView会通过Electron覆盖在这个容器上。

## 使用示例

```vue
<template>
  <LeftPanel
    ref="leftPanelRef"
    :is-browser-view-visible="isBrowserViewVisible"
    :search-query="searchQuery"
    @update:search-query="searchQuery = $event"
    @search="handleSearch"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { LeftPanel } from './LeftContent'

const leftPanelRef = ref<InstanceType<typeof LeftPanel> | null>(null)
const isBrowserViewVisible = ref(false)
const searchQuery = ref('')

const handleSearch = (query: string, engine: string) => {
  console.log('Search:', query, 'Engine:', engine)
  isBrowserViewVisible.value = true
}
</script>
```

## 重构原因

将左侧面板拆分为独立的子组件有以下优势：

1. **关注点分离**: 每个组件只负责自己的业务逻辑
2. **可维护性**: 更容易定位和修复问题
3. **可测试性**: 每个组件可以独立测试
4. **可复用性**: 子组件可以在其他地方复用
5. **代码清晰**: 主组件代码量减少，更易理解

## 与父组件的交互

父组件 `SearchAndScraperPanel.vue` 通过以下方式与LeftContent交互：

1. **Props传递**: 传递状态数据
2. **事件监听**: 监听用户操作
3. **Ref访问**: 访问子组件的DOM元素（用于计算BrowserView bounds）

## 注意事项

1. LeftPanel组件必须通过`defineExpose`暴露`panelRef`，父组件需要它来计算BrowserView的位置
2. SearchBox的搜索引擎选择会保存到localStorage，在组件挂载时自动恢复
3. BrowserViewContainer只是占位容器，实际的BrowserView由Electron主进程管理

