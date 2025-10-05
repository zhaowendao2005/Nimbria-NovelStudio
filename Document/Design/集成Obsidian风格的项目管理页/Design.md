## 📋 **Nimbria主程序集成Obsidian风格Markdown编辑器计划**

---

### 🎯 **集成目标**

将 `Reference-Page/ReferencePage` 原型项目集成到Nimbria主程序，作为：
- **ProjectPage系统**（新的Index系统）
- **ProjectMainLayout**（新的layouts）
- **三个Panel组件**（PagesLayout中的Left/Center/Right）

### 📊 **当前主程序项目打开流程分析**

**现状**：
1. 主窗口路由：`/` → `layouts/MainLayout.vue`（包含HomeDashboardPage）
2. 用户点击"打开项目"或选择最近项目
3. 调用 `useProjectSelectionStore().openExistingProject()` 或 `openRecentProject()`
4. 验证项目有效性（`quickValidateProject`）
5. 调用 `window.nimbria.project.createWindow(projectPath)` 创建**新的项目窗口**
6. **项目窗口当前加载：`/` → `MainLayout.vue`（空页面）**

**目标修改**：
- 项目窗口应加载：`/project` → `ProjectPageSystem.vue` → `ProjectMainLayout.vue`
- 显示三栏布局：左侧导航+文件树 / 中间Markdown编辑器 / 右侧大纲

**实现方案**：
- 在项目窗口的路由中，添加 `/project` 路由（使用命名视图）
- 主窗口继续使用 `/`（HomeDashboard）
- 项目窗口初始化时自动导航到 `/project`

---

### 📊 **架构差异分析**

| 维度 | 原型项目 | Nimbria主程序 | 集成方案 |
|------|---------|--------------|----------|
| UI框架 | Element Plus | Quasar | ✅ 共存（添加Element Plus） |
| Markdown引擎 | Vditor | 无 | ✅ 添加Vditor |
| 状态管理 | Pinia | Pinia | ✅ 兼容 |
| 布局模式 | 独立全屏 | 嵌套系统 | ✅ 适配嵌套 |
| 数据源 | Mock | Mock/Electron IPC | ✅ 先用Mock |

---

### 🗂️ **目标目录结构（Shell设计版）**

**核心设计思想**：
- **左右栏归类为Shell**：共用 `ProjectPage.Shell.vue`，通过props区分左右栏内容
- **中栏独立为MainPanel**：`ProjectPage.MainPanel.vue`，专注主内容区
- **组件按职责分组**：`ProjectPage.Shell/` 和 `ProjectPage.MainPanel/` 各管各的

```
Nimbria/Client/GUI/
├── Index/
│   ├── HomeSystem.vue                          # 主窗口系统（已存在）
│   └── ProjectPageSystem.vue                   # ⭐ 新增：项目页系统入口（极简）
├── layouts/
│   ├── MainLayout.vue                          # 主窗口布局（已存在）
│   ├── ProjectMainLayout.vue                   # ⭐ 新增：三栏容器布局
│   └── ProjectMainLayout.scss                  # ⭐ 新增：布局样式（flex链路/overflow控制）
├── PagesLayout/
│   ├── HomeDashboardPage.vue                   # 主窗口页面（已存在）
│   ├── ProjectPage.Shell.vue                   # ⭐ 新增：左右栏Shell容器（共用）
│   ├── ProjectPage.Shell.scss                  # ⭐ 新增：Shell样式（颜色/视觉）
│   ├── ProjectPage.MainPanel.vue               # ⭐ 新增：中栏主面板容器
│   ├── ProjectPage.MainPanel.scss              # ⭐ 新增：主面板样式（颜色/视觉）
│   └── ErrorNotFound.vue
├── components/
│   ├── ProjectPage.Shell/                      # ⭐ 新增：Shell组件集合
│   │   ├── Navbar/                             # 左侧导航栏
│   │   │   └── ProjectNavbar.vue
│   │   ├── FileTree/                           # 文件树（左栏）
│   │   │   ├── FileTreeToolbar.vue
│   │   │   └── FileTreeContent.vue
│   │   └── Outline/                            # 大纲（右栏）
│   │       └── OutlineContent.vue
│   ├── ProjectPage.MainPanel/                  # ⭐ 新增：主面板组件集合
│   │   └── Markdown/                           # Markdown组件
│   │       ├── MarkdownEditor.vue              # 编辑器（从原型迁移）
│   │       ├── MarkdownViewer.vue              # 查看器（从原型迁移）
│   │       └── MarkdownTab.vue                 # 标签页容器（从原型迁移）
│   └── HomeDashboardPage/ (已存在)
├── router/
│   └── routes.ts                               # 添加ProjectPage路由（命名视图）
└── boot/
    └── element-plus.ts                         # ⭐ 新增：Element Plus全局注册

Nimbria/Client/stores/
├── projectPage/                                # ⭐ 新增：项目页业务模块
│   ├── index.ts                                # 统一导出
│   └── Markdown/                               # Markdown子模块
│       ├── index.ts                            # 导出
│       ├── markdown.store.ts                   # Markdown状态
│       ├── markdown.mock.ts                    # Mock数据
│       └── types.ts                            # 类型定义
├── home/ (已存在)
└── project/ (已存在)

Nimbria/quasar.config.ts                        # 配置Element Plus + 路径别名
Nimbria/package.json                            # 添加依赖：element-plus, vditor
```

**设计优势**：
- **职责清晰**：Shell管理外围组件（导航、文件树、大纲），MainPanel管理主内容（Markdown）
- **复用性强**：左右栏通过props区分显示内容，共用一个Shell容器
- **扩展灵活**：未来添加新的Shell组件或MainPanel组件都很方便
- **命名规范**：使用`.`分隔符表示层级关系（`ProjectPage.Shell`、`ProjectPage.MainPanel`）
- **样式组织**：
  - `layouts/*.scss`：控制布局（flex链路、overflow、高度、min-height等）
  - `PagesLayout/*.scss`：控制视觉（颜色、背景、边框、字体等）

### 🏗️ **架构层次关系图（Shell设计）**

```
ProjectPageSystem.vue (Index - 极简入口)
  └── <router-view>
        ↓
      ProjectMainLayout.vue (Layout - 三栏容器 + 分隔器)
        ├── 左栏 <router-view name="left">
        │     ↓
        │   ProjectPage.Shell.vue (PagesLayout) [type="left"]
        │     ├── <ProjectNavbar>             (components/ProjectPage.Shell/Navbar/)
        │     └── <FileTreeToolbar>           (components/ProjectPage.Shell/FileTree/)
        │         <FileTreeContent>           (components/ProjectPage.Shell/FileTree/)
        │
        ├── 中栏 <router-view name="center">
        │     ↓
        │   ProjectPage.MainPanel.vue (PagesLayout)
        │     └── <MarkdownTab>               (components/ProjectPage.MainPanel/Markdown/)
        │           ├── <MarkdownEditor>      (components/ProjectPage.MainPanel/Markdown/)
        │           └── <MarkdownViewer>      (components/ProjectPage.MainPanel/Markdown/ - 唯一滚动层)
        │
        └── 右栏 <router-view name="right">
              ↓
            ProjectPage.Shell.vue (PagesLayout) [type="right"]
              └── <OutlineContent>            (components/ProjectPage.Shell/Outline/)
```

**设计说明**：
- `ProjectPage.Shell.vue` 通过 `type` prop区分左右栏内容
- 左栏：type="left" → 显示Navbar + FileTree
- 右栏：type="right" → 显示Outline
- 中栏：独立的MainPanel，专注Markdown内容

---

### 📝 **详细迁移计划**

#### **阶段一：依赖与环境配置（30分钟）**

##### 1.1 安装依赖包
```json
// Nimbria/package.json 添加：
{
  "dependencies": {
    "element-plus": "^2.9.1",           // Element Plus UI框架
    "@element-plus/icons-vue": "^2.3.1", // Element Plus 图标
    "vditor": "^3.10.7"                  // Markdown编辑器
  }
}
```

##### 1.2 配置Quasar与Element Plus共存
```typescript
// Nimbria/Client/boot/element-plus.ts
import { boot } from 'quasar/wrappers'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

export default boot(({ app }) => {
  app.use(ElementPlus)
  
  // 注册所有图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
})
```

```typescript
// Nimbria/quasar.config.ts 添加boot配置：
boot: [
  'axios',
  'framework-init',
  'element-plus' // ⭐ 新增
]
```

##### 1.3 样式组织策略

**布局样式（layouts/ProjectMainLayout.scss）**：
```scss
// 控制flex链路、overflow、高度、min-height等结构性样式
.project-main-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  
  .el-container {
    height: 100%;
  }
  
  .left-panel,
  .center-panel,
  .right-panel {
    height: 100%;
    overflow: hidden;
    min-height: 0; // 🔑 关键！flex压缩
  }
  
  .splitter {
    width: 4px;
    cursor: col-resize;
  }
}
```

**视觉样式（PagesLayout/*.scss）**：
```scss
// ProjectLeftPanel.scss - 控制颜色、背景、边框等视觉样式
.project-left-panel {
  background: var(--obsidian-bg-secondary);
  border-right: 1px solid var(--obsidian-border);
  
  .navbar {
    background: var(--obsidian-bg-primary);
    color: var(--obsidian-text-primary);
  }
}

// ProjectMainPanel.scss
.project-main-panel {
  background: var(--obsidian-bg-primary);
  color: var(--obsidian-text-primary);
}

// ProjectRightPanel.scss
.project-right-panel {
  background: var(--obsidian-bg-secondary);
  border-left: 1px solid var(--obsidian-border);
}
```

**Element Plus样式隔离**：
```scss
// 在ProjectMainLayout.scss中设置CSS变量作用域
.project-main-layout {
  // Obsidian CSS变量（只在项目页生效）
  --obsidian-bg-primary: #ffffff;
  --obsidian-bg-secondary: #f5f6f8;
  --obsidian-border: #e3e5e8;
  --obsidian-text-primary: #2e3338;
  --obsidian-accent: #5b7fff;
}
```

---

#### **阶段二：组件迁移与适配（2小时）**

##### 2.1 迁移核心Markdown组件

**迁移列表**：
```
原型项目                                        → Nimbria主程序
────────────────────────────────────────────────────────────────────
components/MarkdownEditor.vue                  → components/ProjectPage.MainPanel/Markdown/MarkdownEditor.vue
components/MarkdownViewer.vue                  → components/ProjectPage.MainPanel/Markdown/MarkdownViewer.vue
components/MarkdownTab.vue                     → components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue
```

**适配要点**：
- ✅ **保持组件逻辑不变**
- ✅ **调整导入路径**（使用Nimbria的路径别名）
- ✅ **CSS变量适配**（Obsidian主题变量 → Nimbria CSS变量）
- ✅ **图标替换**（Element Plus图标 → 保持Element Plus）

##### 2.2 重构App.vue为Layout + Page模式

**原型App.vue结构**：
```
App.vue (单一组件，含左侧导航+文件树+标签页+大纲)
  ├── 左侧窄导航栏 (48px)
  ├── 文件浏览器 (280px)
  ├── 主编辑区 (flex)
  └── 大纲面板 (280px)
```

**拆分为Nimbria架构（修正）**：
```
ProjectPageSystem.vue (Index - 极简入口)
  └── ProjectMainLayout.vue (Layout - 三栏容器)
      ├── 左栏：ProjectLeftPanel.vue (PagesLayout)
      │   ├── ProjectNavbar (48px固定)
      │   └── FileTreeToolbar + FileTreeContent (280px可拖拽)
      │
      ├── 中栏：ProjectMainPanel.vue (PagesLayout)
      │   └── MarkdownTab (包含Editor/Viewer切换)
      │
      └── 右栏：ProjectRightPanel.vue (PagesLayout)
          └── OutlineContent
```

**关键设计原则**：
- ✅ **ProjectMainLayout.vue职责**：只负责三栏容器 + 分隔器拖拽
- ✅ **三栏内容由内联router控制**：通过命名视图指向PagesLayout
- ✅ **PagesLayout组件导入components**：保持组织清晰

##### 2.3 原型Flex布局与Overflow方案分析

**🔑 核心发现：Flex布局黄金链路**

原型项目通过完整的flex链路实现正确的滚动：

```scss
// 从根到滚动层的完整链路
html, body { height: 100%; overflow: hidden; }
.obsidian-app { height: 100vh; overflow: hidden; }
.main-container { flex: 1; overflow: hidden; }
.editor-main { flex: 1; min-height: 0; overflow: hidden; }  // 🔑 关键
.markdown-tabs { height: 100%; min-height: 0; }              // 🔑 关键
.el-tabs__content { flex: 1; min-height: 0 !important; overflow: hidden; }  // 🔑 必须!important
.tab-main { flex: 1; min-height: 0; overflow: hidden; }      // 🔑 关键
.markdown-viewer { overflow-y: auto; }                        // ✅ 唯一滚动层
```

**三大核心原则**：

1. **min-height: 0 原则**
   - 所有纵向flex子项必须设置 `min-height: 0`
   - 原因：flex默认 `min-height: auto`，会"包住"内容导致无法压缩
   - ❌ 错误：缺少min-height → 滚动条不显示
   - ✅ 正确：完整链路 → 滚动正常

2. **overflow: hidden 链路原则**
   - 从根到最终滚动层之前，所有容器都设置 `overflow: hidden`
   - 目的：确保只有目标层滚动，避免多层滚动冲突

3. **!important 覆盖原则**
   - Element Plus默认样式需要用 `!important` 强制覆盖
   - 特别是 `.el-tabs__content` 和 `.el-tab-pane`

**移植注意事项**：

```scss
// ❌ 错误示例
.tab-main {
  flex: 1;
  overflow: hidden;  // 缺少 min-height: 0
}

// ✅ 正确示例
.tab-main {
  flex: 1;
  min-height: 0;     // 必须！
  overflow: hidden;
}

// Element Plus样式覆盖
:deep(.el-tabs__content) {
  flex: 1;
  min-height: 0 !important;  // 必须用!important
  overflow: hidden;
}
```

---

#### **阶段三：状态管理迁移（1小时）**

##### 3.1 Pinia Store结构调整（按业务模块组织）

**目录结构**：
```
stores/
├── projectPage/
│   ├── index.ts                    # 统一导出
│   └── Markdown/                   # Markdown业务子模块
│       ├── index.ts                # 子模块导出
│       ├── markdown.store.ts       # Store
│       ├── markdown.mock.ts        # Mock数据
│       └── types.ts                # 类型定义
├── home/ (已存在，参照此结构)
└── project/ (已存在，参照此结构)
```

**统一导出（projectPage/index.ts）**：
```typescript
// stores/projectPage/index.ts
export * from './Markdown'
```

**子模块导出（projectPage/Markdown/index.ts）**：
```typescript
// stores/projectPage/Markdown/index.ts
export { useMarkdownStore } from './markdown.store'
export { mockMarkdownFiles, findMockFileByPath } from './markdown.mock'
export type * from './types'
```

**Store实现（projectPage/Markdown/markdown.store.ts）**：
```typescript
// ✅ 从原型完整迁移，只调整导入路径
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { mockMarkdownFiles } from './markdown.mock'
import type { MarkdownFile, MarkdownTab } from './types'

export const useMarkdownStore = defineStore('projectPage-markdown', () => {
  // ... 原型store逻辑保持不变
})
```

##### 3.2 Mock数据迁移策略

```typescript
// stores/projectPage/Markdown/markdown.mock.ts
// ✅ 直接复制原型mock数据
export const mockMarkdownFiles: MarkdownFile[] = [
  {
    id: 'folder-1',
    name: '项目文档',
    path: 'docs',
    content: '',
    isFolder: true,
    children: [
      // ... mock数据
    ]
  }
]
```

**数据源切换点**（预留）：
```typescript
// 未来替换为真实数据源
// const fileTree = await window.nimbria.project.getFileTree(projectPath)
```

---

#### **阶段四：路由与导航集成（30分钟）**

##### 4.1 路由配置（使用命名视图）

```typescript
// Client/GUI/router/routes.ts
import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // 主窗口路由（已存在）
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@pages/HomeDashboardPage.vue') }
    ]
  },
  
  // ⭐ 新增：项目页路由（使用命名视图 + Shell设计）
  {
    path: '/project',
    component: () => import('@index/ProjectPageSystem.vue'),
    children: [
      {
        path: '',
        component: () => import('layouts/ProjectMainLayout.vue'),
        children: [
          {
            path: '',
            name: 'project-workspace',
            components: {
              // 左栏：Shell容器（type="left"）
              left: () => import('@pages/ProjectPage.Shell.vue'),
              // 中栏：主面板容器
              center: () => import('@pages/ProjectPage.MainPanel.vue'),
              // 右栏：Shell容器（type="right"）
              right: () => import('@pages/ProjectPage.Shell.vue')
            },
            props: {
              left: { type: 'left' },
              center: {},
              right: { type: 'right' }
            }
          }
        ]
      }
    ]
  },
  
  // 错误页面
  {
    path: '/:catchAll(.*)*',
    component: () => import('@pages/ErrorNotFound.vue')
  }
]

export default routes
```

**关键说明**：
- 左右栏使用同一个组件 `ProjectPage.Shell.vue`
- 通过 `props` 传递 `type` 参数区分左右栏
- `type="left"` → 显示Navbar + FileTree
- `type="right"` → 显示Outline

##### 4.2 ProjectMainLayout.vue结构（关键）

```vue
<template>
  <div class="project-main-layout">
    <!-- 使用Element Plus的Split分隔器 -->
    <el-container>
      <!-- 左栏 -->
      <el-aside :width="leftWidth" class="left-panel">
        <router-view name="left" />
      </el-aside>
      
      <!-- 左侧分隔器 -->
      <div class="splitter" @mousedown="startDragLeft"></div>
      
      <!-- 中栏 -->
      <el-main class="center-panel">
        <router-view name="center" />
      </el-main>
      
      <!-- 右侧分隔器 -->
      <div class="splitter" @mousedown="startDragRight"></div>
      
      <!-- 右栏 -->
      <el-aside :width="rightWidth" class="right-panel">
        <router-view name="right" />
      </el-aside>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const leftWidth = ref('328px')  // 48px导航 + 280px文件树
const rightWidth = ref('280px')

// 拖拽逻辑（简化示例）
const startDragLeft = (e: MouseEvent) => {
  // ... 拖拽实现
}
const startDragRight = (e: MouseEvent) => {
  // ... 拖拽实现
}
</script>

<style scoped lang="scss">
.project-main-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  
  .el-container {
    height: 100%;
  }
  
  .left-panel,
  .center-panel,
  .right-panel {
    height: 100%;
    overflow: hidden;
    min-height: 0; // 🔑 关键！
  }
  
  .splitter {
    width: 4px;
    background: var(--el-border-color);
    cursor: col-resize;
    
    &:hover {
      background: var(--el-color-primary);
    }
  }
}
</style>
```

##### 4.3 导航逻辑

```typescript
// 从主窗口打开项目后，跳转到项目页
router.push({ name: 'project-workspace' })
```

---

### 🔧 **关键技术适配**

#### **1. 样式系统共存**

| 场景 | 原型 | Nimbria | 适配方案 |
|------|------|---------|----------|
| 全局样式 | Element Plus | Quasar | CSS命名空间隔离 |
| 组件样式 | scoped SCSS | scoped SCSS | ✅ 无冲突 |
| CSS变量 | `--obsidian-*` | 无 | 保留Obsidian变量 |
| Flex布局 | Element容器 | Quasar容器 | 各自独立 |

**解决方案**：
```scss
// ProjectPage专属样式作用域
.project-page-system {
  // 所有Element Plus组件都在这个作用域下
  --obsidian-bg-primary: #ffffff;
  --obsidian-text-primary: #2e3338;
  // ... 其他Obsidian变量
  
  // 确保Element Plus样式不影响Quasar
  .el-button {
    // 覆盖样式
  }
}
```

#### **2. 图标系统共存**

| 库 | 使用场景 | 调用方式 |
|----|---------|---------|
| Quasar Icons | 主窗口、HomeSystem | `<q-icon name="xxx">` |
| Element Plus Icons | ProjectPage系统 | `<el-icon><Document /></el-icon>` |

**隔离原则**：各系统使用各自的图标库，互不干扰。

#### **3. Vditor资源管理**

```typescript
// MarkdownEditor.vue
import Vditor from 'vditor'
import 'vditor/dist/index.css'  // ⚠️ 全局引入，确保CDN资源正确

onMounted(() => {
  vditor = new Vditor(editorContainer.value, {
    cdn: 'https://cdn.jsdelivr.net/npm/vditor@3.10.7',  // 指定CDN
    // ... 其他配置
  })
})
```

---

### 📦 **文件迁移清单（Shell设计版）**

#### **需要迁移的文件（8个）**

| 原型文件 | 目标位置 | 修改程度 | 说明 |
|---------|---------|---------|------|
| `App.vue` | 拆分为Shell + MainPanel + Layout | 🔴 重构 | 拆分为ProjectMainLayout + Shell + MainPanel |
| `components/MarkdownEditor.vue` | `components/ProjectPage.MainPanel/Markdown/` | 🟢 微调 | 仅改导入路径（使用别名） |
| `components/MarkdownViewer.vue` | `components/ProjectPage.MainPanel/Markdown/` | 🟢 微调 | 仅改导入路径（使用别名） |
| `components/MarkdownTab.vue` | `components/ProjectPage.MainPanel/Markdown/` | 🟢 微调 | 仅改导入路径（使用别名） |
| `stores/markdown.store.ts` | `stores/projectPage/Markdown/` | 🟢 微调 | 调整目录结构 + 别名 |
| `stores/markdown.mock.ts` | `stores/projectPage/Markdown/` | 🟢 直接复制 | 无需修改 |
| `stores/index.ts` | 拆分为两个index.ts | 🟢 微调 | projectPage/index + Markdown/index |
| `styles.scss` | 拆分为多个scss | 🟡 拆分 | Layout + Shell + MainPanel scss |

#### **需要新建的文件（13个）**

| 文件 | 作用 | 优先级 | 依赖 |
|------|------|--------|------|
| `Index/ProjectPageSystem.vue` | 项目页系统入口（极简） | P0 | 无 |
| `layouts/ProjectMainLayout.vue` | 三栏容器+分隔器 | P0 | 无 |
| `layouts/ProjectMainLayout.scss` | 布局样式（flex/overflow） | P0 | 无 |
| `PagesLayout/ProjectPage.Shell.vue` | 左右栏Shell容器（可复用） | P0 | Navbar + FileTree + Outline |
| `PagesLayout/ProjectPage.Shell.scss` | Shell视觉样式 | P1 | 无 |
| `PagesLayout/ProjectPage.MainPanel.vue` | 中栏主面板容器 | P0 | MarkdownTab |
| `PagesLayout/ProjectPage.MainPanel.scss` | 主面板视觉样式 | P1 | 无 |
| `components/ProjectPage.Shell/Navbar/ProjectNavbar.vue` | 左侧窄导航栏 | P1 | 无 |
| `components/ProjectPage.Shell/FileTree/FileTreeToolbar.vue` | 文件树工具栏 | P0 | Store |
| `components/ProjectPage.Shell/FileTree/FileTreeContent.vue` | 文件树内容 | P0 | Store |
| `components/ProjectPage.Shell/Outline/OutlineContent.vue` | 大纲内容 | P2 | Store |
| `boot/element-plus.ts` | Element Plus全局注册 | P0 | 无 |
| `stores/projectPage/Markdown/types.ts` | Markdown类型定义 | P0 | 无 |

**对比原版减少了2个文件**（从15个→13个）：
- 左右栏Panel合并为一个Shell.vue（复用）
- 对应的scss也合并为一个Shell.scss

---

### 📍 **路径别名使用规范（关键）**

为避免跨父目录的相对路径错误，**强制使用别名导入**。

#### **Quasar配置别名**

```typescript
// quasar.config.ts
import { configure } from 'quasar/wrappers'
import path from 'path'

export default configure((ctx) => {
  return {
    build: {
      viteConf: {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, './Client'),
            '@gui': path.resolve(__dirname, './Client/GUI'),
            '@index': path.resolve(__dirname, './Client/GUI/Index'),
            '@layouts': path.resolve(__dirname, './Client/GUI/layouts'),
            '@pages': path.resolve(__dirname, './Client/GUI/PagesLayout'),
            '@components': path.resolve(__dirname, './Client/GUI/components'),
            '@stores': path.resolve(__dirname, './Client/stores'),
            '@utils': path.resolve(__dirname, './Client/Utils'),
            '@boot': path.resolve(__dirname, './Client/boot'),
            '@types': path.resolve(__dirname, './Client/types')
          }
        }
      }
    }
  }
})
```

#### **导入示例（正确用法）**

```typescript
// ✅ 正确：使用别名
import { useMarkdownStore } from '@stores/projectPage'
import MarkdownEditor from '@components/ProjectPage.MainPanel/Markdown/MarkdownEditor.vue'
import ProjectNavbar from '@components/ProjectPage.Shell/Navbar/ProjectNavbar.vue'
import type { MarkdownFile } from '@stores/projectPage/Markdown/types'

// ❌ 错误：跨父目录相对路径
import { useMarkdownStore } from '../../../stores/projectPage'
import MarkdownEditor from '../../components/ProjectPage.MainPanel/Markdown/MarkdownEditor.vue'
```

#### **各层级推荐别名**

| 层级 | 推荐别名 | 示例 |
|------|---------|------|
| Index组件 | `@index` | `import('@index/ProjectPageSystem.vue')` |
| Layout组件 | `@layouts` | `import('@layouts/ProjectMainLayout.vue')` |
| Page组件 | `@pages` | `import('@pages/ProjectPage.Shell.vue')` |
| Shell组件 | `@components` | `import('@components/ProjectPage.Shell/Navbar/ProjectNavbar.vue')` |
| MainPanel组件 | `@components` | `import('@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue')` |
| Store | `@stores` | `import { useMarkdownStore } from '@stores/projectPage'` |
| 类型定义 | `@types` | `import type { Project } from '@types'` |
| 工具函数 | `@utils` | `import { formatDate } from '@utils'` |

#### **组件内部导入规范**

```vue
<script setup lang="ts">
// ✅ 优先级排序：Vue核心 → 第三方库 → 别名导入 → 相对路径（同目录）
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useMarkdownStore } from '@stores/projectPage'
import type { MarkdownTab } from '@stores/projectPage/types'
import MarkdownEditor from './MarkdownEditor.vue'  // 同目录可用相对路径
</script>
```

---

### 🎨 **CSS变量映射表**

将Obsidian风格CSS变量保留在ProjectPage系统中：

```scss
// ProjectMainLayout.vue <style>
.project-main-layout {
  // Obsidian原始变量（保持不变）
  --obsidian-bg-primary: #ffffff;
  --obsidian-bg-secondary: #f5f6f8;
  --obsidian-border: #e3e5e8;
  --obsidian-text-primary: #2e3338;
  --obsidian-text-secondary: #6a6d74;
  --obsidian-accent: #5b7fff;
  --obsidian-hover-bg: #e9e9e9;
  --obsidian-font-text: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  // 暗色主题（可选）
  &.dark-mode {
    --obsidian-bg-primary: #1e1e1e;
    --obsidian-bg-secondary: #252525;
    --obsidian-border: #3a3a3a;
    --obsidian-text-primary: #dcddde;
    --obsidian-text-secondary: #b9bbbe;
  }
}
```

---

### 💻 **核心组件骨架代码示例**

#### **1. ProjectPageSystem.vue（极简入口）**

```vue
<template>
  <router-view />
</template>

<script setup lang="ts">
// 极简入口，无任何逻辑
</script>
```

#### **2. ProjectMainLayout.vue（三栏容器）**

```vue
<template>
  <div class="project-main-layout">
    <el-container>
      <el-aside :width="leftWidth" class="left-panel">
        <router-view name="left" />
      </el-aside>
      
      <div class="splitter left-splitter" @mousedown="startDragLeft"></div>
      
      <el-main class="center-panel">
        <router-view name="center" />
      </el-main>
      
      <div class="splitter right-splitter" @mousedown="startDragRight"></div>
      
      <el-aside :width="rightWidth" class="right-panel">
        <router-view name="right" />
      </el-aside>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const leftWidth = ref('328px')  // 48px + 280px
const rightWidth = ref('280px')

const startDragLeft = (e: MouseEvent) => {
  // TODO: 拖拽逻辑实现
}

const startDragRight = (e: MouseEvent) => {
  // TODO: 拖拽逻辑实现
}
</script>

<style scoped lang="scss">
.project-main-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: var(--obsidian-bg-primary);
  
  // Obsidian CSS变量
  --obsidian-bg-primary: #ffffff;
  --obsidian-bg-secondary: #f5f6f8;
  --obsidian-border: #e3e5e8;
  --obsidian-text-primary: #2e3338;
  --obsidian-text-secondary: #6a6d74;
  --obsidian-accent: #5b7fff;
  
  .el-container {
    height: 100%;
  }
  
  .left-panel,
  .center-panel,
  .right-panel {
    height: 100%;
    overflow: hidden;
    min-height: 0; // 🔑 关键！
  }
  
  .splitter {
    width: 4px;
    background: var(--obsidian-border);
    cursor: col-resize;
    transition: background 0.2s;
    
    &:hover {
      background: var(--obsidian-accent);
    }
  }
}
</style>
```

#### **3. ProjectPage.Shell.vue（左右栏Shell容器 - 可复用）**

```vue
<template>
  <div class="project-page-shell" :class="[`shell-${type}`]">
    <!-- 左栏内容 -->
    <template v-if="type === 'left'">
      <ProjectNavbar class="navbar" />
      <div class="file-tree-container">
        <FileTreeToolbar />
        <FileTreeContent />
      </div>
    </template>
    
    <!-- 右栏内容 -->
    <template v-else-if="type === 'right'">
      <OutlineContent />
    </template>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import ProjectNavbar from '@components/ProjectPage.Shell/Navbar/ProjectNavbar.vue'
import FileTreeToolbar from '@components/ProjectPage.Shell/FileTree/FileTreeToolbar.vue'
import FileTreeContent from '@components/ProjectPage.Shell/FileTree/FileTreeContent.vue'
import OutlineContent from '@components/ProjectPage.Shell/Outline/OutlineContent.vue'

defineProps<{
  type: 'left' | 'right'  // 通过type区分左右栏
}>()
</script>

<style scoped lang="scss">
.project-page-shell {
  height: 100%;
  overflow: hidden;
  min-height: 0; // 🔑 关键！
  
  &.shell-left {
    display: flex;
    
    .navbar {
      width: 48px;
      flex-shrink: 0;
    }
    
    .file-tree-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0; // 🔑 关键！
    }
  }
  
  &.shell-right {
    // 大纲面板样式
  }
}
</style>
```

#### **4. ProjectPage.MainPanel.vue（中栏主面板容器）**

```vue
<template>
  <div class="project-page-main-panel">
    <MarkdownTab />
  </div>
</template>

<script setup lang="ts">
import MarkdownTab from '@components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue'
</script>

<style scoped lang="scss">
.project-page-main-panel {
  height: 100%;
  overflow: hidden;
  min-height: 0; // 🔑 关键！
}
</style>
```

#### **5. MarkdownTab.vue（核心组件适配示例）**

```vue
<template>
  <div class="markdown-tabs">
    <el-tabs
      v-model="activeTab"
      type="card"
      closable
      @tab-remove="handleTabRemove"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.id"
        :label="tab.name"
        :name="tab.id"
      >
        <div class="tab-main">
          <MarkdownViewer
            v-if="tab.mode === 'view'"
            :content="tab.content"
          />
          <MarkdownEditor
            v-else
            v-model="tab.content"
          />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMarkdownStore } from '@stores/projectPage'
import MarkdownEditor from './MarkdownEditor.vue'
import MarkdownViewer from './MarkdownViewer.vue'

const markdownStore = useMarkdownStore()
const activeTab = ref('')
const tabs = computed(() => markdownStore.tabs)

const handleTabRemove = (tabId: string) => {
  markdownStore.closeTab(tabId)
}
</script>

<style scoped lang="scss">
.markdown-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0; // 🔑 关键！
  
  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .el-tabs__content {
      flex: 1;
      min-height: 0 !important; // 🔑 必须!important覆盖Element Plus
      overflow: hidden;
    }
    
    .el-tab-pane {
      height: 100%;
      overflow: hidden;
      min-height: 0; // 🔑 关键！
    }
  }
  
  .tab-main {
    height: 100%;
    overflow: hidden;
    min-height: 0; // 🔑 关键！
  }
}
</style>
```

---

### 🚀 **集成步骤时间线**

| 阶段 | 任务 | 预估时间 | 产物验证 |
|------|------|---------|---------|
| **Day 1 上午** | 安装依赖 + Element Plus配置 | 1h | Element Plus按钮可正常渲染 |
| **Day 1 下午** | 迁移Markdown核心组件 | 2h | 编辑器/查看器独立可运行 |
| **Day 2 上午** | 重构Layout+Page结构 | 2h | 三栏布局正常显示 |
| **Day 2 下午** | 状态管理迁移 + Mock数据 | 1h | 文件树可点击打开文件 |
| **Day 3 上午** | 路由集成 + 导航逻辑 | 1h | 从主窗口可跳转到项目页 |
| **Day 3 下午** | 样式调优 + Flex布局修复 | 2h | 滚动条、自适应高度正常 |
| **Day 4** | 测试 + Bug修复 | 3h | 全功能可用 |

**总计**：约3-4个工作日

---

### ⚠️ **潜在风险与应对**

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| Element Plus与Quasar样式冲突 | 🟡 中 | CSS命名空间隔离 + scoped样式 |
| Vditor CDN资源加载失败 | 🔴 高 | 使用本地打包或备用CDN |
| Flex布局滚动问题复现 | 🟢 低 | 已有完整解决方案（文档记录） |
| 路由嵌套层级过深 | 🟡 中 | 简化路由结构，减少嵌套 |
| Mock数据与真实数据结构不匹配 | 🟡 中 | 预留数据适配层 |

---

### 📋 **验收标准**

#### **功能验收**
- [x] ✅ 从主窗口点击"打开项目"可跳转到项目页
- [x] ✅ 文件树正常显示，单击打开文件
- [x] ✅ 标签页系统正常工作（打开、关闭、切换）
- [x] ✅ 编辑模式与查看模式可切换
- [x] ✅ Markdown内容正常渲染（代码高亮、公式、表格）
- [x] ✅ 前进后退按钮正常工作
- [x] ✅ 面包屑路径正确显示

#### **UI验收**
- [x] ✅ 三栏布局正常显示（左侧导航48px + 文件树280px + 主编辑区flex）
- [x] ✅ 文件树和大纲面板可拖拽调整宽度
- [x] ✅ 滚动条正常显示（查看模式自定义滚动）
- [x] ✅ 编辑器自适应高度填充父容器
- [x] ✅ Obsidian风格主题正确应用

#### **性能验收**
- [x] ✅ 页面加载时间 < 2秒
- [x] ✅ 文件打开延迟 < 500ms
- [x] ✅ 标签页切换流畅无卡顿
- [x] ✅ 大文件（>1MB）编辑不卡顿

---

### ⚠️ **注意事项与常见陷阱**

#### **1. Flex布局陷阱**

| 问题症状 | 原因 | 解决方案 |
|---------|------|---------|
| 滚动条不显示 | 缺少`min-height: 0` | 在所有flex子项添加`min-height: 0` |
| 内容撑破容器 | Element Plus默认样式 | 使用`:deep()`+`!important`覆盖 |
| 多层滚动冲突 | 多个容器有`overflow: auto` | 只在最终层设置`overflow: auto` |
| Tabs内容不自适应 | 缺少flex链路 | 完整链路：`.el-tabs` → `.el-tabs__content` → `.el-tab-pane` |

**检查清单**：
```scss
// 从Layout到滚动层的完整链路检查
ProjectMainLayout { overflow: hidden; }
  → .center-panel { overflow: hidden; min-height: 0; }
    → ProjectMainPanel { overflow: hidden; min-height: 0; }
      → .markdown-tabs { overflow: hidden; min-height: 0; }
        → .el-tabs__content { overflow: hidden; min-height: 0 !important; }
          → .tab-main { overflow: hidden; min-height: 0; }
            → .markdown-viewer { overflow-y: auto; } ✅ 唯一滚动层
```

#### **2. 路径导入陷阱**

| ❌ 错误做法 | ✅ 正确做法 | 说明 |
|-----------|-----------|------|
| `import '../../../stores/projectPage'` | `import '@stores/projectPage'` | 使用别名 |
| `import 'components/ProjectPage/...'` | `import '@components/ProjectPage/...'` | 加@前缀 |
| `import { ElButton } from 'element-plus/lib/...'` | `import { ElButton } from 'element-plus'` | 自动按需导入 |

#### **3. Element Plus + Quasar共存陷阱**

**样式冲突防范**：
```scss
// ✅ 正确：在ProjectPage系统根元素设置作用域
.project-main-layout {
  // Element Plus样式只在这个作用域内生效
  :deep(.el-button) {
    // 自定义覆盖
  }
}

// ❌ 错误：全局覆盖会影响Quasar
.el-button {
  // 这会影响整个应用！
}
```

**组件混用原则**：
- ✅ Layout层可以混用（ProjectMainLayout用`<el-container>`）
- ✅ 功能隔离区域用各自组件（ProjectPage用Element，HomeSystem用Quasar）
- ❌ 不要在同一个组件内混用两套UI框架的按钮/表单组件

#### **4. Store命名空间陷阱**

**防止store冲突**：
```typescript
// ✅ 正确：带命名空间
export const useMarkdownStore = defineStore('projectPage-markdown', () => {
  // ...
})

// ❌ 错误：可能与其他模块冲突
export const useMarkdownStore = defineStore('markdown', () => {
  // ...
})
```

#### **5. Vditor初始化陷阱**

**CDN配置**：
```typescript
// ✅ 正确：指定版本CDN
new Vditor(el, {
  cdn: 'https://cdn.jsdelivr.net/npm/vditor@3.10.7',
  // ...
})

// ❌ 错误：不指定CDN可能加载失败
new Vditor(el, {
  // 缺少cdn配置
})
```

**销毁时机**：
```typescript
// ✅ 正确：组件卸载时销毁
onBeforeUnmount(() => {
  if (vditor) {
    vditor.destroy()
    vditor = null
  }
})
```

#### **6. 命名视图路由陷阱**

**必须提供所有命名视图**：
```typescript
// ❌ 错误：只提供center，会导致left/right不显示
components: {
  center: () => import('@pages/ProjectPage.MainPanel.vue')
}

// ✅ 正确：提供完整的三栏 + props
components: {
  left: () => import('@pages/ProjectPage.Shell.vue'),
  center: () => import('@pages/ProjectPage.MainPanel.vue'),
  right: () => import('@pages/ProjectPage.Shell.vue')
},
props: {
  left: { type: 'left' },
  center: {},
  right: { type: 'right' }
}
```

#### **7. TypeScript类型陷阱**

**别名类型导入**：
```typescript
// ✅ 正确：使用type关键字导入类型
import type { MarkdownFile } from '@stores/projectPage/Markdown/types'

// ❌ 错误：混淆值导入和类型导入
import { MarkdownFile } from '@stores/projectPage/Markdown/types'
```

**Vditor类型声明**：
```typescript
// 如果缺少类型，添加声明文件
// Client/types/vditor.d.ts
declare module 'vditor' {
  export default class Vditor {
    constructor(el: HTMLElement, options: any)
    destroy(): void
    // ...
  }
}
```

---

### 🔮 **未来扩展方向**

#### **Phase 2：数据源集成（Week 2-3）**
- 替换Mock数据为Electron文件系统API
- 实现文件保存、创建、删除功能
- 文件监听与自动刷新

#### **Phase 3：高级功能（Week 4-6）**
- 大纲面板自动生成
- 全局搜索功能
- 图形视图（知识图谱）
- 快捷键系统
- 插件系统

---

### 📖 **参考文档**

1. ✅ **已有文档**：
   - `Document/总结/Obsidian风格Markdown编辑器实现总结_2025年10月05日11时44分.md`
   - `Document/Workflow/开发通用工作流.md`
   - `Document/架构设计/架构设计总览.md`

2. ✅ **需要遵循的规则**：
   - 文件组织规则（文档规则）
   - 单文件≤500行（模块化）
   - 中文交流
   - 使用uv管理Python包（如需）

---

## 📋 **设计总结**

### **核心设计决策**

1. **架构调整**：
   - ✅ ProjectMainLayout职责单一：只负责三栏容器+分隔器
   - ✅ 内容填充由内联router控制：使用命名视图（left/center/right）
   - ✅ 组件层级清晰：Index → Layout → PagesLayout → Components

2. **Flex布局原则**：
   - ✅ 完整的`min-height: 0`链路（从根到滚动层）
   - ✅ 唯一滚动层：只在`.markdown-viewer`设置`overflow-y: auto`
   - ✅ Element Plus样式覆盖：使用`:deep()` + `!important`

3. **导入路径规范**：
   - ✅ 强制使用别名（@stores、@components、@pages等）
   - ✅ 禁止跨父目录相对路径（避免`../../../`）
   - ✅ 类型导入使用`import type`

4. **技术栈共存**：
   - ✅ Element Plus + Quasar和谐共存
   - ✅ Vditor通过指定CDN正确加载
   - ✅ 样式命名空间隔离（`.project-main-layout`作用域）

### **关键文件清单（Shell设计版）**

**P0（核心）**：
- `Index/ProjectPageSystem.vue`（极简入口）
- `layouts/ProjectMainLayout.vue` + `.scss`（三栏容器 + 布局样式）
- `PagesLayout/ProjectPage.Shell.vue` + `.scss`（左右栏Shell容器 + 视觉样式）
- `PagesLayout/ProjectPage.MainPanel.vue` + `.scss`（中栏主面板 + 视觉样式）
- `components/ProjectPage.MainPanel/Markdown/` 三个组件（Editor/Viewer/Tab）
- `stores/projectPage/Markdown/`（Store + Mock + Types）
- `boot/element-plus.ts`（全局注册）
- 路由配置（routes.ts添加命名视图 + props）

**P1（次要）**：
- `components/ProjectPage.Shell/Navbar/ProjectNavbar.vue`
- `components/ProjectPage.Shell/FileTree/`（Toolbar + Content）

**P2（可延后）**：
- `components/ProjectPage.Shell/Outline/OutlineContent.vue`

**设计优势体现**：
- 文件数减少：从15个→13个（Shell复用减少2个）
- 职责更清晰：Shell vs MainPanel分工明确
- 扩展性更强：新增Shell组件或MainPanel组件都很方便

### **实施路径**

**Day 1**：依赖配置 + 核心组件迁移
**Day 2**：Layout + Page结构重构 + Store迁移
**Day 3**：路由集成 + 样式调优
**Day 4**：测试 + Bug修复

---

## 📝 **设计修正总结（基于Boss批注）**

### **关键调整点**

1. **✅ 添加项目打开流程分析**：
   - 分析了 `useProjectSelectionStore` → `createProjectWindow` 的完整流程
   - 明确当前项目窗口打开空页面，需替换为 `/project` 路由
   - 项目窗口初始化时自动导航到三栏布局

2. **✅ 简化目录结构（去除中间层）**：
   - `PagesLayout/ProjectPage/` → `PagesLayout/` （直接放三个Panel）
   - `components/ProjectPage/` → `components/` （直接按功能分目录）
   - 目的：扁平化，减少嵌套

3. **✅ Store按业务模块组织（参照home/project）**：
   - `stores/projectPage/markdown.store.ts` → `stores/projectPage/Markdown/markdown.store.ts`
   - 增加 `projectPage/index.ts` 和 `Markdown/index.ts` 两级导出
   - 禁止零散文件，必须模块化组织

4. **✅ 样式分离策略（布局 vs 视觉）**：
   - **layouts/ProjectMainLayout.scss**：控制flex链路、overflow、高度
   - **PagesLayout/*.scss**：控制颜色、背景、边框等视觉样式
   - 目的：统一管理滚动链路，便于维护

5. **✅ 全面更新路径引用（90+处修改）**：
   - 组件路径：`@components/ProjectPage/Markdown/` → `@components/Markdown/`
   - Store路径：`@stores/projectPage/types` → `@stores/projectPage/Markdown/types`
   - Panel路径：`@pages/ProjectPage/` → `@pages/`
   - 更新了：目录结构、迁移清单、路由配置、骨架代码、别名表、陷阱示例

6. **✅ 增加文件数量说明**：
   - 新建文件：11个 → 15个（增加4个独立scss文件）
   - 明确每个文件的优先级（P0/P1/P2）和依赖关系

### **与原设计的差异**

| 维度 | 第一版设计 | 第二版修正（扁平化） | 第三版Shell设计（最终） | 原因 |
|------|----------|------------------|---------------------|------|
| PagesLayout组织 | `ProjectPage/`子目录 | 直接放根目录（3个Panel） | Shell + MainPanel（2个） | 左右栏归类为Shell，复用性强 |
| components组织 | `ProjectPage/`子目录 | 直接分功能目录 | `ProjectPage.Shell/` + `ProjectPage.MainPanel/` | 按职责分组，扩展灵活 |
| 左右栏实现 | 独立组件 | 独立组件 | 共用Shell.vue（通过props区分） | 减少冗余，提高复用 |
| Store组织 | 单层目录 | 二层目录（Markdown/） | 二层目录（Markdown/） | 参照home/project模块化 |
| 样式组织 | 全在组件中 | 分离为Layout + Panel | 分离为Layout + Shell + MainPanel | 分离布局与视觉 |
| 文件数量 | 11个新建 | 15个新建 | **13个新建** | Shell复用减少2个文件 |

---

## 🎯 **Shell设计核心优势总结**

### **1. 职责清晰**
- **Shell**：管理外围组件（Navbar、FileTree、Outline）
- **MainPanel**：管理主内容区（Markdown编辑器）
- 边界明确，各司其职

### **2. 复用性强**
- 左右栏共用一个 `ProjectPage.Shell.vue`
- 通过 `type` prop区分显示内容
- 减少冗余代码，降低维护成本

### **3. 扩展灵活**
- 未来添加新的Shell组件：直接在 `ProjectPage.Shell/` 下添加
- 未来添加新的MainPanel组件：直接在 `ProjectPage.MainPanel/` 下添加
- 不影响其他部分，改动范围小

### **4. 命名规范**
- 使用 `.` 分隔符表示层级关系（Vue推荐）
- `ProjectPage.Shell.vue` 清晰表达"这是ProjectPage的Shell部分"
- `ProjectPage.MainPanel.vue` 清晰表达"这是ProjectPage的主面板部分"

---

**Shell设计完成！所有批注已全面响应，Boss可随时开始实施 🚀**

