好的Boss！我现在基于JiuZhang的完整交互流程，结合你的新需求，制定一个详细的Design方案。

## 📋 Nimbria LLM配置系统重构设计方案

> **目标**：完全遵循JiuZhang的交互流程，适配Nimbria现有架构  
> **原则**：流程不变，UI可调整，优先保证流程完整性

---

## 🎯 核心变更需求

### 1. 模型选择交互改进

**当前问题**：
- 模型显示为纯展示的chip标签
- 无法直接选择活动模型
- 缺少右键菜单功能

**目标设计**：

```
每个模型chip变为可交互元素：
┌─────────────────────────────────────┐
│ LLM (5个)                           │
│ ┌─────────────────────┐  ┌──────┐  │
│ │ ☑️ gpt-3.5-turbo    │  │ [+] │  │ ← 手动添加按钮
│ │ [📝自定义]          │  └──────┘  │
│ └─────────────────────┘            │
│ ┌─────────────────────┐            │
│ │ ☐ gpt-4             │            │
│ └─────────────────────┘            │
│ ...                                │
└─────────────────────────────────────┘

交互行为：
✅ 左键点击chip → 切换选中状态（复选框）
✅ 右键点击chip → 弹出上下文菜单
   - 删除模型
   - 重命名（修改displayName）
   - 配置参数（打开ModelConfigModal）
✅ 点击[+]按钮 → 打开AddModelModal
```

---

## 📐 完整架构设计

### 架构层级图

```
┌───────────────────────────────────────────────────┐
│            SettingsDialog.vue (根容器)             │
│  ┌─────────────┐  ┌──────────────────────────┐   │
│  │ 左侧菜单     │  │ Settings.LlmConfig.vue  │   │
│  │ - 缓存管理   │  │  (主容器 - 照搬Jiuzhang) │   │
│  │ - LLM配置 ◀─┼──┤                          │   │
│  │ - AI配置     │  │  ┌────────────────────┐ │   │
│  │ - 主题配置   │  │  │ 活动模型标签区     │ │   │
│  └─────────────┘  │  └────────────────────┘ │   │
│                   │  ┌────────────────────┐ │   │
│                   │  │ Tab导航            │ │   │
│                   │  │ [提供商列表][活动] │ │   │
│                   │  └────────────────────┘ │   │
│                   │  ┌────────────────────┐ │   │
│                   │  │ ProviderCard列表   │ │   │
│                   │  └────────────────────┘ │   │
│                   └──────────────────────────┘   │
└───────────────────────────────────────────────────┘
           ↓
┌───────────────────────────────────────────────────┐
│ Settings.LlmConfig.ProviderCard.vue               │
│  (提供商卡片 - 增强交互)                          │
│                                                   │
│  ┌─────────────────────────────────────────┐    │
│  │ Header: Logo + Name + [⚙️🔄⚡]           │    │
│  ├─────────────────────────────────────────┤    │
│  │ q-expansion-item: "显示模型 (15个)"      │    │
│  │  ┌───────────────────────────────────┐  │    │
│  │  │ LLM (5个)              [+ 添加]    │  │    │
│  │  │ ☑️ gpt-3.5-turbo [📝]  (可右键)    │  │    │
│  │  │ ☐ gpt-4               (可右键)    │  │    │
│  │  └───────────────────────────────────┘  │    │
│  └─────────────────────────────────────────┘    │
└───────────────────────────────────────────────────┘
           ↓
┌───────────────────────────────────────────────────┐
│ 对话框组件群                                       │
│                                                   │
│ 1. Settings.LlmConfig.AddProviderModal.vue       │
│    (三步stepper - 完全照搬Jiuzhang)               │
│    - 步骤1: 基本信息                              │
│    - 步骤2: 默认配置                              │
│    - 步骤3: 测试连接 + 自动发现模型               │
│                                                   │
│ 2. Settings.LlmConfig.ProviderConfigModal.vue    │
│    (三Tab配置 - 完全照搬Jiuzhang)                 │
│    - Tab1: 基本设置                               │
│    - Tab2: 默认配置                               │
│    - Tab3: 高级设置（刷新/删除）                  │
│                                                   │
│ 3. Settings.LlmConfig.ModelConfigModal.vue       │
│    (单模型配置 - 完全照搬Jiuzhang)                │
│    - 模型信息 + 推荐配置                          │
│    - 参数配置 + 继承显示                          │
│                                                   │
│ 4. Settings.LlmConfig.AddModelModal.vue (新增)   │
│    手动添加单个模型到提供商                        │
│    - 模型名称                                     │
│    - 模型类型选择                                 │
│    - 初始配置                                     │
│                                                   │
│ 5. Settings.LlmConfig.ModelContextMenu.vue (新增)│
│    右键菜单                                       │
│    - 删除模型                                     │
│    - 重命名                                       │
│    - 配置参数                                     │
└───────────────────────────────────────────────────┘
```

---

## 🔄 核心交互流程设计

### 流程1: 添加提供商（三步流程 - 完全照搬）

```
用户点击"安装更多模型提供商"
    ↓
打开 AddProviderModal
    ↓
┌────────────────────────────────────┐
│ 步骤1: 基本信息                     │
│ - 显示名称 *                        │
│ - 内部名称 *                        │
│ - 描述                              │
│ - API地址 * (含帮助按钮)            │
│ - API密钥 * (含显示按钮)            │
│                                    │
│ [下一步] (禁用直到必填项完成)       │
└────────────────────────────────────┘
    ↓ 验证通过
┌────────────────────────────────────┐
│ 步骤2: 默认配置                     │
│ - 请求超时(ms)                      │
│ - 最大重试次数                      │
│ - 上下文长度                        │
│ - 最大Token                         │
│ - 完成模式                          │
│ - Agent思考/函数调用/结构化输出     │
│ - 系统提示分隔符                    │
│                                    │
│ [← 上一步] [下一步 →]              │
└────────────────────────────────────┘
    ↓
┌────────────────────────────────────┐
│ 步骤3: 连接测试                     │
│                                    │
│ 未测试状态:                         │
│   📡 点击下方按钮开始测试            │
│                                    │
│ 测试中:                             │
│   ⏳ 正在测试连接...                │
│   状态: "验证配置..."               │
│         "测试连接..."               │
│         "获取模型列表..."           │
│                                    │
│ 成功状态:                           │
│   ✅ 连接测试成功                   │
│   延迟: 120ms | 发现: 15个模型      │
│   ┌──────────────────────────┐    │
│   │ • gpt-3.5-turbo          │    │
│   │ • gpt-4                  │    │
│   │ • ... (显示前5个)         │    │
│   │ 还有10个模型...           │    │
│   └──────────────────────────┘    │
│                                    │
│ 失败状态:                           │
│   ❌ 连接测试失败                   │
│   错误: 无法连接到API端点           │
│                                    │
│ [← 上一步] [测试连接] [✅完成]     │
└────────────────────────────────────┘
    ↓
保存提供商
    ├─→ 调用 settingsStore.addProvider()
    │   ↓
    │   DataSource.addProvider()
    │   ↓
    │   (目前返回mock数据，TODO: IPC调用)
    │
    └─→ 更新 providers 列表
        ↓
        关闭对话框
        ↓
        显示通知: "提供商添加成功"
```

### 流程2: 模型选择与管理（新增增强）

```
ProviderCard 展开模型列表
    ↓
┌─────────────────────────────────────┐
│ LLM (5个)                  [+ 添加] │
│ ┌─────────────────────────────────┐ │
│ │ ☑️ gpt-3.5-turbo [📝自定义]     │ │ ← 左键点击切换选中
│ └─────────────────────────────────┘ │   右键打开菜单
│ ┌─────────────────────────────────┐ │
│ │ ☐ gpt-4                         │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

左键点击模型chip:
    ↓
toggleModelSelection(modelType, modelName, checked)
    ↓
if (checked):
    // 设为活动模型
    settingsStore.setActiveModel(modelType, providerId, modelName)
        ↓
    DataSource.setActiveModel()
        ↓
    activeModels[modelType] = 'providerId.modelName'
        ↓
    UI更新: 
        - chip变为选中状态（☑️）
        - 顶部活动模型标签更新
else:
    // 取消活动
    settingsStore.clearActiveModel(modelType)
        ↓
    delete activeModels[modelType]

右键点击模型chip:
    ↓
显示 ModelContextMenu 在鼠标位置
    ↓
┌─────────────────────┐
│ 🗑️ 删除模型         │ → confirmDeleteModel()
│ ✏️ 重命名           │ → showRenameDialog()
│ ⚙️ 配置参数         │ → openModelConfigModal()
└─────────────────────┘

点击 [+ 添加] 按钮:
    ↓
打开 AddModelModal
    ↓
┌────────────────────────────────────┐
│ 手动添加模型                        │
│                                    │
│ 模型名称 *: [              ]       │
│ 显示名称:   [              ]       │
│ 模型类型 *: [LLM ▼]                │
│                                    │
│ 初始配置:                           │
│ - 上下文长度: [4096]               │
│ - 最大Token:  [4096]               │
│ - 完成模式:   [对话▼]              │
│ ...                                │
│                                    │
│            [取消] [添加]           │
└────────────────────────────────────┘
    ↓
保存到 provider.supportedModels
```

### 流程3: 提供商配置（三Tab - 完全照搬）

```
点击 ProviderCard 的 ⚙️ 按钮
    ↓
打开 ProviderConfigModal
    ↓
┌────────────────────────────────────┐
│ [基本设置] [默认配置] [高级设置]    │
├────────────────────────────────────┤
│                                    │
│ Tab1: 基本设置                      │
│   - 显示名称 *                      │
│   - 内部名称 * (只读)               │
│   - 描述                            │
│   - API地址 * + 帮助按钮            │
│   - API密钥 * + 显示按钮            │
│   - [测试连接] 按钮                 │
│                                    │
│ Tab2: 默认配置                      │
│   (完整的默认配置表单)              │
│   - 超时、重试、上下文长度等        │
│   - [🔄重置为推荐值] 按钮          │
│                                    │
│ Tab3: 高级设置                      │
│   - [刷新模型列表] + 上次刷新时间   │
│   - 提供商状态下拉框                │
│   - 自动刷新开关                    │
│   - [🗑️ 删除提供商] (危险按钮)    │
│                                    │
│            [取消] [保存]           │
└────────────────────────────────────┘
```

### 流程4: 单模型配置（完全照搬）

```
右键菜单点击"配置参数" 或 
ProviderCard中点击模型的⚙️按钮
    ↓
打开 ModelConfigModal
    ↓
┌────────────────────────────────────┐
│ 📦 模型信息         [已自定义]     │
│   提供商: OpenAI                   │
│   模型: gpt-3.5-turbo              │
│   推荐配置置信度: 85% ████████▒▒   │
│                                    │
│ ⚙️ 模型参数                        │
│   [🔄重置为默认] [✨应用推荐]      │
│   上下文长度: [4096] 📝            │
│   最大Token:  [2048] 📝            │
│   完成模式:   [对话▼]              │
│   ...                              │
│                                    │
│ 📋 默认配置继承 [显示▼]            │
│   (折叠展开显示继承关系)            │
│                                    │
│ 🧠 智能推荐 [置信度 85%]           │
│   ▶ 推荐依据                       │
│   (展开显示推荐理由)                │
│                                    │
│            [取消] [保存]           │
└────────────────────────────────────┘
    ↓
保存时只保存与默认配置的差异
```

---

## 📦 组件清单与职责

### 主容器层

**Settings.LlmConfig.vue**
- 职责：主容器，管理Tab切换
- 包含：
  - 顶部工具栏（刷新全部、导入导出）
  - Tab导航：[提供商列表] [活动模型]
  - 活动模型标签区（chip展示）
  - 底部"安装更多"按钮
- 状态管理：
  - 当前激活Tab
  - 各种对话框显示状态
  - 选中的provider/model

### 列表展示层

**Settings.LlmConfig.ProviderList.vue**
- 职责：按状态分组显示提供商
- 分组：active → available → inactive
- 使用ProviderCard渲染每个提供商

**Settings.LlmConfig.ProviderCard.vue** ⭐重点修改
- 职责：单个提供商的完整展示
- Header部分：
  - Logo + 名称 + 描述
  - 状态chip + 模型数 + 刷新时间
  - 操作按钮：⚙️配置 🔄刷新 ⚡激活开关
- Expansion部分：
  - 按类型分组的模型列表
  - **每个模型chip可点击（复选）**
  - **每个模型chip可右键（菜单）**
  - **每组最后一个[+]按钮**

**Settings.LlmConfig.ActiveModels.vue**
- 职责：活动模型管理页面
- 按模型类型显示下拉框
- 可切换每个类型的活动模型

### 对话框层

**Settings.LlmConfig.AddProviderModal.vue** ⭐核心
- q-stepper 三步流程
- 步骤1: 基本信息表单
- 步骤2: 默认配置表单
- 步骤3: 连接测试界面
  - 测试按钮
  - 测试状态显示
  - 发现模型列表
- 完整的验证逻辑
- 完整的错误处理

**Settings.LlmConfig.ProviderConfigModal.vue**
- q-tabs 三Tab配置
- Tab1: 基本设置（含测试连接）
- Tab2: 默认配置
- Tab3: 高级设置（刷新、删除）

**Settings.LlmConfig.ModelConfigModal.vue**
- 模型信息展示
- 配置继承可视化
- 智能推荐系统
- 字段级覆盖标识

**Settings.LlmConfig.AddModelModal.vue** 🆕新增
- 简单表单：模型名称、类型、初始配置
- 添加到指定提供商的supportedModels

**Settings.LlmConfig.ModelContextMenu.vue** 🆕新增
- 右键菜单组件
- 选项：删除、重命名、配置
- 使用q-menu实现

---

## 🔧 Store设计（已完成，需调整）

### settings.llm.store.ts 调整点

**新增状态：**
```typescript
// 模型重命名映射（displayName覆盖）
const modelDisplayNames = ref<Record<string, string>>({
  'openai.gpt-3.5-turbo': 'GPT-3.5涡轮版'
})
```

**新增方法：**
```typescript
// 设置模型显示名
async function setModelDisplayName(
  providerId: string, 
  modelName: string, 
  displayName: string
): Promise<boolean>

// 删除单个模型
async function removeModelFromProvider(
  providerId: string,
  modelType: string,
  modelName: string
): Promise<boolean>

// 添加单个模型
async function addModelToProvider(
  providerId: string,
  modelType: string,
  modelDetail: ModelDetail
): Promise<boolean>
```

---

## 📊 DataSource.ts 扩展

### 需要实现的新方法

```typescript
// 设置模型显示名（TODO: IPC）
export async function setModelDisplayName(
  providerId: string,
  modelName: string,
  displayName: string
): Promise<boolean> {
  // TODO: 调用IPC
  // 目前mock返回true
  return true
}

// 删除模型（TODO: IPC）
export async function removeModel(
  providerId: string,
  modelType: string,
  modelName: string
): Promise<boolean> {
  // TODO: 调用IPC
  return true
}

// 添加模型（TODO: IPC）
export async function addModel(
  providerId: string,
  modelType: string,
  modelDetail: ModelDetail
): Promise<boolean> {
  // TODO: 调用IPC
  return true
}
```

---

## 🎨 UI细节设计

### 模型chip样式（选中与未选中）

```scss
.model-chip {
  cursor: pointer;
  transition: all 0.2s ease;
  
  // 未选中状态
  &.unselected {
    background: white;
    border: 1px solid #e0e0e0;
    color: #666;
    
    &:hover {
      border-color: #1976d2;
      background: #f5f5f5;
    }
  }
  
  // 选中状态（活动模型）
  &.selected {
    background: #e3f2fd;
    border: 2px solid #1976d2;
    color: #1976d2;
    font-weight: 500;
    
    &::before {
      content: '✓ ';
      font-weight: bold;
    }
  }
  
  // 自定义配置标识
  .custom-badge {
    margin-left: 4px;
    color: #ff9800;
  }
}
```

### 右键菜单样式

```vue
<q-menu 
  touch-position 
  context-menu
  transition-show="jump-down"
  transition-hide="jump-up"
>
  <q-list dense style="min-width: 150px">
    <q-item clickable v-close-popup>
      <q-item-section avatar>
        <q-icon name="delete" color="negative" />
      </q-item-section>
      <q-item-section>删除模型</q-item-section>
    </q-item>
    
    <q-item clickable v-close-popup>
      <q-item-section avatar>
        <q-icon name="edit" color="primary" />
      </q-item-section>
      <q-item-section>重命名</q-item-section>
    </q-item>
    
    <q-separator />
    
    <q-item clickable v-close-popup>
      <q-item-section avatar>
        <q-icon name="settings" color="orange" />
      </q-item-section>
      <q-item-section>配置参数</q-item-section>
    </q-item>
  </q-list>
</q-menu>
```

---

## ⚠️ Mock数据策略

**原则：优先保证流程完整，表单不做校验**

```typescript
// llm.mock.ts 扩展
export const mockValidationResult = {
  isValid: true,  // 总是返回true
  errors: [],
  warnings: []
}

export const mockTestConnectionResult = {
  success: true,
  latency: 120,
  error: null
}

export const mockDiscoveredModels = [
  // 模拟发现的模型列表
  { name: 'gpt-3.5-turbo', contextLength: 4096, maxTokens: 4096 },
  { name: 'gpt-4', contextLength: 8192, maxTokens: 8192 },
  // ...
]
```

---

## 📝 实施优先级

### P0 - 核心流程（必须完成）
1. ✅ AddProviderModal三步流程
2. ✅ ProviderCard模型列表复选交互
3. ✅ 活动模型设置/取消
4. ✅ ModelConfigModal（单模型配置）
5. ✅ ProviderConfigModal（提供商配置）

### P1 - 增强交互（重要）
6. ✅ 右键菜单
7. ✅ 模型重命名功能
8. ✅ 手动添加模型（AddModelModal）
9. ✅ 模型删除功能

### P2 - 优化完善（可选）
10. 智能推荐系统
11. 配置继承可视化优化
12. 批量操作
13. 搜索过滤

---

## 🔄 数据流图（完整）

```
用户操作
    ↓
Vue组件（Settings.LlmConfig.*.vue）
    ↓
Pinia Store（settings.llm.store.ts）
    ├─→ 状态更新（providers, activeModels）
    └─→ 调用DataSource方法
           ↓
DataSource.ts
    ├─→ 目前：返回mock数据
    └─→ TODO：调用IPC
           ↓
       (未来) Electron Main Process
           ↓
       (未来) 配置文件读写
```

---

## ✅ 验收标准

### 功能完整性
- [ ] 可以添加提供商（三步流程完整）
- [ ] 可以测试连接并自动发现模型
- [ ] 可以点击模型chip设置/取消活动模型
- [ ] 可以右键模型chip打开菜单
- [ ] 可以删除模型
- [ ] 可以重命名模型显示名
- [ ] 可以配置单个模型参数
- [ ] 可以配置提供商（三Tab完整）
- [ ] 可以刷新模型列表
- [ ] 可以删除提供商
- [ ] 可以手动添加单个模型
- [ ] 活动模型标签正确显示
- [ ] 按状态分组正确显示

### 交互流畅性
- [ ] 所有loading状态正确显示
- [ ] 所有错误提示正确显示
- [ ] 所有成功通知正确显示
- [ ] 对话框打开/关闭动画流畅
- [ ] 右键菜单位置正确

### Mock数据完整性
- [ ] 所有表单不做校验（直接通过）
- [ ] 测试连接总是返回成功+模型列表
- [ ] 所有操作总是返回成功

---
