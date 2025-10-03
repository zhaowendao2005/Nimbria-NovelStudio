# Stores目录结构说明

## 📁 文件组织

```
stores/
├── index.ts              # 导出所有stores和类型
├── markdown.store.ts     # Markdown状态管理（Pinia）
├── markdown.mock.ts      # Mock数据
└── README.md            # 本说明文档
```

## 🎯 设计原则

- **{}.store.ts**: Pinia状态管理，包含状态、计算属性和方法
- **{}.mock.ts**: Mock数据，用于开发和测试
- **Vue组件**: 只调用Pinia store，不直接使用mock数据

## 📦 Markdown Store

### 状态 (State)

```typescript
// 文件树数据
fileTree: MarkdownFile[]

// 打开的标签页
openTabs: MarkdownTab[]

// 当前激活的标签页ID
activeTabId: string | null

// 导航历史
navigationHistory: string[]
currentHistoryIndex: number
```

### 计算属性 (Computed)

```typescript
// 当前激活的标签页
activeTab: MarkdownTab | null

// 是否可以后退/前进
canGoBack: boolean
canGoForward: boolean

// 是否有未保存的标签页
hasDirtyTabs: boolean
```

### 方法 (Actions)

```typescript
// 初始化
initializeFileTree(): void

// 文件操作
openFile(filePath: string): MarkdownTab | null
findFileByPath(files: MarkdownFile[], path: string): MarkdownFile | null

// 标签页操作
closeTab(tabId: string): void
switchTab(tabId: string): void
updateTabContent(tabId: string, content: string): void
switchTabMode(tabId: string, mode: 'edit' | 'view'): void

// 保存
saveTab(tabId: string): void
saveAllTabs(): void

// 导航
goBack(): void
goForward(): void
```

## 💡 使用示例

### 在Vue组件中使用

```vue
<script setup lang="ts">
import { useMarkdownStore } from '../stores'

const markdownStore = useMarkdownStore()

// 初始化
onMounted(() => {
  markdownStore.initializeFileTree()
})

// 打开文件
const handleFileClick = (filePath: string) => {
  markdownStore.openFile(filePath)
}

// 保存
const handleSave = () => {
  if (markdownStore.activeTab) {
    markdownStore.saveTab(markdownStore.activeTab.id)
  }
}

// 使用计算属性
const canSave = computed(() => {
  return markdownStore.activeTab?.isDirty ?? false
})
</script>

<template>
  <div>
    <!-- 显示所有打开的标签页 -->
    <div v-for="tab in markdownStore.openTabs" :key="tab.id">
      {{ tab.fileName }}
    </div>
    
    <!-- 保存按钮 -->
    <button @click="handleSave" :disabled="!canSave">
      保存
    </button>
  </div>
</template>
```

### 在主页面集成

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useMarkdownStore } from './stores'
import MarkdownTab from './components/MarkdownTab.vue'

const markdownStore = useMarkdownStore()

onMounted(() => {
  // 初始化文件树
  markdownStore.initializeFileTree()
  
  // 可选：自动打开一个文件
  markdownStore.openFile('参考资料源/README.md')
})

// 双击文件树节点打开文件
const handleNodeDoubleClick = (node: any) => {
  if (!node.isFolder) {
    markdownStore.openFile(node.path)
  }
}
</script>

<template>
  <div class="app">
    <!-- 左侧文件树 -->
    <el-aside>
      <el-tree
        :data="markdownStore.fileTree"
        @node-dblclick="handleNodeDoubleClick"
      />
    </el-aside>
    
    <!-- 主内容区：标签页 -->
    <el-main>
      <el-tabs
        v-model="markdownStore.activeTabId"
        type="card"
        closable
        @tab-remove="markdownStore.closeTab"
      >
        <el-tab-pane
          v-for="tab in markdownStore.openTabs"
          :key="tab.id"
          :label="tab.fileName"
          :name="tab.id"
        >
          <MarkdownTab :tab-id="tab.id" />
        </el-tab-pane>
      </el-tabs>
    </el-main>
  </div>
</template>
```

## 🔄 数据流

```
┌─────────────┐
│ Mock数据    │ (markdown.mock.ts)
└──────┬──────┘
       │ 初始化
       ↓
┌─────────────┐
│ Pinia Store │ (markdown.store.ts)
└──────┬──────┘
       │ 导出
       ↓
┌─────────────┐
│ Vue组件     │
└─────────────┘
```

## 📝 Mock数据结构

### MarkdownFile

```typescript
interface MarkdownFile {
  id: string              // 唯一标识
  name: string            // 文件/文件夹名
  path: string            // 完整路径
  content: string         // Markdown内容（文件夹为空）
  lastModified: Date      // 最后修改时间
  isFolder: boolean       // 是否为文件夹
  children?: MarkdownFile[] // 子项（仅文件夹）
}
```

### MarkdownTab

```typescript
interface MarkdownTab {
  id: string              // 标签页ID
  filePath: string        // 文件路径
  fileName: string        // 文件名
  content: string         // 当前内容
  mode: 'edit' | 'view'   // 编辑/查看模式
  isDirty: boolean        // 是否有未保存修改
}
```

## 🚀 扩展建议

### 添加新的Store

1. 创建 `{feature}.store.ts`
2. 创建 `{feature}.mock.ts`
3. 在 `index.ts` 中导出

### 添加持久化

可以集成 `pinia-plugin-persistedstate`:

```typescript
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

export const useMarkdownStore = defineStore('markdown', () => {
  // 使用localStorage持久化
  const fileTree = useLocalStorage('markdown-file-tree', [])
  
  // ...其他代码
})
```

### 添加API集成

```typescript
// 在store中添加异步action
const loadFileFromServer = async (filePath: string) => {
  try {
    const response = await fetch(`/api/files/${filePath}`)
    const data = await response.json()
    // 更新状态
  } catch (error) {
    console.error('加载失败:', error)
  }
}
```

