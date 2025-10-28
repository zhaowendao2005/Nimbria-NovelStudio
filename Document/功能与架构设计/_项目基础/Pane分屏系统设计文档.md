# Nimbria Pane分屏系统设计文档

**版本**: v1.0  
**创建时间**: 2025年10月11日  
**文档状态**: 反映实际实现  

---

## 📋 系统概述

Nimbria 的 Pane 分屏系统提供了一个高度灵活和可定制的布局管理方案，允许用户通过拖拽分隔线、右键菜单操作来创建、调整和管理多个独立的编辑区域（Pane）。每个 Pane 内部可以承载多个标签页，并独立管理其焦点和内容。

### 🎯 核心特性

- **树状布局结构**: Pane 布局以树状结构表示，支持任意层级的水平和垂直分割。
- **动态创建与销毁**: 用户可以随时创建新的分屏或关闭现有分屏。
- **拖拽调整大小**: 分隔线可拖拽，实时调整分屏的尺寸。
- **焦点管理**: 每个 Pane 都有独立的焦点状态，区分活动编辑区域。
- **右键菜单操作**: 提供丰富的 Pane 级别操作，如分屏、关闭、拆分标签页到新窗口等。
- **状态持久化**: 分屏布局结构、比例和焦点状态自动保存。
- **跨窗口拆分**: 支持将标签页从当前 Pane 拆分到独立的 Electron 窗口。

---

## 🏗️ 系统架构

### 组件层次结构

```
ProjectPage.MainPanel (主面板容器)
└── PaneContainer (递归渲染分屏树)
    ├── QSplitter (Element Plus 分隔器, 处理 Split 节点)
    │   ├── PaneContainer (递归)
    │   └── PaneContainer (递归)
    └── PaneContent (叶子节点, 包含标签页系统)
        ├── DraggableTabBar (可拖拽标签栏)
        │   └── MarkdownTab (单个 Markdown 标签页)
        └── ContextMenu (右键菜单)
```

### 数据流架构

```
Vue组件 ↔ PaneLayoutStore (Pinia) ↔ 持久化存储 (localStorage)
```

---

## 📁 核心文件清单

### 前端组件

| 文件路径 | 职责 |
|---------|------|
| `Client/GUI/components/ProjectPage.MainPanel/PaneSystem/PaneContainer.vue` | 递归渲染分屏树结构，处理 Splitter 逻辑 |
| `Client/GUI/components/ProjectPage.MainPanel/PaneSystem/PaneContent.vue` | 叶子面板组件，包含标签页、焦点指示器和右键菜单 |
| `Client/GUI/components/ProjectPage.MainPanel/PaneSystem/DraggableTabBar.vue` | 可拖拽的标签页栏，管理标签页的切换和关闭 |
| `Client/GUI/components/ProjectPage.MainPanel/PaneSystem/ContextMenu.vue` | Pane 的右键上下文菜单，提供分屏操作 |

### 状态管理

| 文件路径 | 职责 |
|---------|------|
| `Client/stores/projectPage/paneLayout/paneLayout.store.ts` | 核心状态管理：分屏树、焦点、分屏操作 |
| `Client/stores/projectPage/paneLayout/types.ts` | TypeScript 类型定义 |

### 其他相关文件

| 文件路径 | 职责 |
|---------|------|
| `Document/总结/多窗口系统滚动问题修复总结_2025年10月10日.md` | 详细记录了 Flex 布局下的滚动问题及解决方案 |
| `Document/总结/标签页拆分到新窗口实现总结_2025年10月10日10-54.md` | 详细记录了标签页拆分到新窗口的实现 |

---

## 🔧 技术实现细节

### 1. 分屏树结构 (PaneNode)

#### 数据结构定义

```typescript
interface PaneNode {
  id: string;
  type: 'leaf' | 'split';
  isFocused?: boolean; // 焦点状态
  
  // 叶子节点特有
  tabIds?: string[];
  activeTabId?: string | null;
  
  // 分割节点特有
  direction?: SplitDirection; // 'horizontal' | 'vertical'
  splitRatio?: number;        // 分割比例 (0-100)
  children?: [PaneNode, PaneNode]; // 两个子节点
}
```

#### 树操作

- **创建分屏**: `splitPane(sourcePaneId, direction, newPaneId)`
- **合并/关闭分屏**: `removePane(paneId)`
- **更新比例**: `updateSplitRatio(splitNodeId, ratio)`
- **设置焦点**: `setFocusedPane(paneId)`

### 2. 拖拽调整大小 (QSplitter)

- 使用 Quasar 的 `<q-splitter>` 组件实现可拖拽的分隔线。
- `model-value`: 绑定分割比例，支持双向同步。
- `horizontal`: 控制水平或垂直分割。
- `limits`: 设置最小/最大分割比例。
- `@update:model-value`: 监听比例变化，更新 `PaneLayoutStore`。

### 3. 焦点管理

- `focusedPaneId`: `PaneLayoutStore` 中的一个 `ref`，指示当前拥有焦点的 Pane。
- `isFocused` 属性: 每个 `PaneNode` 都有一个 `isFocused` 属性，用于 UI 渲染焦点指示器。
- `setFocusedPane(paneId)`: 当用户点击 Pane 时，更新全局焦点状态和 PaneNode 树中的 `isFocused` 属性。

### 4. 右键菜单操作

#### 菜单项定义

```typescript
interface PaneContextMenuItem {
  action: SplitAction | 'detach-to-window' | 'close-pane';
  label: string;
  icon?: string;
  divider?: boolean;
}
```

#### 分屏操作 (SplitAction)

- `split-right-and-move`: 向右分屏并移动当前标签页
- `split-down-and-move`: 向下分屏并移动当前标签页
- `split-right-and-copy`: 向右分屏并复制当前标签页
- `split-down-and-copy`: 向下分屏并复制当前标签页

#### 拆分到新窗口

- 菜单项 `detach-to-window` 触发。
- 调用 `window.nimbria.project.detachTabToWindow()` API。
- 详细实现见 `多窗口系统设计文档.md` 和 `标签页拆分到新窗口实现总结.md`。

### 5. 状态持久化

- `PaneLayoutStore` 的 `paneTree` 和 `focusedPaneId` 状态会被持久化到 `localStorage`。
- 应用启动时从 `localStorage` 恢复上次的布局状态。
- 使用 `STATE_VERSION` 字段来管理缓存版本，以兼容旧数据格式。

---

## 🗄️ 状态管理详解 (PaneLayoutStore)

### 核心状态

```typescript
interface PaneLayoutStore {
  paneTree: PaneNode | null;       // 分屏树的根节点
  focusedPaneId: string | null;    // 当前焦点面板 ID
}
```

### 计算属性

| 属性 | 职责 |
|------|------|
| `allLeafPanes` | 扁平化所有叶子节点 |
| `focusedPane` | 当前焦点面板的节点对象 |
| `paneCount` | 当前活动的叶子面板总数 |
| `hasMultiplePanes` | 是否存在多个面板 |
| `hasPanes` | 是否有任何面板（paneTree 不为 null） |

### 关键方法

#### 分屏与关闭
```typescript
// 执行分屏操作
executeSplitAction(paneId: string, action: SplitAction, tabId: string): string | null

// 关闭面板
removePane(paneId: string): void
```

#### 焦点管理
```typescript
// 设置焦点面板
setFocusedPane(paneId: string): void
```

#### 标签页管理
```typescript
// 将标签页添加到面板
addTabToPane(paneId: string, tabId: string): void

// 从面板中移除标签页
removeTabFromPane(paneId: string, tabId: string): void

// 切换面板中的活跃标签页
switchActiveTab(paneId: string, tabId: string): void
```

#### 持久化
```typescript
// 加载布局状态
loadLayoutState(): void

// 保存布局状态
saveLayoutState(): void
```

---

## 🎨 UI/UX 设计特点

### 1. Flexbox 滚动容器模式

#### 布局核心原则
- **父容器**：`display: flex; flex-direction: column; height: 100%; overflow: hidden;`
- **子容器（可滚动）**：`flex: 1; min-height: 0; overflow-y: auto;`
- **子容器（固定高度）**：`flex-shrink: 0; height: <fixed-value>;`

#### 样式修复经验

在 `多窗口系统滚动问题修复总结_2025年10月10日.md` 中详细记录了 Element Plus `<el-tabs>` 与 Flex 布局的兼容问题，通过 `min-height: 0 !important` 和 `:deep()` 选择器解决了滚动失效的问题。这些经验同样适用于 Pane 内部的布局。

### 2. 焦点指示器

- 当 Pane 获得焦点时，通过边框高亮等视觉效果明确指示当前活动的编辑区域。
- 提升多分屏场景下的用户认知度。

### 3. 可拖拽标签栏 (DraggableTabBar)

- 提供直观的标签页切换和关闭操作。
- 支持未来扩展标签页的拖拽排序功能。

---

## 🧪 测试策略

### 单元测试重点

1. **PaneLayoutStore**
   - 分屏创建、合并、关闭逻辑测试
   - 焦点设置与切换测试
   - 标签页在 Pane 间移动和管理测试
   - 布局状态的加载与保存测试

2. **PaneContainer 递归渲染**
   - 确保 Splitter 的正确渲染和比例更新
   - 确保 Leaf 节点正确渲染 PaneContent

### 集成测试重点

1. **拖拽分隔线**: 验证分屏大小调整是否流畅且比例正确同步。
2. **右键菜单操作**: 验证分屏、关闭、拆分到新窗口等操作的正确性。
3. **多标签页与多 Pane 交互**: 验证标签页在不同 Pane 间的移动和激活。
4. **布局状态持久化**: 重启应用后，布局是否能正确恢复。

### E2E 测试场景

1. **创建复杂分屏布局**: 验证多层级水平/垂直分屏的创建与操作。
2. **多 Pane 编辑**: 在不同 Pane 中同时编辑不同文件，验证焦点切换和内容同步。
3. **标签页拆分到新窗口**: 验证拆分流程、源标签页关闭和新窗口的独立性。
4. **异常情况处理**: 如尝试关闭唯一 Pane、或关闭含有脏数据的 Pane。

---

## 📊 监控与调试

### 关键指标

1. **布局复杂度**: 分屏树的深度和节点数量，影响渲染性能。
2. **状态同步延迟**: PaneLayoutStore 与 UI 渲染的同步时间。
3. **内存占用**: 多 Pane 和多标签页下的内存消耗。

### 调试工具

1. **Vue DevTools**: 检查 PaneLayoutStore 的状态 (`paneTree`、`focusedPaneId`)，观察其变化。
2. **浏览器元素检查器**: 检查 Flex 布局的实际效果，特别是 `min-height` 和 `overflow` 属性。
3. **控制台日志**: `[PaneLayout]` 前缀的日志输出，追踪分屏操作和焦点变化。

---

## 🔄 版本历史与路线图

### 当前版本 (v1.0)

- ✅ 树状分屏布局的核心实现
- ✅ 拖拽调整分隔线大小
- ✅ Pane 焦点管理
- ✅ 右键菜单提供分屏、关闭、拆分标签页到新窗口等操作
- ✅ 布局状态持久化

### 计划中的功能 (v1.1+)

- [ ] 标签页拖拽到不同 Pane
- [ ] 标签页拖拽出窗口创建新 Pane
- [ ] 更多布局预设（如 2x2 网格）
- [ ] 分屏内容保存与恢复
- [ ] 全局布局管理器（跨项目共享布局）

---

## 📖 相关文档

- [架构设计总览](./架构设计总览.md)
- [Markdown编辑系统设计文档](./Markdown编辑系统设计文档.md)
- [文件系统与项目结构设计文档](./文件系统与项目结构设计文档.md)
- [多窗口系统设计文档](./多窗口系统设计文档.md)
- [多窗口系统滚动问题修复总结_2025年10月10日.md](../总结/多窗口系统滚动问题修复总结_2025年10月10日.md)
- [标签页拆分到新窗口实现总结_2025年10月10日10-54.md](../总结/标签页拆分到新窗口实现总结_2025年10月10日10-54.md)

---

**最后更新**: 2025年10月11日  
**负责人**: Nimbria 开发团队
