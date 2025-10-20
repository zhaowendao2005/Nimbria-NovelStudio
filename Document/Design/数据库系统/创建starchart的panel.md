好的，boss。我来根据这两份文档为您规划一个新的图数据可视化Panel。

首先，我建议**取名为 `StarChart`**（图数据可视化面板），这样更清晰且符合命名规范。

---

## 📋 整体Plan

### 阶段规划（参考工作流时间）

| 阶段 | 任务 | 时间 | 状态 |
|------|------|------|------|
| **Phase 1** | 基础架构搭建（创建目录结构） | 30分钟 | ⏳ 待启动 |
| **Phase 2** | 类型系统扩展（扩展MarkdownTab类型） | 15分钟 | ⏳ 待启动 |
| **Phase 3** | 组件实现（创建空壳Vue组件） | 30分钟 | ⏳ 待启动 |
| **Phase 4** | Store集成（创建Pinia store） | 1小时 | ⏳ 待启动 |
| **Phase 5** | 导航栏集成（注册到导航栏） | 30分钟 | ⏳ 待启动 |
| **Phase 6** | 调试验证（路径和渲染测试） | 30分钟 | ⏳ 待启动 |
| **总计** | 完整StarChart系统 | **~3.5小时** | - |

---

## 📁 文件架构修改树

```
Nimbria-NovelStudio-SigmaFork/
├── Nimbria/
│   └── Client/
│       ├── GUI/components/ProjectPage.MainPanel/
│       │   └── [新增目录] StarChart/
│       │       ├── [新增文件] StarChartPanel.vue        # 主容器组件（空壳）
│       │       ├── [新增文件] TopBar.vue                     # 工具栏（空壳）
│       │       ├── [新增文件] VisualizationArea.vue          # 可视化区域（空壳）
│       │       └── [新增文件] index.ts                       # 导出文件
│       │
│       ├── stores/projectPage/
│       │   └── [新增目录] starChart/
│       │       ├── [新增文件] starChart.types.ts        # 类型定义
│       │       ├── [新增文件] starChart.mock.ts         # Mock数据
│       │       ├── [新增文件] starChart.store.ts        # Pinia Store
│       │       └── [新增文件] index.ts                       # Store导出
│       │
│       ├── Service/
│       │   └── [新增目录] StarChart/
│       │       ├── [新增文件] starChart.service.types.ts # Service类型
│       │       ├── [新增文件] visualizationService.ts         # 可视化业务逻辑
│       │       └── [新增文件] index.ts                        # Service导出
│       │
│       ├── stores/projectPage/
│       │   └── [修改文件] Markdown/types.ts
│       │       └── 内部模块：在MarkdownTab.type联合类型中新增 'starchart'
│       │
│       └── GUI/components/ProjectPage.MainPanel/
│           └── [修改文件] PaneSystem/PaneContent.vue
│               └── 内部模块：新增StarChartPanel的条件渲染
│
├── 导航栏集成（ProjectNavbar.vue）
│   └── [修改文件] GUI/components/ProjectPage.Shell/Navbar/ProjectNavbar.vue
│       ├── 内部模块：新增StarChart按钮
│       └── 内部模块：在handleClick中添加 'starchart' 分支处理
│
└── 配置更新
    └── [修改文件] 可选的全局配置文件（如有统一的Panel注册表）
```

---

## 🎯 关键决策点

### 1️⃣ 架构方案选择

根据项目现有结构，**推荐使用传统Panel系统**而非CustomPageManager，原因：

- ✅ 与DocParser等现有Panel保持一致
- ✅ 已有成熟的Pane/Tab系统
- ✅ Store集成方式明确
- ✅ CustomPageManager文档中提到需要`tabType`注册，而传统系统已自然支持

### 2️⃣ 初始化状态

`其余留空`的理解：

| 项 | 状态 |
|----|------|
| 目录结构 | ✅ 完整创建 |
| 类型定义 | ✅ 定义基础接口 |
| Vue组件 | ⚪ 空壳（仅基础结构） |
| Store逻辑 | ⚪ 最小化实现 |
| Service | ⚪ 骨架代码 |
| 样式 | ⚪ 基础容器样式 |

---

## 📐 完整的文件清单

### 需要创建的文件（共10个）

```
✅ 创建列表
├── 组件层（4个文件）
│   ├── Client/GUI/components/ProjectPage.MainPanel/StarChart/StarChartPanel.vue
│   ├── Client/GUI/components/ProjectPage.MainPanel/StarChart/TopBar.vue
│   ├── Client/GUI/components/ProjectPage.MainPanel/StarChart/VisualizationArea.vue
│   └── Client/GUI/components/ProjectPage.MainPanel/StarChart/index.ts
│
├── Store层（4个文件）
│   ├── Client/stores/projectPage/starChart/starChart.types.ts
│   ├── Client/stores/projectPage/starChart/starChart.mock.ts
│   ├── Client/stores/projectPage/starChart/starChart.store.ts
│   └── Client/stores/projectPage/starChart/index.ts
│
└── Service层（2个文件）
    ├── Client/Service/StarChart/starChart.service.types.ts
    └── Client/Service/StarChart/visualizationService.ts
    └── Client/Service/StarChart/index.ts  (3个文件)
```

### 需要修改的文件（3个）

```
🔄 修改列表
├── Client/stores/projectPage/Markdown/types.ts
│   └── 在 MarkdownTab.type 中添加 'starchart'
│
├── Client/GUI/components/ProjectPage.MainPanel/PaneSystem/PaneContent.vue
│   └── 新增条件渲染分支
│
└── Client/GUI/components/ProjectPage.Shell/Navbar/ProjectNavbar.vue
│   └── 新增按钮和处理逻辑
```

---

## 🔍 核心集成点检查清单

```
集成验证清单：
□ MarkdownTab类型已扩展 'starchart'
□ StarChartPanel组件已导出
□ useStarChartStore已导出
□ PaneContent.vue条件渲染已添加
□ ProjectNavbar.vue按钮已添加
□ 路径别名检查（@service, @stores, @components全部小写）
□ 导出检查（每层index.ts已统一导出）
```

**Store层必须导出**：
```typescript
// stores/projectPage/[yourPanel]/index.ts
export { useYourPanelStore } from './[yourPanel].store'
export * from './[yourPanel].types'
export * from './logic'  // ⚠️ 如果有业务逻辑封装，必须导出
```

**Service层必须导出**：
```typescript
// Service/[yourPanel]/index.ts
export { YourService } from './yourService'
export * from './[yourPanel].service.types'
```

**GUI层必须导出**：
```typescript
// GUI/components/ProjectPage.MainPanel/[YourPanel]/index.ts
export { default as YourPanelPanel } from './YourPanelPanel.vue'
```

---

## 🎨 StarChart Panel 设计总结

### 核心目标
StarChart 是 Nimbria 项目的**图数据可视化面板**，用于实时展示和交互数据库中的关系图数据。该Panel集成在项目系统中，作为 Markdown 编辑器的补充工具。

### 架构特点
✅ **三层分离**：GUI（StarChartPanel）→ Store（starChart Store）→ Service（可视化业务逻辑）  
✅ **类型安全**：所有层级均有独立的类型定义文件  
✅ **Tab系统集成**：通过扩展 MarkdownTab 的 `'starchart'` 类型无缝集成  
✅ **导航栏按钮**：在侧边栏快速启动  
✅ **Mock优先开发**：初期使用Mock数据，后期关联数据库系统  

### 实现路线图
1. **Phase 1-3**：基础架构与骨架组件完成
2. **Phase 4-5**：Store、Service与导航栏集成
3. **Phase 6**：测试验证，与数据库系统关联

### 预期成果
完成后，用户可以通过导航栏快速打开 StarChart 面板，在 Pane 系统中以标签页形式展示，支持与其他编辑面板并排操作。

---

**文档完成日期**：2025-01-12  
**设计阶段**：Phase 1-6 规划完成  
**下一步**：执行开发实现

