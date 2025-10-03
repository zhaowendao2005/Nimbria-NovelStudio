# Vditor Markdown编辑器集成说明

## 📦 已完成的工作

### 1. 依赖安装
- ✅ 已添加 `vditor: ^3.10.7` 到 package.json

### 2. 创建的组件

#### MarkdownEditor.vue
**位置**: `src/pages/project-page/components/MarkdownEditor.vue`

**功能**:
- 基于Vditor的IR模式（即时渲染，类似Obsidian）
- 支持编辑模式和只读模式
- 完整的工具栏配置
- 支持代码高亮、数学公式（KaTeX）、表格等
- 双向数据绑定 (v-model)

**使用方式**:
```vue
<MarkdownEditor 
  v-model="content"
  :readonly="false"
  @change="handleChange"
/>
```

#### MarkdownViewer.vue
**位置**: `src/pages/project-page/components/MarkdownViewer.vue`

**功能**:
- 纯渲染模式（只读）
- 使用Vditor的静态渲染方法
- 支持代码高亮、数学公式、图表等
- 自动处理特殊内容（懒加载图片、媒体渲染）

**使用方式**:
```vue
<MarkdownViewer :content="markdownContent" />
```

#### MarkdownTab.vue
**位置**: `src/pages/project-page/components/MarkdownTab.vue`

**功能**:
- 完整的标签页实现
- 面包屑导航
- 前进/后退按钮
- 编辑/阅览模式切换
- 集成MarkdownEditor和MarkdownViewer
- 连接Pinia状态管理

**使用方式**:
```vue
<MarkdownTab :tab-id="tab.id" />
```

### 3. Pinia状态管理

#### markdown.store.ts
**位置**: `src/pages/project-page/stores/markdown.store.ts`

**核心功能**:
- 文件树管理
- 标签页管理（打开、关闭、切换）
- 导航历史（前进、后退）
- 内容保存
- 脏标记（未保存更改检测）

**主要API**:
```typescript
// 初始化
markdownStore.initializeFileTree()

// 文件操作
markdownStore.openFile(filePath)
markdownStore.findFileByPath(files, path)

// 标签页操作
markdownStore.closeTab(tabId)
markdownStore.switchTab(tabId)
markdownStore.updateTabContent(tabId, content)
markdownStore.switchTabMode(tabId, mode)

// 保存
markdownStore.saveTab(tabId)
markdownStore.saveAllTabs()

// 导航
markdownStore.goBack()
markdownStore.goForward()
```

#### markdown.mock.ts
**位置**: `src/pages/project-page/stores/markdown.mock.ts`

**内容**:
- 示例文件树数据
- 多个示例Markdown文件
- 包含各种Markdown特性的演示

### 4. 目录结构

```
src/pages/project-page/
├── components/
│   ├── MarkdownEditor.vue    # Vditor编辑器组件
│   ├── MarkdownViewer.vue    # Vditor查看器组件
│   └── MarkdownTab.vue        # 标签页组件（含面包屑和模式切换）
│
└── stores/
    ├── index.ts               # Store导出入口
    ├── markdown.store.ts      # Pinia状态管理
    ├── markdown.mock.ts       # Mock数据
    └── README.md              # Store使用说明
```

## 🚀 安装步骤

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

这会自动安装 `vditor` 依赖。

### 2. 在主页面中集成

在 `App.vue` 或主页面中：

```vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useMarkdownStore } from './stores'
import MarkdownTab from './components/MarkdownTab.vue'

const markdownStore = useMarkdownStore()

onMounted(() => {
  // 初始化文件树（加载mock数据）
  markdownStore.initializeFileTree()
  
  // 可选：自动打开一个文件
  markdownStore.openFile('参考资料源/README.md')
})

// 处理文件树节点双击
const handleNodeDoubleClick = (node: any) => {
  if (!node.isFolder) {
    markdownStore.openFile(node.path)
  }
}
</script>

<template>
  <div class="page-layout">
    <!-- 左侧：文件树 -->
    <el-aside class="file-tree-panel" width="280px">
      <el-tree
        :data="markdownStore.fileTree"
        :props="{ label: 'name', children: 'children' }"
        @node-dblclick="handleNodeDoubleClick"
      >
        <template #default="{ node, data }">
          <span class="tree-node">
            <el-icon v-if="data.isFolder"><Folder /></el-icon>
            <el-icon v-else><Document /></el-icon>
            <span>{{ node.label }}</span>
          </span>
        </template>
      </el-tree>
    </el-aside>
    
    <!-- 右侧：标签页内容 -->
    <el-main class="content-area">
      <!-- 使用Element Plus的Tabs -->
      <el-tabs
        v-if="markdownStore.openTabs.length > 0"
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
      
      <!-- 无打开文件时的提示 -->
      <el-empty v-else description="双击文件以打开" />
    </el-main>
  </div>
</template>

<style scoped>
.page-layout {
  display: flex;
  height: 100vh;
}

.file-tree-panel {
  border-right: 1px solid var(--obsidian-border, #e3e5e8);
  overflow-y: auto;
}

.content-area {
  flex: 1;
  padding: 0;
  overflow: hidden;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
```

## ⚙️ 配置说明

### Vditor编辑器配置

在 `MarkdownEditor.vue` 中可以修改Vditor配置：

```typescript
vditor = new Vditor(editorContainer.value, {
  height: '100%',
  mode: 'ir',  // 'wysiwyg' | 'ir' | 'sv'
  
  // 工具栏
  toolbar: [
    'emoji', 'headings', 'bold', 'italic',
    // ... 更多按钮
  ],
  
  // 预览配置
  preview: {
    markdown: {
      toc: true,        // 目录
      mark: true,       // 标记
      footnotes: true   // 脚注
    },
    math: {
      engine: 'KaTeX'   // 或 'MathJax'
    },
    hljs: {
      style: 'github',  // 代码主题
      lineNumber: false // 行号
    }
  }
})
```

### 主题配置

使用CSS变量可以自定义主题：

```css
:root {
  --obsidian-bg-primary: #ffffff;
  --obsidian-bg-secondary: #f5f6f8;
  --obsidian-border: #e3e5e8;
  --obsidian-text-primary: #2e3338;
  --obsidian-text-secondary: #6a6d74;
  --obsidian-accent: #5b7fff;
  --obsidian-hover-bg: #e9e9e9;
  --obsidian-code-bg: #f5f6f8;
}
```

## 📝 功能特性

### ✅ 已实现

- [x] Markdown编辑（IR模式，类似Obsidian）
- [x] Markdown查看（纯渲染模式）
- [x] 代码语法高亮
- [x] 数学公式渲染（KaTeX）
- [x] 表格支持
- [x] 任务列表
- [x] 文件树导航
- [x] 多标签页管理
- [x] 编辑/阅览模式切换
- [x] 面包屑导航
- [x] 前进/后退历史
- [x] 脏标记（未保存检测）
- [x] Pinia状态管理

### 🚧 待扩展

- [ ] 实际的文件保存（目前只是模拟）
- [ ] 文件搜索功能
- [ ] 快捷键支持（Ctrl+S保存等）
- [ ] 自动保存
- [ ] 本地存储持久化
- [ ] 文件拖拽排序
- [ ] 图片上传
- [ ] 导出功能（PDF/HTML）

## 🔧 调试提示

### 查看Store状态

在Vue DevTools中可以查看Pinia store的状态：

1. 打开Vue DevTools
2. 选择Pinia标签
3. 查看 `markdown` store
4. 可以实时查看文件树、打开的标签页等状态

### 测试Mock数据

Mock数据位于 `markdown.mock.ts`，包含：
- README.md（使用指南）
- 笔记1.md（功能演示）
- 笔记2.md（表格和任务列表）
- 文件夹1/子笔记1.md
- 文件夹1/子笔记2.md

## 📚 参考文档

- [Vditor官方文档](https://github.com/Vanessa219/vditor)
- [Vditor API文档](https://b3log.org/vditor/api/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Element Plus文档](https://element-plus.org/)

## 🆘 常见问题

### Q: Vditor样式不生效？
A: 确保在组件中导入了CSS：
```typescript
import 'vditor/dist/index.css'
```

### Q: 数学公式不渲染？
A: 检查KaTeX CDN是否可访问，或配置本地路径。

### Q: 编辑器高度不正常？
A: 确保父容器有明确的高度设置。

### Q: 如何自定义工具栏？
A: 修改 `MarkdownEditor.vue` 中的 `toolbar` 配置数组。

