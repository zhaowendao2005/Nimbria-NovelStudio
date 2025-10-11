# Nimbria Markdown编辑系统设计文档

**版本**: v1.0  
**创建时间**: 2025年10月11日  
**文档状态**: 反映实际实现  

---

## 📋 系统概述

Nimbria 的 Markdown 编辑系统是一个完整的文档编辑和管理解决方案，基于 **Vditor** 编辑器构建，提供类似 Obsidian 的用户体验。系统支持多标签页管理、编辑/预览模式切换、自动保存、大纲跳转等核心功能。

### 🎯 核心特性

- **双模式编辑**: 支持编辑模式和预览模式无缝切换
- **多标签页管理**: 同时打开多个 Markdown 文件
- **自动保存机制**: 智能防抖、错误重试、批量保存
- **大纲跳转**: 编辑器与预览器的双向跳转
- **文件树集成**: 与项目文件系统深度集成
- **历史导航**: 前进/后退功能
- **IPC 通信**: 与主进程的文件服务深度整合

---

## 🏗️ 系统架构

### 组件层次结构

```
MarkdownTab (标签页容器)
├── Header (面包屑 + 模式切换)
├── MarkdownEditor (编辑模式)
│   └── Vditor (IR 模式)
└── MarkdownViewer (预览模式)
    └── Vditor.md2html (静态渲染)
```

### 数据流架构

```
Vue组件 ↔ MarkdownStore (Pinia) ↔ 文件服务 (IPC) ↔ 主进程
```

---

## 📁 核心文件清单

### 前端组件

| 文件路径 | 职责 |
|---------|------|
| `Client/GUI/components/ProjectPage.MainPanel/Markdown/MarkdownTab.vue` | 标签页容器，负责模式切换和导航 |
| `Client/GUI/components/ProjectPage.MainPanel/Markdown/MarkdownEditor.vue` | Vditor编辑器封装，支持大纲跳转和快捷键 |
| `Client/GUI/components/ProjectPage.MainPanel/Markdown/MarkdownViewer.vue` | Markdown预览渲染，支持语法高亮和数学公式 |

### 状态管理

| 文件路径 | 职责 |
|---------|------|
| `Client/stores/projectPage/Markdown/markdown.store.ts` | 核心状态管理：文件树、标签页、导航历史 |
| `Client/stores/projectPage/Markdown/markdown.autosave.ts` | 自动保存控制器：防抖、重试、批量保存 |
| `Client/stores/projectPage/Markdown/types.ts` | TypeScript 类型定义 |
| `Client/stores/projectPage/Markdown/markdown.mock.ts` | Mock 数据支持 |

### 后端服务

| 文件路径 | 职责 |
|---------|------|
| `src-electron/services/markdown-service/` | Markdown 专项服务模块 |
| `src-electron/services/file-service/` | 通用文件系统服务 |
| `src-electron/ipc/main-renderer/markdown-handlers.ts` | Markdown 相关 IPC 处理器 |

---

## 🔧 技术实现细节

### 1. Vditor 编辑器集成

#### 配置参数
```typescript
new Vditor(container, {
  height: '100%',
  mode: 'ir',              // Instant Rendering 模式（类似 Obsidian）
  placeholder: '开始编写...',
  theme: 'classic',
  cdn: 'https://cdn.jsdelivr.net/npm/vditor@3.10.7',
  
  toolbarConfig: {
    pin: true,             // 固定工具栏
  },
  
  cache: {
    enable: false,         // 禁用缓存避免冲突
  },
  
  input: (value) => {      // 实时内容变化回调
    emit('update:modelValue', value)
    emit('change', value)
  }
})
```

#### 关键特性

- **IR 模式**: 提供类似 Obsidian 的即时渲染体验
- **快捷键支持**: `Ctrl+S` 触发保存
- **大纲跳转**: 通过 DOM 操作实现编辑器内的定位
- **双向绑定**: 支持外部内容更新

### 2. 模式切换机制

#### 编辑模式
- 使用 `MarkdownEditor.vue` 组件
- 基于 Vditor IR 模式
- 支持实时预览和语法高亮
- 提供工具栏和快捷操作

#### 预览模式
- 使用 `MarkdownViewer.vue` 组件
- 基于 `Vditor.md2html` 静态渲染
- 支持代码高亮、数学公式、媒体渲染
- 优化的阅读体验

#### 切换逻辑
```typescript
// 在 MarkdownStore 中管理模式状态
const switchTabMode = (tabId: string, mode: 'edit' | 'view') => {
  const tab = openTabs.value.find(t => t.id === tabId)
  if (tab) {
    tab.mode = mode
  }
}
```

### 3. 自动保存系统

#### AutoSaveController 核心特性

```typescript
class AutoSaveController {
  private timers = new Map<string, NodeJS.Timeout>()
  private retryCount = new Map<string, number>()
  
  // 防抖保存（2秒延迟）
  scheduleAutoSave(tabId: string, callback: () => Promise<SaveResult>, delay = 2000)
  
  // 指数退避重试（最多3次）
  async executeSave(tabId: string, callback: () => Promise<SaveResult>)
  
  // 批量保存所有脏标签页
  async saveAllDirtyTabs()
}
```

#### 保存触发条件

1. **内容变更**: 用户编辑后自动触发（防抖2秒）
2. **手动保存**: `Ctrl+S` 快捷键
3. **标签页关闭**: 关闭前自动保存
4. **应用退出**: 批量保存所有未保存文件

#### 错误处理

- **重试机制**: 保存失败时自动重试（最多3次）
- **指数退避**: 重试间隔逐步增加（1秒 → 2秒 → 4秒）
- **用户提示**: 保存失败时显示友好的错误信息

### 4. 大纲跳转功能

#### 跳转数据结构
```typescript
interface OutlineScrollTarget {
  lineNumber: number  // 编辑模式：行号
  slug: string       // 预览模式：标题ID
}
```

#### 编辑模式跳转
```typescript
// 在 MarkdownEditor.vue 中实现
const lines = irElement.querySelectorAll('.vditor-ir__node')
const targetLine = lines[target.lineNumber - 1]
targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' })
```

#### 预览模式跳转
```typescript
// 在 MarkdownViewer.vue 中实现
const headingElement = viewerContainer.value.querySelector(`#${target.slug}`)
headingElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
```

---

## 🗄️ 状态管理详解

### MarkdownStore 核心状态

```typescript
interface MarkdownStore {
  // 项目和文件
  projectPath: string               // 当前项目路径
  fileTree: MarkdownFile[]          // 文件树数据
  
  // 标签页管理
  openTabs: MarkdownTab[]           // 打开的标签页列表
  activeTabId: string | null        // 当前激活的标签页ID
  
  // 导航历史
  navigationHistory: string[]       // 文件路径历史
  currentHistoryIndex: number       // 当前历史位置
  
  // 自动保存
  autoSaveConfig: AutoSaveConfig    // 自动保存配置
  saveProgress: SaveProgress        // 保存进度状态
  
  // 大纲跳转
  outlineScrollTarget: OutlineScrollTarget | null
}
```

### 关键方法

#### 文件操作
```typescript
// 打开文件
async openFile(filePath: string): Promise<void>

// 关闭标签页
closeTab(tabId: string): void

// 保存标签页
async saveTab(tabId: string): Promise<SaveResult>

// 更新内容
updateTabContent(tabId: string, content: string): void
```

#### 导航操作
```typescript
// 前进后退
goBack(): void
goForward(): void

// 历史记录管理
addToHistory(filePath: string): void
canGoBack: ComputedRef<boolean>
canGoForward: ComputedRef<boolean>
```

#### 模式切换
```typescript
// 切换编辑/预览模式
switchTabMode(tabId: string, mode: 'edit' | 'view'): void
```

---

## 🔗 IPC 通信协议

### 文件操作 IPC 通道

| 通道名 | 请求类型 | 响应类型 | 用途 |
|-------|---------|----------|------|
| `markdown:scan-files` | `{ projectPath: string }` | `MarkdownFile[]` | 扫描项目中的 Markdown 文件 |
| `markdown:read-file` | `{ filePath: string }` | `{ content: string }` | 读取文件内容 |
| `markdown:write-file` | `{ filePath: string, content: string }` | `SaveResult` | 写入文件内容 |
| `markdown:create-file` | `CreateFileRequest` | `SaveResult` | 创建新文件 |
| `markdown:delete-file` | `{ filePath: string }` | `SaveResult` | 删除文件 |

### 调用示例
```typescript
// 在 MarkdownStore 中调用
const scanFiles = async () => {
  if (Environment.isElectron) {
    const result = await window.nimbria.markdown.scanFiles({
      projectPath: projectPath.value
    })
    fileTree.value = result.files
  } else {
    // Vite 环境使用 Mock 数据
    await loadMockData()
  }
}
```

---

## 🎨 UI/UX 设计特点

### 1. Obsidian 风格主题

#### CSS 变量系统
```scss
.markdown-tab {
  --obsidian-bg-primary: #ffffff;      // 主背景
  --obsidian-bg-secondary: #f5f6f8;    // 次背景
  --obsidian-border: #e3e5e8;          // 边框色
  --obsidian-text-primary: #2e3338;    // 主文字
  --obsidian-text-secondary: #6a6d74;  // 次文字
  --obsidian-accent: #5b7fff;          // 强调色
}
```

### 2. 响应式布局

#### Flexbox 滚动容器模式
```scss
.markdown-tab {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tab-header {
  flex-shrink: 0;           // 头部固定
  height: 48px;
}

.tab-main {
  flex: 1;                  // 占满剩余空间
  min-height: 0;            // 🔑 关键：允许flex收缩
  overflow: hidden;         // 内部组件处理滚动
}
```

### 3. 交互细节

#### 面包屑导航
- 显示完整的文件路径
- 支持点击跳转到父目录
- 当前文件名加粗显示

#### 模式切换按钮
- 编辑/预览模式一键切换
- 按钮状态与当前模式同步
- 提供工具提示说明

#### 前进后退
- 记录文件访问历史
- 支持键盘快捷键（将来扩展）
- 按钮状态与历史记录同步

---

## 🚀 性能优化

### 1. 渲染优化

#### 编辑器懒加载
- Vditor 实例按需创建
- 组件销毁时正确清理资源
- 避免内存泄漏

#### 预览器静态渲染
- 使用 `Vditor.md2html` 静态方法
- 一次性渲染，减少实时计算
- 支持代码高亮、数学公式缓存

### 2. 自动保存优化

#### 防抖机制
- 2秒延迟避免频繁保存
- 每次内容变化重置计时器
- 减少磁盘I/O操作

#### 批量保存
- 应用关闭时批量处理所有脏文件
- 使用保存队列管理并发
- 提供保存进度反馈

### 3. 内存管理

#### Store 状态清理
- 组件销毁时清理相关状态
- 定期清理历史记录
- 限制同时打开的标签页数量（未来扩展）

---

## 🔧 开发指南

### 添加新的编辑器功能

1. **扩展 Vditor 配置**
   ```typescript
   // 在 MarkdownEditor.vue 中
   new Vditor(container, {
     // 添加新的配置选项
     yourNewFeature: {
       enable: true
     }
   })
   ```

2. **更新类型定义**
   ```typescript
   // 在 types.ts 中添加新类型
   interface MarkdownTab {
     // 添加新字段
     yourNewField?: string
   }
   ```

3. **扩展 Store 方法**
   ```typescript
   // 在 markdown.store.ts 中添加新方法
   const handleYourNewFeature = (tabId: string) => {
     // 实现逻辑
   }
   ```

### 添加新的预览功能

1. **扩展 Markdown 渲染**
   ```typescript
   // 在 MarkdownViewer.vue 中
   const html = await Vditor.md2html(markdown, {
     // 添加新的渲染选项
     yourExtension: {
       enable: true
     }
   })
   ```

2. **添加后处理逻辑**
   ```typescript
   const processSpecialContent = () => {
     // 添加新的内容处理
     yourNewProcessor(viewerContainer.value)
   }
   ```

### 扩展 IPC 通信

1. **定义新的 IPC 通道**
   ```typescript
   // 在 src-electron/types/ipc.ts 中
   'markdown:your-action': {
     request: YourRequest
     response: YourResponse
   }
   ```

2. **实现主进程处理器**
   ```typescript
   // 在 markdown-handlers.ts 中
   ipcMain.handle('markdown:your-action', async (_, request) => {
     // 实现处理逻辑
   })
   ```

3. **暴露前端 API**
   ```typescript
   // 在 project-preload.ts 中
   markdown: {
     yourAction: (request) => channelInvoke('markdown:your-action', request)
   }
   ```

---

## 🧪 测试策略

### 单元测试重点

1. **AutoSaveController**
   - 防抖逻辑测试
   - 重试机制测试
   - 错误处理测试

2. **MarkdownStore**
   - 状态变更测试
   - 异步操作测试
   - 历史记录测试

### 集成测试重点

1. **编辑器与预览器同步**
2. **自动保存与手动保存**
3. **大纲跳转功能**
4. **模式切换稳定性**

### E2E 测试场景

1. **完整编辑流程**：打开文件 → 编辑 → 保存 → 关闭
2. **多标签页管理**：同时打开多个文件并编辑
3. **模式切换**：编辑模式与预览模式间的切换
4. **异常恢复**：网络中断、文件锁定等异常情况

---

## 📊 监控与调试

### 关键指标

1. **性能指标**
   - 编辑器启动时间
   - 文件加载时间
   - 自动保存响应时间

2. **用户体验指标**
   - 模式切换延迟
   - 大纲跳转准确性
   - 错误恢复成功率

### 调试工具

1. **浏览器控制台**
   ```typescript
   // 获取 MarkdownStore 状态
   const store = useMarkdownStore()
   console.log('当前标签页:', store.openTabs)
   console.log('自动保存状态:', store.saveProgress)
   ```

2. **Electron DevTools**
   - 主进程调试：文件服务状态
   - 渲染进程调试：组件状态和性能

---

## 🔄 版本历史与路线图

### 当前版本 (v1.0)

- ✅ 基础编辑和预览功能
- ✅ 自动保存机制
- ✅ 多标签页管理
- ✅ 大纲跳转
- ✅ IPC 文件服务集成

### 计划中的功能 (v1.1+)

- [ ] 搜索和替换
- [ ] 插件系统扩展
- [ ] 协作编辑支持
- [ ] 版本历史管理
- [ ] 更多文件格式支持

---

## 📖 相关文档

- [架构设计总览](./架构设计总览.md)
- [Pane分屏系统设计文档](./Pane分屏系统设计文档.md)
- [文件系统与项目结构设计文档](./文件系统与项目结构设计文档.md)
- [多窗口系统设计文档](./多窗口系统设计文档.md)

---

**最后更新**: 2025年10月11日  
**负责人**: Nimbria 开发团队
