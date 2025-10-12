# 添加新Panel系统工作流

> 基于DocParser系统实现的完整工作流程

## 📋 目录

1. [架构概览](#架构概览)
2. [Phase 1: 基础架构搭建](#phase-1-基础架构搭建)
3. [Phase 2: 类型系统扩展](#phase-2-类型系统扩展)
4. [Phase 3: 组件实现](#phase-3-组件实现)
5. [Phase 4: Store集成](#phase-4-store集成)
6. [Phase 5: 导航栏集成](#phase-5-导航栏集成)
7. [Phase 6: 调试检查清单](#phase-6-调试检查清单)
8. [常见问题与解决方案](#常见问题与解决方案)

---

## 架构概览

### 文件组织结构

```
Nimbria/Client/
├── GUI/components/ProjectPage.MainPanel/
│   └── [YourPanel]/                    # 新Panel的GUI组件
│       ├── [YourPanel]Panel.vue        # 主容器组件
│       ├── TopBar.vue                  # 工具栏（可选）
│       ├── Component1.vue              # 功能组件1
│       ├── Component2.vue              # 功能组件2
│       └── index.ts                    # 组件导出
│
├── stores/projectPage/
│   └── [yourPanel]/                    # Store层
│       ├── [yourPanel].store.ts        # 状态管理
│       ├── [yourPanel].types.ts        # 类型定义
│       ├── [yourPanel].mock.ts         # Mock数据
│       ├── logic1.ts                   # 业务逻辑封装
│       ├── logic2.ts                   # 业务逻辑封装
│       └── index.ts                    # Store导出
│
└── Service/[yourPanel]/                # Service层
    ├── service1.ts                     # 核心服务1
    ├── service2.ts                     # 核心服务2
    ├── [yourPanel].service.types.ts   # Service类型
    └── index.ts                        # Service导出
```

### 核心原则

1. **三层架构**：GUI → Store → Service
2. **类型定义位置**：
   - Store类型：`stores/[yourPanel]/[yourPanel].types.ts`
   - Service类型：`Service/[yourPanel]/[yourPanel].service.types.ts`
3. **Mock优先**：开发阶段使用Mock数据，通过DataSource抽象切换
4. **模块化导出**：每层都有`index.ts`统一导出

---

## Phase 1: 基础架构搭建

### 1.1 创建目录结构

```bash
# GUI层
Client/GUI/components/ProjectPage.MainPanel/[YourPanel]/

# Store层
Client/stores/projectPage/[yourPanel]/

# Service层
Client/Service/[yourPanel]/
```

### 1.2 创建基础类型文件

**`stores/projectPage/[yourPanel]/[yourPanel].types.ts`**

```typescript
/**
 * [YourPanel] 核心类型定义
 */

// 主要数据结构
export interface YourDataType {
  id: string
  name: string
  // ... 其他字段
}

// 配置类型
export interface YourConfigType {
  option1: string
  option2: number
}

// 导出类型（如果需要）
export interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx'
  fields: string[]
}
```

**`Service/[yourPanel]/[yourPanel].service.types.ts`**

```typescript
/**
 * [YourPanel] Service层类型定义
 */

export interface ServiceRequestType {
  // 请求参数
}

export interface ServiceResponseType {
  // 响应数据
}
```

### 1.3 创建Mock数据

**`stores/projectPage/[yourPanel]/[yourPanel].mock.ts`**

```typescript
/**
 * [YourPanel] Mock数据
 */

import type { YourDataType } from './[yourPanel].types'

export const yourPanelMockData = {
  defaultData: {
    // 默认数据
  } as YourDataType,
  
  sampleList: [] as YourDataType[]
}

export function resetMock() {
  // 重置Mock数据
}
```

---

## Phase 2: 类型系统扩展

### 2.1 扩展MarkdownTab类型

**`stores/projectPage/Markdown/types.ts`**

```typescript
export interface MarkdownTab {
  id: string
  type?: 'markdown' | 'docparser' | 'yourpanel' // ⭐ 添加新类型
  filePath: string
  fileName: string
  content: string
  mode: 'edit' | 'view'
  isDirty: boolean
  // ...
}
```

**⚠️ 注意**：
- 添加新的panel类型到`type`联合类型
- 保持向后兼容，`type`为可选字段，默认为`markdown`

---

## Phase 3: 组件实现

### 3.1 创建主容器组件

**`GUI/components/ProjectPage.MainPanel/[YourPanel]/[YourPanel]Panel.vue`**

```vue
<template>
  <div class="yourpanel-panel">
    <!-- 工具栏 -->
    <TopBar 
      v-if="showToolbar"
      @action="handleAction"
    />
    
    <!-- 主内容区 -->
    <div class="panel-content">
      <Component1 />
      <Component2 />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useYourPanelStore } from '@stores/projectPage/yourPanel'
import TopBar from './TopBar.vue'
import Component1 from './Component1.vue'
import Component2 from './Component2.vue'

const yourPanelStore = useYourPanelStore()

// 状态
const loading = ref(false)

// 计算属性
const hasData = computed(() => yourPanelStore.data !== null)

// 方法
const handleAction = (action: string) => {
  console.log('[YourPanel] Action:', action)
}

// 生命周期
onMounted(() => {
  console.log('[YourPanel] Component mounted')
})
</script>

<style scoped lang="scss">
.yourpanel-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 16px;
  min-height: 0;
}
</style>
```

### 3.2 创建导出文件

**`GUI/components/ProjectPage.MainPanel/[YourPanel]/index.ts`**

```typescript
/**
 * [YourPanel] 组件导出
 */

export { default as YourPanelPanel } from './YourPanelPanel.vue'
export { default as TopBar } from './TopBar.vue'
export { default as Component1 } from './Component1.vue'
export { default as Component2 } from './Component2.vue'
```

---

## Phase 4: Store集成

### 4.1 创建Store

**`stores/projectPage/[yourPanel]/[yourPanel].store.ts`**

```typescript
/**
 * [YourPanel] Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { YourDataType, YourConfigType } from './[yourPanel].types'

export const useYourPanelStore = defineStore('projectPage-yourPanel', () => {
  // ==================== 状态 ====================
  
  const data = ref<YourDataType | null>(null)
  const config = ref<YourConfigType | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // ==================== 计算属性 ====================
  
  const hasData = computed(() => data.value !== null)
  
  // ==================== 方法 ====================
  
  const loadData = async () => {
    loading.value = true
    try {
      // 加载逻辑
      console.log('[YourPanel Store] Loading data...')
    } catch (err) {
      error.value = `加载失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const reset = () => {
    data.value = null
    config.value = null
    loading.value = false
    error.value = null
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    data,
    config,
    loading,
    error,
    
    // 计算属性
    hasData,
    
    // 方法
    loadData,
    reset
  }
})
```

### 4.2 业务逻辑封装

**`stores/projectPage/[yourPanel]/logic.ts`**

```typescript
/**
 * [YourPanel] 业务逻辑封装
 */

import { YourService } from '@service/yourPanel'
import type { YourDataType } from './[yourPanel].types'
import { ElMessage } from 'element-plus'

export async function processData(
  input: string
): Promise<YourDataType> {
  try {
    const result = await YourService.process(input)
    ElMessage.success('处理成功')
    return result
  } catch (error) {
    ElMessage.error(`处理失败: ${error}`)
    throw error
  }
}
```

### 4.3 创建Store导出

**`stores/projectPage/[yourPanel]/index.ts`**

```typescript
/**
 * [YourPanel] Store导出
 */

export { useYourPanelStore } from './[yourPanel].store'
export * from './[yourPanel].types'
export * from './logic'
```

### 4.4 扩展DataSource（如需文件操作）

**`stores/projectPage/DataSource.ts`**

```typescript
// 在现有DataSource类中添加方法

class ProjectPageDataSource {
  // ... 现有方法
  
  // ==================== [YourPanel] 专用方法 ====================
  
  async loadYourPanelData(path: string): Promise<YourDataType> {
    if (Environment.shouldUseMock()) {
      return yourPanelMockData.defaultData
    }
    // Electron环境：实际文件读取
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined
    // ...
  }
  
  async saveYourPanelData(path: string, data: YourDataType): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] 保存数据:', path)
      return true
    }
    // Electron环境：实际文件写入
    // ...
  }
}
```

---

## Phase 5: 导航栏集成

### 5.1 在markdownStore中添加打开方法

**`stores/projectPage/Markdown/markdown.store.ts`**

```typescript
// 在markdownStore中添加方法

// 打开YourPanel标签页
const openYourPanel = () => {
  // 检查是否已存在
  const existingTab = openTabs.value.find(tab => tab.type === 'yourpanel')
  if (existingTab) {
    activeTabId.value = existingTab.id
    console.log('[Markdown] YourPanel tab already exists, switching to it')
    return existingTab
  }
  
  // 创建新标签页
  const newTab: MarkdownTab = {
    id: `yourpanel-${Date.now()}`,
    type: 'yourpanel',
    filePath: '',
    fileName: 'Your Panel',
    content: '',
    mode: 'edit',
    isDirty: false
  }
  
  openTabs.value.push(newTab)
  activeTabId.value = newTab.id
  
  console.log('[Markdown] YourPanel tab created:', newTab.id)
  return newTab
}

// 在return中导出
return {
  // ...
  openYourPanel,
  // ...
}
```

### 5.2 在PaneContent中注册渲染

**`GUI/components/ProjectPage.MainPanel/PaneSystem/PaneContent.vue`**

```vue
<template>
  <!-- 标签页内容区域 -->
  <div class="tab-content-area">
    <!-- Markdown标签页 -->
    <MarkdownTab
      v-if="localActiveTabId && activeTabType === 'markdown'"
      :tab-id="localActiveTabId"
    />
    
    <!-- DocParser标签页 -->
    <DocParserPanel
      v-else-if="localActiveTabId && activeTabType === 'docparser'"
    />
    
    <!-- ⭐ YourPanel标签页 -->
    <YourPanelPanel
      v-else-if="localActiveTabId && activeTabType === 'yourpanel'"
    />
  </div>
</template>

<script setup lang="ts">
// 导入组件
import { YourPanelPanel } from '@components/ProjectPage.MainPanel/YourPanel'

// activeTabType计算属性会自动根据tab.type判断
</script>
```

### 5.3 在导航栏添加按钮

**`GUI/components/ProjectPage.Shell/Navbar/ProjectNavbar.vue`**

```vue
<template>
  <div class="project-navbar">
    <!-- ... 其他按钮 -->
    
    <!-- ⭐ YourPanel按钮 -->
    <el-tooltip content="Your Panel" placement="right" :show-after="500">
      <button 
        class="nav-icon-btn"
        :class="{ active: currentView === 'yourpanel' }"
        @click="handleClick('yourpanel')"
      >
        <el-icon class="nav-icon"><YourIcon /></el-icon>
      </button>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { YourIcon } from '@element-plus/icons-vue'

const handleClick = async (type: string) => {
  // ...
  
  if (type === 'yourpanel') {
    console.log('[ProjectNavbar] 打开YourPanel标签页')
    currentView.value = 'yourpanel'
    
    // 1. 打开标签页
    const tab = markdownStore.openYourPanel()
    
    if (!tab) {
      console.error('[ProjectNavbar] Failed to create YourPanel tab')
      return
    }
    
    // 2. 🔥 如果没有面板，先创建默认面板
    if (!paneLayoutStore.focusedPane) {
      console.log('[ProjectNavbar] No pane exists, creating default layout')
      paneLayoutStore.resetToDefaultLayout()
    }
    
    // 3. 在焦点面板中显示该tab
    if (paneLayoutStore.focusedPane) {
      paneLayoutStore.openTabInPane(paneLayoutStore.focusedPane.id, tab.id)
      console.log('[ProjectNavbar] Opened YourPanel in focused pane:', {
        paneId: paneLayoutStore.focusedPane.id,
        tabId: tab.id
      })
    } else {
      console.error('[ProjectNavbar] Failed to open YourPanel: no focused pane available')
    }
    
    return
  }
}
</script>
```

---

## Phase 6: 调试检查清单

### 6.1 路径别名检查

```typescript
// ✅ 正确的路径别名（小写）
import { YourService } from '@service/yourPanel'
import { useYourPanelStore } from '@stores/projectPage/yourPanel'
import { YourComponent } from '@components/ProjectPage.MainPanel/YourPanel'

// ❌ 错误的路径别名（大写会报错）
import { YourService } from '@Service/yourPanel'  // 错误！
```

### 6.2 导出检查

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

### 6.3 Pane创建检查

**关键点**：必须先创建Pane，才能显示标签页

```typescript
// ❌ 错误：直接添加tab，但没有Pane
const tab = markdownStore.openYourPanel()
paneLayoutStore.addTabToPane(focusedPaneId, tab.id)  // focusedPaneId可能为null

// ✅ 正确：先检查Pane，没有则创建
const tab = markdownStore.openYourPanel()
if (!paneLayoutStore.focusedPane) {
  paneLayoutStore.resetToDefaultLayout()  // 创建默认Pane
}
paneLayoutStore.openTabInPane(paneLayoutStore.focusedPane.id, tab.id)
```

### 6.4 类型渲染检查

**PaneContent必须根据type渲染对应组件**：

```typescript
// activeTabType计算属性
const activeTabType = computed(() => {
  if (!localActiveTabId.value) return 'markdown'
  const tab = markdownStore.openTabs.find(t => t.id === localActiveTabId.value)
  return tab?.type || 'markdown'
})
```

---

## 常见问题与解决方案

### 问题1：点击按钮后没有反应

**可能原因**：
1. 没有创建Pane（停留在欢迎页）
2. 标签页未添加到Pane中
3. PaneContent没有注册对应类型的渲染

**解决方案**：
```typescript
// 检查日志
console.log('Tab created:', tab)
console.log('Focused pane:', paneLayoutStore.focusedPane)
console.log('Tab added to pane:', paneLayoutStore.getPaneById(paneId))
```

### 问题2：导入路径报500错误

**可能原因**：
1. 路径别名大小写错误（`@Service` vs `@service`）
2. 子模块没有通过`index.ts`导出
3. 循环依赖

**解决方案**：
```typescript
// ✅ 统一从index导出
import { useYourPanelStore, processData } from '@stores/projectPage/yourPanel'

// ❌ 不要直接导入子模块
import { processData } from '@stores/projectPage/yourPanel/logic'
```

### 问题3：组件不显示或白屏

**可能原因**：
1. `activeTabType`判断错误
2. 组件导入路径错误
3. 组件内部报错

**解决方案**：
```typescript
// 检查activeTabType
console.log('Active tab type:', activeTabType.value)

// 检查组件注册
console.log('YourPanelPanel imported:', YourPanelPanel)

// 检查控制台错误
```

### 问题4：Mock数据未生效

**可能原因**：
1. `Environment.shouldUseMock()`判断错误
2. DataSource未正确调用
3. Mock数据格式错误

**解决方案**：
```typescript
// 在DataSource方法中添加日志
if (Environment.shouldUseMock()) {
  console.log('[Mock] Using mock data')
  return yourPanelMockData.defaultData
}
```

---

## 依赖安装

如果Panel需要特殊依赖，在`package.json`中添加：

```json
{
  "dependencies": {
    "your-library": "^1.0.0"
  }
}
```

然后运行：
```bash
npm install
```

---

## 工作流时间估算

| 阶段 | 时间 | 说明 |
|------|------|------|
| Phase 1: 基础架构 | 30分钟 | 创建目录和基础文件 |
| Phase 2: 类型扩展 | 15分钟 | 扩展MarkdownTab类型 |
| Phase 3: 组件实现 | 2-4小时 | 根据复杂度 |
| Phase 4: Store集成 | 1-2小时 | Store + 业务逻辑 |
| Phase 5: 导航集成 | 30分钟 | 导航栏 + PaneContent |
| Phase 6: 调试 | 1-2小时 | 路径、渲染、数据流 |
| **总计** | **5-9小时** | 完整功能的Panel系统 |

---

## 参考实现

- **DocParser系统**：完整实现参考
  - 文件位置：`Client/GUI/components/ProjectPage.MainPanel/DocParser/`
  - Store：`Client/stores/projectPage/docParser/`
  - Service：`Client/Service/docParser/`

---

## 总结

### 核心要点

1. **三层架构**：GUI → Store → Service，职责清晰
2. **类型优先**：先定义类型，后实现逻辑
3. **Mock开发**：使用Mock数据快速开发，Electron层后期补充
4. **统一导出**：每层都有`index.ts`，避免直接导入子模块
5. **Pane系统**：必须先创建Pane，才能显示标签页
6. **路径别名**：使用小写别名（`@service`, `@stores`, `@components`）

### 最佳实践

- ✅ 模块化组件，单一职责
- ✅ 类型定义放在对应层级
- ✅ 业务逻辑与UI分离
- ✅ 使用DataSource抽象文件操作
- ✅ 日志记录关键步骤
- ✅ 错误处理与用户提示

---

**完成日期**：2025-01-12
**基于版本**：Nimbria v0.0.1
**参考案例**：DocParser System

