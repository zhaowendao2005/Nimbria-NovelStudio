# LLM翻译系统任务管理面板 - 删除与新建功能总结
## 2025年10月20日

---

## 📋 目录
1. [架构概述](#架构概述)
2. [数据流链路](#数据流链路)
3. [通道设计](#通道设计)
4. [类型系统](#类型系统)
5. [文件组织](#文件组织)
6. [功能详解](#功能详解)
7. [操作指南](#操作指南)
8. [核心机制](#核心机制)

---

## 架构概述

### 整体架构图
```
┌─────────────────────────────────────────────────────────┐
│          Vue3 GUI (Renderer Process)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  TaskManagePage.vue (UI Layer)                   │   │
│  │  - 批次列表与工具栏                               │   │
│  │  - 任务列表与操作按钮                             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  translate.store.ts (State Management)           │   │
│  │  - Pinia Store (状态管理)                         │   │
│  │  - 事件监听器注册                                  │   │
│  │  - 批次/任务选择状态                              │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  translate.datasource.ts (Data Layer)            │   │
│  │  - IPC 调用封装                                   │   │
│  │  - Mock 数据支持                                  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
             ↕ IPC 双向通信 (contextBridge)
┌─────────────────────────────────────────────────────────┐
│      Electron Main Process (Main Thread)                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │  llm-translate-handlers.ts (IPC Layer)           │   │
│  │  - ipcMain.handle() 处理请求                      │   │
│  │  - 事件广播到所有窗口                             │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  llm-translate-service.ts (Business Logic)       │   │
│  │  - 批次创建/删除逻辑                              │   │
│  │  - 任务删除与级联删除                            │   │
│  │  - EventEmitter 事件驱动                        │   │
│  │  - 统计信息更新                                  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ProjectDatabase (SQLite)                        │   │
│  │  - Llmtranslate_batches                          │   │
│  │  - Llmtranslate_tasks                            │   │
│  │  - Llmtranslate_stats                            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 核心特点
- **事件驱动架构**：基于 EventEmitter，确保多窗口实时同步
- **无后端服务**：所有操作在本地 SQLite 完成，无网络调用
- **IPC 异步通信**：使用 Electron IPC 实现进程间通信
- **类型安全**：严格的 TypeScript 类型规范
- **自动级联**：删除任务时自动清理空批次

---

## 数据流链路

### 删除任务流程

```
UI: 用户选择任务 & 点击"删除"
  ↓
TaskManagePage.vue::deleteSelected()
  ↓
translate.store.ts::deleteSelectedTasks()
  ├→ 验证选择的任务ID
  ├→ 调用 datasource.deleteTasks(taskIds)
  └→ 清空选择状态
      ↓
translate.datasource.ts::deleteTasks()
  ├→ 调用 electronAPI.deleteTasks(taskIds)
  └→ 返回 Promise
      ↓
[IPC Channel] 'llm-translate:delete-tasks'
  ↓
llm-translate-handlers.ts::ipcMain.handle()
  ├→ 验证参数
  ├→ 调用 llmTranslateService.deleteTasks(taskIds, batchId)
  └→ 返回 operationId
      ↓
llm-translate-service.ts::deleteTasks()
  ├→ 生成 operationId
  ├→ 发射 'task:delete-start' 事件
  └→ 异步调用 deleteTasksAsync()
      ↓
llm-translate-service.ts::deleteTasksAsync()
  ├→ 数据库删除任务
  ├→ 检查批次是否为空
  │  ├─ YES → 自动删除批次
  │  │         发射 'batch:deleted' 事件
  │  └─ NO → 更新批次统计
  │         发射 'task:deleted' 事件
  └→ 异常处理发射 'task:delete-error' 事件
      ↓
[IPC Broadcast] 'llm-translate:batch-deleted' 或 'llm-translate:task-deleted'
  ↓
project-preload.ts::onBatchDeleted() 或 onTaskDeleted()
  ↓
translate.store.ts::setupEventListeners()
  ├→ 从批次列表移除
  ├→ 重新加载任务列表
  └→ 检查并自动删除空批次
      ↓
UI 自动更新 (Reactive)
  ├→ 批次列表刷新
  ├→ 任务列表刷新
  └→ 统计信息更新
```

### 删除批次流程

```
UI: 用户启用选择模式 → 全选/勾选批次 → 点击"删除"
  ↓
TaskManagePage.vue::deleteSelectedBatches()
  ├→ 显示确认对话框
  └→ 调用 store.deleteSelectedBatches()
      ↓
translate.store.ts::deleteSelectedBatches()
  ├→ 验证选择的批次ID
  ├→ 并行调用多个 deleteBatch(batchId)
  ├→ 重新加载批次列表
  ├→ 清空选择状态和选择模式
  └→ 显示成功消息
      ↓
translate.datasource.ts::deleteBatch()
  ├→ 调用 electronAPI.deleteBatch(batchId)
  └→ 返回 Promise
      ↓
[IPC Channel] 'llm-translate:delete-batch'
  ↓
llm-translate-handlers.ts::ipcMain.handle()
  ├→ 验证参数
  ├→ 调用 llmTranslateService.deleteBatch(batchId)
  └→ 返回 operationId
      ↓
llm-translate-service.ts::deleteBatch()
  ├→ 生成 operationId
  ├→ 发射 'batch:delete-start' 事件
  └→ 异步调用 deleteBatchAsync()
      ↓
llm-translate-service.ts::deleteBatchAsync()
  ├→ 数据库删除批次及所有任务
  ├→ 删除统计信息
  ├→ 清理内存缓存
  └→ 发射 'batch:deleted' 或 'batch:delete-error' 事件
      ↓
[IPC Broadcast] 'llm-translate:batch-deleted'
  ↓
translate.store.ts::setupEventListeners()
  ├→ 从批次列表移除
  ├→ 清空当前批次
  └→ 清空任务列表
      ↓
UI 自动更新 (Reactive)
  └→ 批次列表刷新
```

---

## 通道设计

### IPC Handler 通道

#### 删除操作通道

| 通道名 | 方向 | 参数 | 返回值 | 说明 |
|-------|------|------|--------|------|
| `llm-translate:delete-batch` | invoke | `{ batchId: string }` | `{ operationId: string }` | 删除单个批次 |
| `llm-translate:delete-tasks` | invoke | `{ taskIds: string[] }` | `{ operationId: string }` | 删除多个任务 |

#### 事件广播通道

| 通道名 | 来源 | 数据 | 说明 |
|-------|------|------|------|
| `llm-translate:batch-delete-start` | Service → Handler → Renderer | `{ batchId: string }` | 批次删除开始 |
| `llm-translate:batch-deleted` | Service → Handler → Renderer | `{ batchId: string; deletedTaskCount: number }` | 批次删除完成 |
| `llm-translate:batch-delete-error` | Service → Handler → Renderer | `{ batchId: string; error: string }` | 批次删除出错 |
| `llm-translate:task-delete-start` | Service → Handler → Renderer | `{ taskIds: string[]; batchId: string }` | 任务删除开始 |
| `llm-translate:task-deleted` | Service → Handler → Renderer | `{ taskIds: string[]; batchId: string; deletedCount: number }` | 任务删除完成 |
| `llm-translate:task-delete-error` | Service → Handler → Renderer | `{ taskIds: string[]; batchId: string; error: string }` | 任务删除出错 |

### 上下文桥接 (contextBridge)

```typescript
// project-preload.ts 暴露的 API
nimbria.llmTranslate = {
  // 删除操作
  deleteBatch: (args: { batchId: string }) => ipcRenderer.invoke(...)
  deleteTasks: (args: { taskIds: string[] }) => ipcRenderer.invoke(...)
  
  // 删除事件监听
  onBatchDeleteStart: (callback) => ipcRenderer.on(...)
  onBatchDeleted: (callback) => ipcRenderer.on(...)
  onBatchDeleteError: (callback) => ipcRenderer.on(...)
  onTaskDeleteStart: (callback) => ipcRenderer.on(...)
  onTaskDeleted: (callback) => ipcRenderer.on(...)
  onTaskDeleteError: (callback) => ipcRenderer.on(...)
}
```

---

## 类型系统

### 后端事件类型（Backend Events）

**文件**: `Nimbria/src-electron/types/LlmTranslate/backend/events.ts`

```typescript
// 批次删除事件
export interface BatchDeleteStartEvent {
  batchId: string
}

export interface BatchDeletedEvent {
  batchId: string
  deletedTaskCount: number
}

export interface BatchDeleteErrorEvent {
  batchId: string
  error: string
}

// 任务删除事件
export interface TaskDeleteStartEvent {
  taskIds: string[]
  batchId: string
}

export interface TaskDeletedEvent {
  taskIds: string[]
  batchId: string
  deletedCount: number
}

export interface TaskDeleteErrorEvent {
  taskIds: string[]
  batchId: string
  error: string
}
```

### API 类型（Frontend-Backend Contract）

**文件**: `Nimbria/Client/GUI/DemoPage/LlmTranslate/types/api.ts`

```typescript
// 删除批次
export interface DeleteBatchRequest {
  batchId: string
}

export interface DeleteBatchResponse {
  operationId: string
}

// 删除任务
export interface DeleteTasksRequest {
  taskIds: string[]
}

export interface DeleteTasksResponse {
  operationId: string
}
```

### Store 类型（Frontend State）

**文件**: `Nimbria/Client/GUI/DemoPage/LlmTranslate/stores/translate.types.ts`

```typescript
// 批次选择相关状态
selectedBatchIds: Set<string>  // 选中的批次ID集合
batchSelectMode: boolean       // 是否启用批次选择模式

// 任务选择相关状态
selectedTaskIds: Set<string>   // 选中的任务ID集合
taskFilters: {
  selectMode: boolean          // 任务是否启用选择模式
  ...
}
```

---

## 文件组织

### 后端服务层 (Electron Main)

```
src-electron/
├── types/LlmTranslate/
│   ├── backend/
│   │   └── events.ts              ← 后端事件类型定义
│   └── client/
│       ├── batch.ts               ← 批次类型
│       ├── task.ts                ← 任务类型
│       └── ...
├── services/llm-translate-service/
│   ├── llm-translate-service.ts   ← 核心业务逻辑
│   │   ├── deleteBatch()          ← 批次删除入口
│   │   ├── deleteBatchAsync()     ← 异步批次删除
│   │   ├── deleteTasks()          ← 任务删除入口
│   │   └── deleteTasksAsync()     ← 异步任务删除 (含自动清理)
│   └── ...
├── ipc/main-renderer/
│   └── llm-translate-handlers.ts   ← IPC处理器
│       ├── ipcMain.handle('llm-translate:delete-batch', ...)
│       ├── ipcMain.handle('llm-translate:delete-tasks', ...)
│       ├── service.on('batch:deleted', ...)
│       └── service.on('task:deleted', ...)
└── core/
    └── project-preload.ts         ← contextBridge API暴露
        └── nimbria.llmTranslate.{deleteBatch, deleteTasks, on*}
```

### 前端应用层 (Vue3 GUI)

```
Client/GUI/DemoPage/LlmTranslate/
├── components/
│   └── TaskManagePage.vue         ← UI 组件
│       ├── sidebar (批次列表)
│       │   ├── batch-toolbar      ← 批次管理工具栏
│       │   └── batch-list         ← 批次项列表
│       ├── main-content           ← 任务内容区
│       │   ├── task-toolbar       ← 任务操作工具栏
│       │   └── task-list          ← 任务卡片列表
│       └── scripts
│           ├── handleBatchClick()
│           ├── selectAllBatches()
│           └── deleteSelectedBatches()
├── stores/
│   └── translate.store.ts         ← Pinia Store
│       ├── State: selectedBatchIds, batchSelectMode
│       ├── Methods: toggleBatchSelection()
│       │           selectAllBatches()
│       │           deleteSelectedBatches()
│       ├── Events: setupEventListeners()
│       │         onBatchDeleted()
│       │         onTaskDeleted()
│       └── Auto-cleanup: checkAndDeleteEmptyBatch()
├── types/
│   ├── api.ts                     ← API 类型
│   ├── batch.ts                   ← 批次类型
│   ├── task.ts                    ← 任务类型
│   └── ...
└── datasource/
    └── translate.datasource.ts    ← 数据源封装
        ├── deleteBatch()
        └── deleteTasks()
```

### 样式组织

**文件**: `TaskManagePage.vue` 中的 `<style scoped lang="scss">`

```scss
.sidebar-header
  ├── .header-content        // 标题内容
  └── .batch-toolbar         // 工具栏容器
      ├── .batch-tool-item   // 工具按钮
      │   ├── &:hover        // 悬停样式
      │   ├── &--active      // 激活样式 (选择模式启用时)
      │   └── &--danger      // 危险按钮 (删除)
      └── .el-icon           // Element Plus 图标

.batch-item
  ├── &.active              // 当前批次样式
  ├── &.selected            // 选中批次样式
  ├── .batch-checkbox       // 复选框容器
  └── .batch-info           // 批次信息容器
      ├── .batch-id
      ├── .batch-status
      └── .batch-stats
```

---

## 功能详解

### 1. 批次管理工具栏

#### UI 组件 (TaskManagePage.vue)

```vue
<!-- 批次列表标题栏 + 工具栏 -->
<div class="sidebar-header">
  <div class="header-content">
    <el-icon><Collection /></el-icon> 
    <span>批次列表</span>
  </div>
  
  <!-- 批次管理工具栏 -->
  <div class="batch-toolbar">
    <!-- 切换选择模式 -->
    <div class="batch-tool-item" 
         :class="{ 'batch-tool-item--active': store.batchSelectMode }"
         @click="store.batchSelectMode = !store.batchSelectMode">
      <el-icon><Check /></el-icon>
    </div>

    <!-- 全选批次 (仅在选择模式下显示) -->
    <div v-show="store.batchSelectMode"
         class="batch-tool-item" 
         @click="selectAllBatches">
      <el-icon><Select /></el-icon>
    </div>

    <!-- 删除选中批次 (仅选择模式 & 有选中时显示) -->
    <div v-show="store.batchSelectMode && store.selectedBatchIds.size > 0"
         class="batch-tool-item batch-tool-item--danger" 
         @click="deleteSelectedBatches">
      <el-icon><Delete /></el-icon>
    </div>
  </div>
</div>
```

#### 功能说明

| 按钮 | 图标 | 行为 | 效果 |
|-----|------|------|------|
| 启用/取消选择 | Check ✓ | 切换 `batchSelectMode` | 显示/隐藏复选框和全选按钮 |
| 全选批次 | Select ⊟ | 调用 `selectAllBatches()` | 选中所有批次 |
| 删除批次 | Delete 🗑 | 调用 `deleteSelectedBatches()` | 删除所有选中批次 |

### 2. 任务选择与删除

#### 任务选择模式

```typescript
// Store 中的任务选择逻辑
const taskFilters = ref<TaskFilter>({
  status: ['queued', 'waiting', 'throttled', 'error', 'unsent'],
  searchText: '',
  selectMode: false  // 切换选择模式
})

const selectedTaskIds = ref<Set<string>>(new Set())

// 切换任务选择
const toggleTaskSelection = (taskId: string) => {
  if (selectedTaskIds.value.has(taskId)) {
    selectedTaskIds.value.delete(taskId)
  } else {
    selectedTaskIds.value.add(taskId)
  }
}

// 删除选中任务
const deleteSelectedTasks = async () => {
  await datasource.deleteTasks(Array.from(selectedTaskIds.value))
  selectedTaskIds.value.clear()
  // 重新加载任务列表...
}
```

### 3. 自动级联删除机制

#### 空批次自动删除

当删除任务时，系统会自动检查批次是否仍有剩余任务：

```typescript
// llm-translate-service.ts 中的 deleteTasksAsync()
private async deleteTasksAsync(taskIds: string[], batchId: string): Promise<void> {
  // 1. 删除任务
  db.execute(`DELETE FROM Llmtranslate_tasks WHERE id IN (...)`, taskIds)

  // 2. 检查批次是否为空
  const remainingTasks = db.queryOne(
    `SELECT COUNT(*) as count FROM Llmtranslate_tasks WHERE batch_id = ?`,
    [batchId]
  )

  // 3. 如果为空，自动删除批次
  if (remainingTasks.count === 0) {
    db.execute(`DELETE FROM Llmtranslate_batches WHERE id = ?`, [batchId])
    db.execute(`DELETE FROM Llmtranslate_stats WHERE batch_id = ?`, [batchId])
    this.activeBatches.delete(batchId)
    
    // 发射批次删除事件
    this.emit('batch:deleted', { 
      batchId, 
      deletedTaskCount: taskIds.length 
    })
  }
}
```

#### 数据库级联规则

```sql
-- 表结构中的外键约束
CREATE TABLE Llmtranslate_tasks (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  FOREIGN KEY (batch_id) REFERENCES Llmtranslate_batches(id)
    ON DELETE CASCADE
)
```

---

## 操作指南

### 删除单个/多个任务

#### 第一步：启用任务选择模式
1. 在任务列表上方找到工具栏
2. 点击 **Check ✓** 图标启用选择模式
3. 任务卡片左侧会出现 **复选框**

#### 第二步：选择任务
- **单个选择**：点击任务卡片左侧的复选框
- **全选**：点击工具栏的 **Select ⊟** 图标
- **反选**：再次点击已选择的复选框

#### 第三步：删除任务
1. 点击工具栏的 **Delete 🗑** 图标
2. 系统会自动检查任务所属批次
3. 如果批次无剩余任务，**该批次会自动删除**

#### 第四步：关闭选择模式
- 点击 **Check ✓** 图标取消选择模式
- 所有选择状态会被保留（可再次切换回来）

### 删除单个/多个批次

#### 第一步：启用批次选择模式
1. 在批次列表标题栏找到工具栏
2. 点击 **Check ✓** 图标启用选择模式
3. 批次项左侧会出现 **复选框**

#### 第二步：选择批次
- **单个选择**：点击批次项左侧的复选框
- **全选**：点击工具栏的 **Select ⊟** 图标选中所有批次
- **反选**：再次点击已选择的复选框

#### 第三步：删除批次
1. 点击工具栏的 **Delete 🗑** 图标
2. 会弹出 **确认对话框**：
   ```
   "确定要删除选中的 X 个批次吗？这将同时删除所有相关任务。"
   ```
3. 点击 **确定删除** 确认
4. 系统会 **并行删除** 所有选中批次
5. 批次列表会自动刷新

#### 第四步：关闭选择模式
- 删除完成后，选择模式会自动关闭
- 选择状态会被清空

### 常见场景

#### 场景 1：清空整个批次
1. 在任务列表中启用选择模式
2. 点击 "全选" 选中所有任务
3. 点击 "Delete 🗑" 删除所有任务
4. **自动删除空批次**
5. 批次从左侧列表消失

#### 场景 2：删除失败的批次及其所有任务
1. 在批次列表中启用选择模式
2. 找到失败的批次，点击其复选框选中
3. 点击工具栏 "Delete 🗑"
4. 确认删除
5. 该批次及所有任务会被删除

#### 场景 3：批量删除多个完成的批次
1. 在批次列表中启用选择模式
2. 点击 "全选" 选中所有批次
3. **或手动逐个勾选**
4. 点击工具栏 "Delete 🗑"
5. 确认删除
6. 所有选中批次会并行删除

---

## 核心机制

### 1. 事件驱动架构

#### EventEmitter 工作流

```typescript
// 后端服务发射事件
class LlmTranslateService extends EventEmitter {
  deleteTasks(taskIds) {
    // 1. 发射开始事件
    this.emit('task:delete-start', { taskIds, batchId })
    
    // 2. 异步处理
    this.deleteTasksAsync(taskIds, batchId)
  }
  
  private async deleteTasksAsync() {
    try {
      // ... 数据库操作 ...
      
      // 3. 发射完成事件
      this.emit('task:deleted', { taskIds, batchId, deletedCount })
    } catch (error) {
      // 4. 发射错误事件
      this.emit('task:delete-error', { taskIds, batchId, error })
    }
  }
}
```

#### IPC 广播

```typescript
// IPC 处理器监听服务事件
service.on('task:deleted', (data) => {
  // 广播给所有窗口
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('llm-translate:task-deleted', data)
  })
})
```

#### 前端响应

```typescript
// Store 监听 IPC 事件
const setupEventListeners = () => {
  electronAPI.value.onTaskDeleted((data) => {
    // 从列表中移除任务
    taskList.value = taskList.value.filter(
      t => !data.taskIds.includes(t.id)
    )
    // 检查并自动删除空批次
    checkAndDeleteEmptyBatch(data.batchId)
  })
}
```

### 2. 批次自动清理机制

#### 检测与清理流程

```typescript
// 检查并自动删除空批次
const checkAndDeleteEmptyBatch = async (batchId: string) => {
  const batch = batchList.value.find(b => b.id === batchId)
  
  if (batch && batch.totalTasks === 0) {
    // 后端会自动删除，前端也需要清理 UI
    batchList.value = batchList.value.filter(b => b.id !== batchId)
    
    if (currentBatch.value?.id === batchId) {
      currentBatch.value = null
      taskList.value = []
    }
  }
}
```

#### 层级关系

```
批次表 (Llmtranslate_batches)
  ↓ 1:N
任务表 (Llmtranslate_tasks)
  
统计表 (Llmtranslate_stats)
  ↓ FK
批次表 (Llmtranslate_batches)

删除流程：
1. DELETE tasks WHERE batch_id = X  (自动由 ON DELETE CASCADE)
2. DELETE batches WHERE id = X       (手动检查后执行)
3. DELETE stats WHERE batch_id = X   (手动清理)
```

### 3. 状态同步机制

#### Pinia 响应式状态

```typescript
// Vue3 响应式引用
const selectedBatchIds = ref<Set<string>>(new Set())
const batchSelectMode = ref(false)
const selectedTaskIds = ref<Set<string>>(new Set())

// 侦听器自动更新 UI
watch(() => store.batchSelectMode, (newVal) => {
  // UI 自动显示/隐藏复选框
})

watch(() => store.selectedBatchIds.size, (newSize) => {
  // UI 自动显示/隐藏删除按钮
})
```

#### 多窗口同步

```
Window A 删除任务
  ↓
IPC 调用 (Main Process)
  ↓
Service 处理 & 发射事件
  ↓
IPC 广播给 WINDOW A 和 WINDOW B
  ↓
Window A Store 更新 ✓
Window B Store 更新 ✓
  ↓
两个窗口 UI 同时刷新
```

---

## 错误处理

### 常见错误与解决

| 错误 | 原因 | 解决方案 |
|-----|------|--------|
| `electronAPI.deleteTasks is not a function` | contextBridge 未正确暴露 | 检查 project-preload.ts 中的 API 定义 |
| `Cannot read property 'on' of undefined` | electronAPI 对象不存在 | 确保在 setupEventListeners() 前初始化 |
| 任务删除后批次未删除 | 自动清理机制未触发 | 检查批次统计是否正确更新 |
| 多窗口不同步 | IPC 广播失败 | 查看浏览器控制台的 IPC 消息 |

---

## 总结

### 关键特性
✅ **事件驱动**：实时反馈，多窗口同步  
✅ **自动级联**：删除任务自动清理空批次  
✅ **类型安全**：严格的 TypeScript 类型规范  
✅ **模态清晰**：明确的删除确认流程  
✅ **无后端**：所有操作本地完成，效率高  

### 代码行数统计

| 模块 | 文件 | 代码行数 | 说明 |
|-----|------|---------|------|
| Backend Events | events.ts | 138 | 事件类型定义 |
| Backend Service | llm-translate-service.ts | 634 | 核心业务逻辑 |
| IPC Handler | llm-translate-handlers.ts | 402 | IPC 处理与广播 |
| Frontend Store | translate.store.ts | 546 | 状态管理与事件监听 |
| Frontend Component | TaskManagePage.vue | 845 | UI 组件与交互 |
| **总计** | | **2,565** | |

---

**文档更新时间**: 2025年10月20日 23:59:59  
**版本**: v1.0  
**状态**: ✅ 已完成
```
