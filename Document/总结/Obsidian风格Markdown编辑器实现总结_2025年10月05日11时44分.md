# Obsidian 风格 Markdown 编辑器实现总结

**项目**: Nimbria-NovelStudio  
**时间**: 2025年10月05日11:44:00  
**阶段**: Reference-Page 项目页面 Markdown 编辑器系统实现

---

## 📋 目录

1. [已实现的功能](#已实现的功能)
2. [技术栈与核心依赖](#技术栈与核心依赖)
3. [项目架构与规范](#项目架构与规范)
4. [核心实现细节](#核心实现细节)
5. [踩坑记录与解决方案](#踩坑记录与解决方案)
6. [经验总结](#经验总结)
7. [标准工作流程](#标准工作流程)

---

## 🎯 已实现的功能

### 1. Obsidian 风格 UI 布局
- ✅ **三栏布局**：左侧导航栏（48px）+ 文件浏览器（280px）+ 主编辑区（flex）
- ✅ **可调整宽度**：文件浏览器和右侧大纲面板支持拖拽调整宽度
- ✅ **主题适配**：完整的 Obsidian 风格 CSS 变量系统

### 2. 文件树系统
- ✅ **树形结构展示**：使用 `el-tree` 实现文件夹和文件的层级展示
- ✅ **单击打开文件**：点击文件节点即可在新标签页中打开
- ✅ **防重复打开**：通过完整路径判断，避免重复创建标签页
- ✅ **图标区分**：文件夹和文件使用不同的 Element Plus 图标
- ✅ **工具栏功能**：
  - 新建文本文件
  - 新建文件夹
  - 自动定位当前文件
  - 排序菜单（下拉选择）
  - 自动展开/折叠按钮（与 `el-tree` 联动）

### 3. 标签页系统
- ✅ **多标签页管理**：基于 `el-tabs` 实现
- ✅ **标签页状态**：
  - 文件路径（唯一标识）
  - 文件名（显示标题）
  - 内容缓存
  - 编辑/查看模式
  - 脏数据标记（isDirty）
- ✅ **标签页操作**：
  - 关闭标签页
  - 切换标签页
  - 自动聚焦最新打开的标签页

### 4. Markdown 编辑器（基于 Vditor）
- ✅ **编辑模式**：
  - IR（Instant Rendering）模式，类似 Obsidian 的实时渲染
  - 完整的工具栏（表情、标题、粗体、斜体、链接、列表等）
  - 固定工具栏（`pin: true`）
  - 自动填充垂直高度（flex 布局）
- ✅ **查看模式**：
  - 纯静态渲染（使用 Vditor 静态方法）
  - 支持代码高亮（`highlightRender`）
  - 支持数学公式（`mathRender` - KaTeX）
  - 支持代码块（`codeRender`）
  - 支持图片懒加载（`lazyLoadImageRender`）
  - 支持多媒体（`mediaRender`）
  - 自定义滚动条（完全脱离 Vditor 内置滚动）

### 5. 标签页头部功能
- ✅ **导航按钮**：
  - 后退按钮（禁用状态判断）
  - 前进按钮（禁用状态判断）
- ✅ **面包屑路径**：显示文件相对于项目的路径
- ✅ **模式切换**：
  - 编辑模式按钮
  - 查看模式按钮
  - 按钮组样式（`el-button-group`）

### 6. 状态管理（Pinia）
- ✅ **文件树状态**：`fileTree`
- ✅ **标签页状态**：`openTabs`、`activeTabId`
- ✅ **导航历史**：`navigationHistory`、`currentHistoryIndex`
- ✅ **计算属性**：`activeTab`、`canGoBack`、`canGoForward`、`hasDirtyTabs`
- ✅ **操作方法**：
  - `initializeFileTree()`
  - `openFile(filePath)`
  - `closeTab(tabId)`
  - `updateTabContent(tabId, content)`
  - `switchTabMode(tabId, mode)`
  - `saveTab(tabId)`
  - `goBack()` / `goForward()`

### 7. Mock 数据系统
- ✅ **文件树 Mock**：`markdown.mock.ts`
- ✅ **文件查找工具**：`findMockFileByPath(path)`
- ✅ **示例文件**：README.md、笔记1.md、笔记2.md、子笔记等

---

## 🛠️ 技术栈与核心依赖

### 前端框架
- **Vue 3**：Composition API
- **TypeScript**：类型安全
- **Vite**：构建工具

### UI 组件库
- **Element Plus**：
  - `el-tree`：文件树
  - `el-tabs` / `el-tab-pane`：标签页
  - `el-button` / `el-button-group`：按钮
  - `el-icon`：图标
  - `el-tooltip`：提示
  - `el-dropdown`：下拉菜单
  - `el-breadcrumb`：面包屑
  - `el-empty`：空状态

### Markdown 引擎
- **Vditor** (v3.10.6)：
  - **编辑模式**：`new Vditor(container, options)`
    - `mode: 'ir'`：Instant Rendering 模式
    - `height: '100%'`：自适应高度
    - `toolbarConfig.pin: true`：固定工具栏
    - `cache.enable: false`：禁用缓存
  - **查看模式**：静态方法
    - `Vditor.md2html(markdown, options)`：Markdown 转 HTML
    - `Vditor.highlightRender(options, element)`：代码高亮
    - `Vditor.mathRender(element, options)`：数学公式
    - `Vditor.codeRender(element)`：代码块渲染
    - `Vditor.lazyLoadImageRender(element)`：图片懒加载
    - `Vditor.mediaRender(element)`：多媒体渲染

### 状态管理
- **Pinia**：Vue 3 官方状态管理库
  - `defineStore`：定义 store
  - `ref`：响应式状态
  - `computed`：计算属性

### 样式
- **SCSS**：全局样式和组件样式
- **CSS 变量**：Obsidian 主题系统
- **Flexbox**：响应式布局

---

## 📁 项目架构与规范

### 目录结构

```
Reference/Reference-Page/ReferencePage/src/pages/project-page/
├── App.vue                          # 主应用组件
├── main.ts                          # 入口文件（Pinia 初始化）
├── styles.scss                      # 全局样式
├── components/                      # 组件目录
│   ├── MarkdownEditor.vue          # Markdown 编辑器（Vditor IR 模式）
│   ├── MarkdownViewer.vue          # Markdown 查看器（Vditor 静态渲染）
│   └── MarkdownTab.vue             # 单个标签页组件（包含头部和主体）
└── stores/                          # Pinia 状态管理
    ├── markdown.store.ts           # Markdown 相关状态和方法
    └── markdown.mock.ts            # Mock 数据
```

### 文件命名规范

#### Vue 组件
- ✅ **PascalCase**：`MarkdownEditor.vue`、`MarkdownTab.vue`
- ❌ **kebab-case**：`markdown-editor.vue`（不使用）

#### TypeScript 文件
- ✅ **Store 文件**：`{name}.store.ts`（如 `markdown.store.ts`）
- ✅ **Mock 文件**：`{name}.mock.ts`（如 `markdown.mock.ts`）
- ✅ **类型文件**：`types.ts` 或 `{name}.types.ts`

#### 样式文件
- ✅ **全局样式**：`styles.scss`
- ✅ **组件样式**：在组件内使用 `<style scoped>`

### CSS 类命名规范

- ✅ **kebab-case**：`.markdown-editor`、`.tab-main`、`.file-tree`
- ✅ **BEM 风格**（可选）：`.sidebar-left__header`、`.button-group--active`

### 导入路径约定

```typescript
// ✅ 相对路径（组件内）
import MarkdownEditor from './components/MarkdownEditor.vue'
import { useMarkdownStore } from './stores/markdown.store'

// ✅ 第三方库
import { defineStore } from 'pinia'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

// ✅ Element Plus（按需导入）
import { ElTree, ElTabs, ElIcon } from 'element-plus'
```

### 组件通信规范

1. **Props**：父 → 子传递数据
   ```typescript
   interface Props {
     modelValue?: string
     readonly?: boolean
   }
   ```

2. **Emits**：子 → 父触发事件
   ```typescript
   interface Emits {
     (e: 'update:modelValue', value: string): void
     (e: 'change', value: string): void
   }
   ```

3. **Pinia Store**：跨组件共享状态
   ```typescript
   const markdownStore = useMarkdownStore()
   markdownStore.openFile(filePath)
   ```

4. **defineExpose**：暴露子组件方法给父组件
   ```typescript
   defineExpose({
     getValue: () => vditor?.getValue() || '',
     setValue: (value: string) => vditor?.setValue(value)
   })
   ```

---

## 🔧 核心实现细节

### 1. Pinia 初始化（main.ts）

```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)  // ⚠️ 必须在使用 store 之前调用
app.mount('#app')
```

**关键点**：
- 必须在 `app.mount()` 之前调用 `app.use(pinia)`
- 否则会报错：`"getActivePinia()" was called but there was no active Pinia`

### 2. 文件树单击打开文件（App.vue）

```vue
<el-tree
  ref="treeRef"
  :data="markdownStore.fileTree"
  :props="{ label: 'name', children: 'children' }"
  default-expand-all
  highlight-current
  node-key="id"
  @node-click="handleNodeClick"
>
  <template #default="{ node, data }">
    <span class="tree-node">
      <el-icon v-if="data.isFolder"><Folder /></el-icon>
      <el-icon v-else><Document /></el-icon>
      <span class="node-label">{{ node.label }}</span>
    </span>
  </template>
</el-tree>

<script setup>
const handleNodeClick = (data: any) => {
  if (!data.isFolder) {
    markdownStore.openFile(data.path)  // 通过完整路径打开
  }
}
</script>
```

**关键点**：
- 使用 `@node-click` 而非 `@node-dblclick`（用户要求单击）
- 通过 `data.path`（完整路径）判断是否重复，而非 `data.name`
- `node-key="id"` 确保节点唯一性

### 3. 标签页防重复打开（markdown.store.ts）

```typescript
const openFile = (filePath: string) => {
  // 检查是否已经打开（通过完整路径）
  const existingTab = openTabs.value.find(tab => tab.filePath === filePath)
  
  if (existingTab) {
    // 切换到已存在的标签页
    activeTabId.value = existingTab.id
    addToHistory(filePath)
    return existingTab
  }
  
  // 创建新标签页
  const file = findFileByPath(fileTree.value, filePath)
  if (!file || file.isFolder) return null
  
  const newTab: MarkdownTab = {
    id: `tab-${Date.now()}-${Math.random()}`,
    filePath: file.path,
    fileName: file.name,
    content: file.content,
    mode: 'view',
    isDirty: false
  }
  
  openTabs.value.push(newTab)
  activeTabId.value = newTab.id
  addToHistory(filePath)
  
  return newTab
}
```

**关键点**：
- 使用 `filePath`（完整路径）而非 `fileName` 判断重复
- 避免不同目录下同名文件的冲突

### 4. Markdown 编辑器自适应高度（MarkdownEditor.vue）

```vue
<template>
  <div ref="editorContainer" class="markdown-editor"></div>
</template>

<script setup>
onMounted(() => {
  vditor = new Vditor(editorContainer.value, {
    height: '100%',  // ✅ 使用百分比而非固定像素
    mode: 'ir',
    // ... 其他配置
  })
})
</script>

<style scoped>
.markdown-editor {
  flex: 1;          /* 自动填充父容器 */
  min-height: 0;    /* 允许 flex 压缩 */
  overflow: hidden; /* 内容溢出由 Vditor 内部处理 */
}
</style>
```

**关键点**：
- `height: '100%'` 而非 `height: 360`（固定像素）
- `flex: 1` 使编辑器填充父容器可用空间
- `min-height: 0` 是 Flex 布局中的关键属性

### 5. Markdown 查看器自定义滚动条（MarkdownViewer.vue + styles.scss）

#### MarkdownViewer.vue
```vue
<template>
  <div class="markdown-viewer" ref="viewerContainer">
    <div v-html="renderedHtml"></div>
  </div>
</template>

<style scoped>
.markdown-viewer {
  width: 100%;
  height: 100%;
  overflow-y: auto;  /* 自定义滚动条 */
  padding: 20px 40px;
}
</style>
```

#### styles.scss（全局样式）
```scss
// ❌ 错误写法（在全局 SCSS 中使用 :deep()）
.markdown-tabs {
  :deep(.el-tabs__content) {
    min-height: 0;  // 不会生效！
  }
}

// ✅ 正确写法（直接嵌套选择器）
.markdown-tabs {
  .el-tabs__content {
    min-height: 0 !important;  // 生效了！
  }
  
  .el-tab-pane {
    min-height: 0 !important;
  }
}

.editor-main {
  flex: 1;
  min-height: 0;        // 关键！
  overflow: hidden;     // 不抢滚动
}

.tab-main {
  flex: 1;
  min-height: 0;        // 关键！
  overflow: hidden;
}
```

**关键点**：
- `:deep()` 只在 Vue SFC 的 `<style scoped>` 中有效
- 全局 SCSS 文件中直接使用嵌套选择器
- 使用 `!important` 覆盖 Element Plus 的默认样式
- Flex 链路中的每一层都需要 `min-height: 0`

### 6. 自动展开/折叠按钮与 el-tree 联动（App.vue）

```vue
<template>
  <!-- 工具栏按钮 -->
  <el-tooltip content="自动展开/折叠" placement="bottom">
    <button class="tool-btn" @click="toggleExpandAll">
      <el-icon><Expand /></el-icon>
    </button>
  </el-tooltip>

  <!-- 文件树 -->
  <el-tree
    ref="treeRef"
    :data="markdownStore.fileTree"
    :default-expand-all="isExpandAll"
    node-key="id"
  />
</template>

<script setup>
import { ref } from 'vue'
import type { ElTree } from 'element-plus'

const treeRef = ref<InstanceType<typeof ElTree>>()
const isExpandAll = ref(true)

const toggleExpandAll = () => {
  isExpandAll.value = !isExpandAll.value
  
  if (isExpandAll.value) {
    // 展开所有节点
    const allKeys = getAllNodeKeys(markdownStore.fileTree)
    allKeys.forEach(key => {
      treeRef.value?.store.nodesMap[key]?.expand()
    })
  } else {
    // 折叠所有节点
    const allKeys = getAllNodeKeys(markdownStore.fileTree)
    allKeys.forEach(key => {
      treeRef.value?.store.nodesMap[key]?.collapse()
    })
  }
}

const getAllNodeKeys = (nodes: any[]): string[] => {
  const keys: string[] = []
  const traverse = (list: any[]) => {
    list.forEach(node => {
      keys.push(node.id)
      if (node.children) traverse(node.children)
    })
  }
  traverse(nodes)
  return keys
}
</script>
```

**关键点**：
- 使用 `ref<InstanceType<typeof ElTree>>()` 获取 `el-tree` 实例
- 通过 `treeRef.value?.store.nodesMap[key]?.expand()` 控制节点展开
- 递归获取所有节点的 key

---

## 🕳️ 踩坑记录与解决方案

### 坑 1：Pinia 未初始化错误

**错误信息**：
```
Uncaught Error: [🍍]: "getActivePinia()" was called but there was no active Pinia.
```

**原因**：
- 在 `main.ts` 中没有调用 `app.use(pinia)`
- 或者在 `app.use(pinia)` 之前就使用了 store

**解决方案**：
```typescript
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)  // ✅ 必须在 mount 之前
app.mount('#app')
```

**经验**：
- Pinia 必须在任何组件使用 store 之前初始化
- 按照 Vue 插件的标准顺序：`createApp → use(plugins) → mount`

---

### 坑 2：`:deep()` 在全局 SCSS 中不生效

**现象**：
- 在 `styles.scss` 中使用 `:deep(.el-tabs__content)` 设置样式
- 浏览器 DevTools 中查看，`min-height` 仍然是 `auto`
- 样式完全没有应用

**原因**：
- `:deep()` 是 Vue SFC 中用于穿透 scoped CSS 的特殊语法
- `styles.scss` 是全局样式文件，不是 scoped style
- 在全局 SCSS 中，`:deep()` 会被忽略

**错误写法**：
```scss
// styles.scss（全局文件）
.markdown-tabs {
  :deep(.el-tabs__content) {
    min-height: 0;  // ❌ 不会生效
  }
}
```

**正确写法**：
```scss
// styles.scss（全局文件）
.markdown-tabs {
  .el-tabs__content {
    min-height: 0 !important;  // ✅ 生效了
  }
}
```

**调试方法**：
```javascript
// Chrome DevTools Console
for (const sheet of document.styleSheets) {
  for (const rule of sheet.cssRules) {
    if (rule.selectorText?.includes('el-tabs__content')) {
      console.log(rule.cssText)
    }
  }
}
```

**经验**：
- `:deep()` 只在 `<style scoped>` 中使用
- 全局 SCSS 直接使用嵌套选择器
- 使用 `!important` 覆盖组件库的默认样式
- 使用 DevTools 检查实际生成的 CSS 规则

---

### 坑 3：Flex 布局中滚动条不显示

**现象**：
- `.markdown-viewer` 设置了 `overflow-y: auto`
- 内容明显超出容器高度
- 但滚动条不显示，无法滚动

**原因**：
- Flex 子项默认 `min-height: auto`（会"包住"内容）
- 父级 `.editor-main` 设置了 `overflow-y: auto`，抢占了滚动
- Flex 链路中缺少 `min-height: 0`

**诊断过程**：
```javascript
// Chrome DevTools Console
const viewer = document.querySelector('.markdown-viewer')
const computed = getComputedStyle(viewer)

console.log({
  clientHeight: viewer.clientHeight,
  scrollHeight: viewer.scrollHeight,
  hasScroll: viewer.scrollHeight > viewer.clientHeight,
  minHeight: computed.minHeight,
  overflow: computed.overflow
})

// 检查父级链路
let current = viewer.parentElement
while (current) {
  const style = getComputedStyle(current)
  console.log({
    className: current.className,
    minHeight: style.minHeight,
    overflow: style.overflow,
    flex: style.flex
  })
  current = current.parentElement
}
```

**发现问题**：
```json
{
  "el-tabs__content": {
    "minHeight": "auto",  // ❌ 应该是 0px
    "overflow": "hidden"
  },
  "editor-main": {
    "overflow": "auto"    // ❌ 抢占了滚动
  }
}
```

**解决方案**：
```scss
// 修复 Flex 链路
.editor-main {
  flex: 1;
  min-height: 0;        // ✅ 关键
  overflow: hidden;     // ✅ 不抢滚动
}

.markdown-tabs {
  min-height: 0;        // ✅ 关键
  
  .el-tabs__content {
    min-height: 0 !important;  // ✅ 关键
  }
  
  .el-tab-pane {
    min-height: 0 !important;  // ✅ 关键
  }
}

.tab-main {
  flex: 1;
  min-height: 0;        // ✅ 关键
  overflow: hidden;
}

.markdown-viewer {
  overflow-y: auto;     // ✅ 唯一滚动层
}
```

**Flex 布局滚动的黄金法则**：
1. **所有纵向 Flex 容器和子项都设置 `min-height: 0`**
2. **只在目标层设置 `overflow-y: auto`**
3. **父级链路都设置 `overflow: hidden`**

**经验**：
- Flex 子项默认 `min-height: auto` 是最常见的滚动问题根源
- 使用 DevTools 逐层检查 `computed` 样式（不是代码中写的值）
- 检查 `clientHeight` vs `scrollHeight` 判断是否应该有滚动
- 使用 MCP `chrome-devtools` 工具链实时调试

---

### 坑 4：编辑器高度固定，无法填充父容器

**现象**：
- 编辑模式下，编辑器高度固定为 360px
- 父容器 `.tab-main` 有 839px 可用空间
- 编辑器下方有大量空白

**原因**：
- Vditor 初始化时使用了固定高度：`height: 360`
- `.markdown-editor` 容器缺少 `flex: 1`

**错误写法**：
```typescript
// MarkdownEditor.vue
vditor = new Vditor(editorContainer.value, {
  height: 360,  // ❌ 固定像素
  // ...
})
```

**正确写法**：
```typescript
// MarkdownEditor.vue
vditor = new Vditor(editorContainer.value, {
  height: '100%',  // ✅ 百分比高度
  // ...
})
```

```scss
// MarkdownEditor.vue <style scoped>
.markdown-editor {
  flex: 1;          // ✅ 自动填充
  min-height: 0;    // ✅ 允许 flex 生效
  overflow: hidden;
}
```

**验证结果**：
```json
{
  "markdown-editor": {
    "clientHeight": 838,
    "flex": "1 1 0%",
    "heightRatio": "99.9%"  // ✅ 填满了父容器
  }
}
```

**经验**：
- 第三方库的高度配置优先使用百分比或 `'100%'`
- 容器需要配合 `flex: 1` 和 `min-height: 0`
- 使用 DevTools 检查实际高度和 flex 属性

---

### 坑 5：文件树节点双击不触发事件

**现象**：
- 使用 `@node-dblclick` 绑定双击事件
- 双击文件节点后，事件触发了
- 但 `markdownStore.openFile()` 没有执行，标签页没有创建

**原因**：
- 用户后来要求改为单击打开文件
- 需要将 `@node-dblclick` 改为 `@node-click`

**解决方案**：
```vue
<!-- ❌ 错误：双击 -->
<el-tree @node-dblclick="handleNodeDoubleClick" />

<!-- ✅ 正确：单击 -->
<el-tree @node-click="handleNodeClick" />

<script setup>
const handleNodeClick = (data: any) => {
  if (!data.isFolder) {
    markdownStore.openFile(data.path)
  }
}
</script>
```

**经验**：
- 明确用户交互方式（单击 vs 双击）
- 文件管理器通常使用单击选中、双击打开
- Obsidian 风格是单击直接打开

---

### 坑 6：同名文件重复打开标签页

**现象**：
- 不同目录下有同名文件（如 `笔记1.md` 和 `文件夹1/笔记1.md`）
- 点击后都创建了新标签页，没有复用

**原因**：
- 使用 `fileName` 判断是否重复
- 应该使用 `filePath`（完整路径）

**错误写法**：
```typescript
const existingTab = openTabs.value.find(tab => tab.fileName === fileName)
```

**正确写法**：
```typescript
const existingTab = openTabs.value.find(tab => tab.filePath === filePath)
```

**经验**：
- 文件的唯一标识应该是完整路径，而非文件名
- 考虑不同目录下同名文件的场景

---

## 💡 经验总结

### 1. Flex 布局滚动的核心原则

**黄金法则**：
```scss
// 父级链路（所有纵向 Flex 容器和子项）
.parent {
  display: flex;
  flex-direction: column;
  min-height: 0;      // ✅ 必需！
  overflow: hidden;   // ✅ 不抢滚动
}

.child {
  flex: 1;
  min-height: 0;      // ✅ 必需！
  overflow: hidden;   // ✅ 不抢滚动
}

// 最终滚动层
.scroll-target {
  overflow-y: auto;   // ✅ 唯一滚动
  height: 100%;
}
```

**为什么需要 `min-height: 0`？**
- Flex 子项默认 `min-height: auto`
- `auto` 会根据内容计算最小高度，导致容器"包住"内容
- 设置 `min-height: 0` 允许 flex 压缩子项

**调试技巧**：
- 使用 Chrome DevTools 逐层检查 `computed` 样式
- 检查 `clientHeight` vs `scrollHeight`
- 检查所有父级的 `min-height`、`overflow`、`flex`

### 2. `:deep()` 的正确使用场景

**适用场景**：
- ✅ Vue SFC 的 `<style scoped>` 中
- ✅ 需要穿透 scoped CSS 修改子组件样式

**不适用场景**：
- ❌ 全局 SCSS/CSS 文件
- ❌ 非 scoped 的 `<style>` 标签

**示例**：
```vue
<!-- 组件内 scoped style -->
<style scoped>
.parent {
  :deep(.child) {
    color: red;  // ✅ 可以穿透到子组件
  }
}
</style>
```

```scss
// 全局 styles.scss
.parent {
  .child {
    color: red;  // ✅ 直接嵌套即可
  }
}
```

### 3. Pinia 初始化顺序

**正确顺序**：
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)      // 1. 先注册 Pinia
app.use(ElementPlus) // 2. 再注册其他插件
app.mount('#app')   // 3. 最后挂载应用
```

**错误示例**：
```typescript
// ❌ 在 mount 之后注册
app.mount('#app')
app.use(pinia)  // 太晚了！

// ❌ 在组件中使用 store 之前没有注册
const app = createApp(App)
// 组件内已经调用了 useMarkdownStore()
app.use(pinia)  // 太晚了！
```

### 4. 第三方库的高度配置

**优先级**：
1. **百分比**：`height: '100%'`（推荐）
2. **CSS 变量**：`height: 'var(--editor-height)'`
3. **固定像素**：`height: 360`（不推荐，除非明确需要）

**示例**：
```typescript
// ✅ 推荐：百分比高度 + flex 布局
new Vditor(container, {
  height: '100%'
})

// ❌ 不推荐：固定像素
new Vditor(container, {
  height: 360
})
```

### 5. 文件路径作为唯一标识

**原则**：
- 使用完整路径（`filePath`）而非文件名（`fileName`）
- 考虑不同目录下同名文件的场景

**示例**：
```typescript
// ✅ 正确：使用完整路径
const existingTab = openTabs.value.find(tab => 
  tab.filePath === 'reference/notes/note1.md'
)

// ❌ 错误：使用文件名
const existingTab = openTabs.value.find(tab => 
  tab.fileName === 'note1.md'  // 可能有多个同名文件
)
```

### 6. 使用 MCP 工具链调试

**优势**：
- 实时获取 DOM 计算样式和尺寸
- 可视化验证（截图）
- 避免口头描述 → 猜测 → 改代码 → 刷新的循环

**常用工具**：
- `list_pages`：列出浏览器标签页
- `navigate_page`：导航到指定 URL
- `take_snapshot`：获取页面内容快照
- `evaluate_script`：执行 JavaScript 获取状态
- `take_screenshot`：截图验证

**示例**：
```javascript
// 检查元素状态
const viewer = document.querySelector('.markdown-viewer')
const computed = getComputedStyle(viewer)

return {
  clientHeight: viewer.clientHeight,
  scrollHeight: viewer.scrollHeight,
  hasScroll: viewer.scrollHeight > viewer.clientHeight,
  minHeight: computed.minHeight,
  overflow: computed.overflow
}
```

### 7. 组件设计原则

**单一职责**：
- `MarkdownEditor.vue`：只负责编辑功能
- `MarkdownViewer.vue`：只负责查看功能
- `MarkdownTab.vue`：负责标签页布局和模式切换

**状态管理**：
- 跨组件共享状态使用 Pinia
- 组件内部状态使用 `ref` / `reactive`
- 父子组件通信使用 Props / Emits

**样式隔离**：
- 组件专用样式使用 `<style scoped>`
- 全局样式使用 `styles.scss`
- 避免样式污染

---

## 🔄 标准工作流程

### 工作流程 1：添加新的 Markdown 功能

#### 1. 需求分析
- 明确功能需求（编辑 / 查看 / 导出等）
- 确定交互方式（单击 / 双击 / 快捷键等）
- 评估技术可行性

#### 2. 技术选型
- 优先查找现成的库（如 Vditor、Marked、Remark）
- 评估库的功能、性能、文档质量
- 确认是否支持所需功能（代码高亮、数学公式等）

#### 3. 状态设计
- 确定需要哪些状态（文件列表、打开的标签页、当前模式等）
- 设计 Pinia store 结构
- 定义 TypeScript 类型

**示例**：
```typescript
// stores/markdown.store.ts
export interface MarkdownFile {
  id: string
  name: string
  path: string
  content: string
  isFolder: boolean
  children?: MarkdownFile[]
}

export interface MarkdownTab {
  id: string
  filePath: string
  fileName: string
  content: string
  mode: 'edit' | 'view'
  isDirty: boolean
}
```

#### 4. Mock 数据准备
- 创建 `{name}.mock.ts` 文件
- 提供示例数据用于开发和测试

**示例**：
```typescript
// stores/markdown.mock.ts
export const mockMarkdownFiles: MarkdownFile[] = [
  {
    id: 'folder-1',
    name: '参考资料源',
    path: 'reference',
    content: '',
    isFolder: true,
    children: [
      {
        id: 'file-1',
        name: 'README.md',
        path: 'reference/README.md',
        content: '# 参考资料源\n\n...',
        isFolder: false
      }
    ]
  }
]
```

#### 5. 组件实现
- 创建 Vue 组件（`{Name}.vue`）
- 实现 UI 布局
- 集成第三方库
- 绑定状态和事件

**示例**：
```vue
<!-- components/MarkdownEditor.vue -->
<template>
  <div ref="editorContainer" class="markdown-editor"></div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Vditor from 'vditor'

const editorContainer = ref<HTMLElement>()
let vditor: Vditor | null = null

onMounted(() => {
  vditor = new Vditor(editorContainer.value, {
    height: '100%',
    mode: 'ir',
    // ...
  })
})
</script>

<style scoped>
.markdown-editor {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
```

#### 6. 样式调整
- 实现 Obsidian 风格主题
- 确保响应式布局
- 处理 Flex 布局滚动问题

**关键点**：
- 使用 CSS 变量统一主题
- Flex 链路中的 `min-height: 0`
- 只在目标层设置 `overflow-y: auto`

#### 7. 调试验证
- 使用 Chrome DevTools 检查样式
- 使用 MCP 工具链实时调试
- 验证各种交互场景

#### 8. 文档更新
- 更新组件文档
- 记录踩坑和解决方案
- 总结经验教训

---

### 工作流程 2：修复 Flex 布局滚动问题

#### 1. 问题确认
- 确认滚动条应该出现在哪个元素
- 检查内容是否确实超出容器

**检查方法**：
```javascript
const el = document.querySelector('.target')
console.log({
  clientHeight: el.clientHeight,
  scrollHeight: el.scrollHeight,
  shouldScroll: el.scrollHeight > el.clientHeight
})
```

#### 2. 检查 Flex 链路
- 从目标元素向上遍历所有父级
- 检查每一层的 `min-height`、`overflow`、`flex`

**检查方法**：
```javascript
let current = document.querySelector('.target')
while (current) {
  const style = getComputedStyle(current)
  console.log({
    className: current.className,
    minHeight: style.minHeight,
    overflow: style.overflow,
    flex: style.flex
  })
  current = current.parentElement
}
```

#### 3. 应用修复
- 所有 Flex 容器和子项设置 `min-height: 0`
- 父级链路设置 `overflow: hidden`
- 目标层设置 `overflow-y: auto`

**修复模板**：
```scss
// 父级链路
.parent-1, .parent-2, .parent-3 {
  min-height: 0;
  overflow: hidden;
}

// 目标滚动层
.scroll-target {
  overflow-y: auto;
  height: 100%;
}
```

#### 4. 验证修复
- 刷新页面
- 检查滚动条是否出现
- 测试滚动功能

**验证方法**：
```javascript
const el = document.querySelector('.scroll-target')
console.log({
  hasScroll: el.scrollHeight > el.clientHeight,
  canScroll: el.scrollTop !== undefined
})
```

---

### 工作流程 3：集成第三方 Markdown 库

#### 1. 调研库的功能
- 查看官方文档和示例
- 确认支持的功能（代码高亮、数学公式、表格等）
- 评估性能和包大小

**推荐库**：
- **Vditor**：功能全面，支持多种模式，适合编辑器
- **Marked**：轻量级，适合纯查看
- **Remark**：插件生态丰富，适合定制化

#### 2. 安装依赖
```bash
npm install vditor
# 或
npm install marked highlight.js katex
```

#### 3. 编辑模式集成
```typescript
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const vditor = new Vditor(container, {
  height: '100%',
  mode: 'ir',  // Instant Rendering
  placeholder: '开始编写...',
  theme: 'classic',
  toolbarConfig: {
    pin: true
  },
  cache: {
    enable: false
  },
  input: (value) => {
    // 内容变化回调
  }
})
```

#### 4. 查看模式集成
```typescript
import Vditor from 'vditor'

const html = await Vditor.md2html(markdown, {
  mode: 'light',
  markdown: {
    toc: true,
    mark: true,
    footnotes: true,
    autoSpace: true
  }
})

// 渲染后处理
Vditor.highlightRender({ style: 'github' }, container)
Vditor.mathRender(container, { cdn: 'https://cdn.jsdelivr.net/npm/katex' })
Vditor.codeRender(container)
```

#### 5. 样式定制
```scss
// 覆盖 Vditor 默认样式
.vditor {
  --vditor-background-color: var(--obsidian-bg-primary);
  --vditor-text-color: var(--obsidian-text-primary);
}

.vditor-content {
  font-family: var(--obsidian-font-text);
  font-size: 14px;
  line-height: 1.6;
}
```

#### 6. API 封装
```typescript
// 暴露方法给父组件
defineExpose({
  getValue: () => vditor?.getValue() || '',
  setValue: (value: string) => vditor?.setValue(value),
  focus: () => vditor?.focus(),
  blur: () => vditor?.blur()
})
```

---

## 📚 参考资源

### 官方文档
- **Vue 3**：https://vuejs.org/
- **Pinia**：https://pinia.vuejs.org/
- **Element Plus**：https://element-plus.org/
- **Vditor**：https://b3log.org/vditor/

### 技术文章
- **Flexbox 完全指南**：https://css-tricks.com/snippets/css/a-guide-to-flexbox/
- **Vue 3 Composition API**：https://vuejs.org/guide/extras/composition-api-faq.html
- **Pinia 最佳实践**：https://pinia.vuejs.org/cookbook/

### 工具
- **Chrome DevTools**：浏览器开发者工具
- **MCP chrome-devtools**：实时调试工具链
- **Vue DevTools**：Vue 专用调试工具

---

## 🎯 下一阶段计划

### 短期目标（1-2 周）
1. **实现文件保存功能**：
   - 监听 `Ctrl/Cmd + S` 快捷键
   - 调用后端 API 保存文件
   - 更新 `isDirty` 状态

2. **实现导航历史功能**：
   - 后退/前进按钮逻辑
   - 历史记录管理
   - 快捷键支持

3. **实现大纲面板**：
   - 解析 Markdown 标题
   - 生成目录树
   - 点击跳转到对应位置

### 中期目标（1 个月）
1. **文件系统集成**：
   - 连接后端文件系统 API
   - 实现文件的增删改查
   - 文件监听和自动刷新

2. **搜索功能**：
   - 全局搜索
   - 当前文件搜索
   - 搜索结果高亮

3. **图形视图**：
   - 文件关联关系可视化
   - 基于链接的知识图谱

### 长期目标（3 个月）
1. **插件系统**：
   - 支持自定义 Markdown 扩展
   - 支持主题切换
   - 支持快捷键自定义

2. **协作功能**：
   - 多人实时编辑
   - 版本控制集成
   - 评论和批注

3. **性能优化**：
   - 虚拟滚动（大文件）
   - 懒加载（文件树）
   - 缓存策略

---

## 📝 总结

本阶段成功实现了 Obsidian 风格的 Markdown 编辑器系统，包括：
- ✅ 完整的文件树和标签页管理
- ✅ 基于 Vditor 的编辑和查看模式
- ✅ 响应式 Flex 布局和自定义滚动条
- ✅ Pinia 状态管理和 Mock 数据系统

**核心经验**：
- Flex 布局滚动的黄金法则（`min-height: 0`）
- `:deep()` 只在 scoped style 中使用
- Pinia 初始化顺序
- 使用 MCP 工具链实时调试

**标准流程**：
- 需求分析 → 技术选型 → 状态设计 → Mock 数据 → 组件实现 → 样式调整 → 调试验证 → 文档更新

这套流程可以应用到后续的功能开发中，降低开发成本，提高代码质量。

---

**报告生成时间**：2025年10月05日11:44:00  
**下次更新**：下一阶段功能实现完成后
