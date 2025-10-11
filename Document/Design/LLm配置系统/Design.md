好的Boss！我现在基于JiuZhang的完整交互流程，结合你的新需求，制定一个详细的Design方案。

## 📋 Nimbria LLM配置系统重构设计方案

> **目标**：完全遵循JiuZhang的交互流程，适配Nimbria现有架构  
> **原则**：流程不变，UI可调整，优先保证流程完整性

---

## 🎯 核心变更需求

### 【重要】UI保持原则

**⚠️ 核心原则：保持现有UI布局不变**
- ✅ 保持现有ProviderCard的布局结构
- ✅ 保持现有model-chip的样式和排列
- ✅ 保持现有expansion-item的展开/收起逻辑
- ❌ 不改变任何现有组件的布局结构
- ❌ 不添加新的视觉元素改变外观
- ✅ 只在现有元素上添加交互事件监听

### 1. 模型选择交互改进（不改UI，只加交互）

**当前状态**：
- 模型显示为纯展示的chip标签（外观保持）
- 无法直接选择活动模型
- 缺少右键菜单功能

**目标设计（保持现有UI，只增强交互）**：

```
现有UI布局（不改动）：
┌─────────────────────────────────────┐
│ LLM (5个)                           │
│ ┌─────────────────────┐            │
│ │ gpt-3.5-turbo       │            │ ← 保持现有chip样式
│ └─────────────────────┘            │
│ ┌─────────────────────┐            │
│ │ gpt-4               │            │
│ └─────────────────────┘            │
│ ...                                │
└─────────────────────────────────────┘

新增交互行为（不改变外观）：
✅ 左键点击chip → 切换选中状态
   - 选中时：chip添加selected类（背景色、边框加粗）
   - 未选中时：保持原样式
   
✅ 右键点击chip → 弹出q-menu上下文菜单
   - 删除模型
   - 重命名（修改displayName）
   - 配置参数（打开ModelConfigModal）
   
✅ 模型类型组最后添加 [+] chip
   - 样式：虚线边框的chip
   - 点击：打开AddModelModal
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

### 流程2: 模型选择与管理（保持UI，增强交互）

```
ProviderCard 展开模型列表（保持现有布局）
    ↓
┌─────────────────────────────────────┐
│ LLM (5个)                           │
│ ┌─────────────────────────────────┐ │
│ │ gpt-3.5-turbo [📝]              │ │ ← 保持现有chip样式
│ └─────────────────────────────────┘ │   添加事件监听
│ ┌─────────────────────────────────┐ │
│ │ gpt-4                           │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ [+ 添加模型]                    │ │ ← 新增chip（虚线边框）
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘

左键点击模型chip:
    ↓
handleModelClick(model, modelType)
    ↓
检查当前选中状态:
    isActive = isActiveModel(modelType, model.name)
    ↓
if (!isActive):
    // 设为活动模型（同类型其他模型自动取消）
    settingsStore.setActiveModel(modelType, providerId, model.name)
        ↓
    DataSource.setActiveModel()
        ↓
    activeModels[modelType] = 'providerId.modelName'
        ↓
    UI更新（通过computed自动响应）: 
        - 添加 .model-chip--active 类
        - chip背景色变化（#e3f2fd）
        - 边框加粗（2px solid #1976d2）
        - 顶部活动模型标签更新
else:
    // 取消活动（点击已选中的chip）
    settingsStore.clearActiveModel(modelType)
        ↓
    delete activeModels[modelType]
        ↓
    UI更新:
        - 移除 .model-chip--active 类
        - 恢复原样式

右键点击模型chip:
    ↓
handleModelContextMenu(event, model, modelType)
    ↓
event.preventDefault() // 阻止默认右键菜单
    ↓
显示 q-menu（touch-position + context-menu）
    ↓
┌─────────────────────┐
│ 🗑️ 删除模型         │ → handleDeleteModel()
│ ✏️ 重命名           │ → handleRenameModel()
│ ⚙️ 配置参数         │ → handleConfigModel()
└─────────────────────┘

点击 [+ 添加模型] chip:
    ↓
handleAddModel(modelType)
    ↓
打开 AddModelModal，传入当前modelType
    ↓
┌────────────────────────────────────┐
│ 手动添加模型                        │
│                                    │
│ 模型名称 *: [              ]       │
│ 显示名称:   [              ]       │
│ 模型类型:   LLM (预填充，只读)      │
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
settingsStore.addModelToProvider(providerId, modelType, modelDetail)
    ↓
保存到 provider.supportedModels[modelType].models
    ↓
UI自动更新显示新模型chip
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

**Settings.LlmConfig.ProviderCard.vue** ⭐重点修改（只改交互，不改布局）
- 职责：单个提供商的完整展示
- Header部分（保持现有布局）：
  - Logo + 名称 + 描述（不变）
  - 状态chip + 模型数 + 刷新时间（不变）
  - 操作按钮：⚙️配置 🔄刷新 ⚡激活开关（不变）
- Expansion部分（保持现有布局，增强交互）：
  - 按类型分组的模型列表（布局不变）
  - **每个模型chip添加点击事件（@click切换选中）**
  - **每个模型chip添加右键事件（@contextmenu打开菜单）**
  - **每组最后添加一个[+] chip（虚线样式）**
  - 选中状态通过CSS类控制（不改变DOM结构）

**Settings.LlmConfig.ActiveModels.vue** ⭐关键修改（复用ProviderCard的选中逻辑）
- 职责：活动模型管理页面
- **设计变更**：不使用下拉框，直接复用ProviderCard的模型列表
- **实现方式**：
  - 显示所有提供商的ProviderCard
  - 用户通过点击chip选择活动模型（与提供商列表Tab相同交互）
  - 每个模型类型只能有一个选中（单选逻辑）
  - 选中的模型即为该类型的活动模型
- **说明**：图2显示的就是这个逻辑 - "为提供商选取默认模型"
  - 用户在图1的ProviderCard中点击chip
  - 该chip被标记为选中（活动模型）
  - 顶部活动模型标签自动更新

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

## 🎨 UI细节设计（基于现有样式微调）

### 模型chip样式增强（不破坏现有样式）

**实现方式**：在现有chip上添加动态类

```scss
// 保持现有.q-chip样式不变
// 只添加活动状态的modifier类

.model-chip {
  // 保持现有cursor和transition
  
  // 活动模型状态（追加到现有chip上）
  &--active {
    background: #e3f2fd !important; // 浅蓝背景
    border: 2px solid #1976d2 !important; // 加粗蓝色边框
    color: #1976d2 !important;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
  }
  
  // hover状态（未选中时）
  &:not(.model-chip--active):hover {
    border-color: #1976d2;
    background: #f5f5f5;
    cursor: pointer;
  }
  
  // 自定义配置标识（保持现有）
  .custom-badge {
    margin-left: 4px;
    color: #ff9800;
  }
}

// [+] 添加按钮chip样式
.model-chip--add {
  border: 1px dashed #1976d2 !important;
  background: transparent !important;
  color: #1976d2 !important;
  
  &:hover {
    background: #e3f2fd !important;
  }
}
```

**使用示例**：
```vue
<q-chip 
  v-for="model in modelGroup.models"
  :class="{ 
    'model-chip--active': isActiveModel(modelGroup.type, model.name)
  }"
  @click="handleModelClick(model, modelGroup.type)"
  @contextmenu.prevent="handleModelContextMenu($event, model, modelGroup.type)"
>
  {{ model.name }}
  <q-icon v-if="model.config" name="edit" size="xs" class="custom-badge" />
</q-chip>

<!-- 添加按钮chip -->
<q-chip 
  class="model-chip--add"
  @click="handleAddModel(modelGroup.type)"
>
  <q-icon name="add" size="xs" />
  添加模型
</q-chip>
```

### 右键菜单实现（q-menu）

**在ProviderCard组件中添加**：

```vue
<template>
  <!-- 现有内容保持不变 -->
  
  <!-- 模型chip右键菜单（添加到组件末尾） -->
  <q-menu 
    v-model="showContextMenu"
    touch-position 
    context-menu
    transition-show="jump-down"
    transition-hide="jump-up"
  >
    <q-list dense style="min-width: 150px">
      <q-item 
        clickable 
        v-close-popup
        @click="handleDeleteModel(contextMenuModel, contextMenuModelType)"
      >
        <q-item-section avatar>
          <q-icon name="delete" color="negative" />
        </q-item-section>
        <q-item-section>删除模型</q-item-section>
      </q-item>
      
      <q-item 
        clickable 
        v-close-popup
        @click="handleRenameModel(contextMenuModel, contextMenuModelType)"
      >
        <q-item-section avatar>
          <q-icon name="edit" color="primary" />
        </q-item-section>
        <q-item-section>重命名</q-item-section>
      </q-item>
      
      <q-separator />
      
      <q-item 
        clickable 
        v-close-popup
        @click="handleConfigModel(contextMenuModel, contextMenuModelType)"
      >
        <q-item-section avatar>
          <q-icon name="settings" color="orange" />
        </q-item-section>
        <q-item-section>配置参数</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
  
  <!-- 重命名对话框 -->
  <q-dialog v-model="showRenameDialog" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">重命名模型</div>
      </q-card-section>
      
      <q-card-section class="q-pt-none">
        <q-input 
          v-model="renameValue" 
          label="显示名称"
          dense
          autofocus
          @keyup.enter="confirmRename"
        />
      </q-card-section>
      
      <q-card-actions align="right">
        <q-btn flat label="取消" v-close-popup />
        <q-btn 
          flat 
          label="确定" 
          color="primary" 
          @click="confirmRename"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
// 右键菜单相关状态
const showContextMenu = ref(false)
const contextMenuModel = ref<ModelDetail | null>(null)
const contextMenuModelType = ref<string>('')

// 重命名对话框相关
const showRenameDialog = ref(false)
const renameValue = ref('')

// 右键菜单处理函数
function handleModelContextMenu(
  event: MouseEvent, 
  model: ModelDetail, 
  modelType: string
) {
  event.preventDefault()
  contextMenuModel.value = model
  contextMenuModelType.value = modelType
  showContextMenu.value = true
}

function handleDeleteModel(model: ModelDetail, modelType: string) {
  // 确认删除
  $q.dialog({
    title: '确认删除',
    message: `确定要删除模型 "${model.name}" 吗？`,
    cancel: true,
    persistent: true
  }).onOk(() => {
    settingsStore.removeModelFromProvider(
      props.provider.id,
      modelType,
      model.name
    )
  })
}

function handleRenameModel(model: ModelDetail, modelType: string) {
  renameValue.value = model.displayName || model.name
  contextMenuModel.value = model
  contextMenuModelType.value = modelType
  showRenameDialog.value = true
}

function confirmRename() {
  if (contextMenuModel.value) {
    settingsStore.setModelDisplayName(
      props.provider.id,
      contextMenuModel.value.name,
      renameValue.value
    )
    showRenameDialog.value = false
  }
}

function handleConfigModel(model: ModelDetail, modelType: string) {
  // 触发父组件事件，打开ModelConfigModal
  emit('model-config', props.provider, model.name)
}
</script>
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

## 📌 关键实现细节说明

### 1. ProviderCard模型chip交互实现

**在 Settings.LlmConfig.ProviderCard.vue 中**：

```typescript
// computed: 判断模型是否为活动模型
const isActiveModel = (modelType: string, modelName: string): boolean => {
  const activeModelId = settingsStore.activeModels[modelType]
  if (!activeModelId) return false
  
  const { providerId, modelName: activeModelName } = parseModelId(activeModelId)
  return providerId === props.provider.id && activeModelName === modelName
}

// 点击chip切换活动状态
const handleModelClick = async (model: ModelDetail, modelType: string) => {
  const isActive = isActiveModel(modelType, model.name)
  
  if (isActive) {
    // 取消活动
    await settingsStore.clearActiveModel(modelType)
  } else {
    // 设为活动
    await settingsStore.setActiveModel(
      modelType, 
      props.provider.id, 
      model.name
    )
  }
}

// 右键菜单
const handleModelContextMenu = (
  event: MouseEvent,
  model: ModelDetail,
  modelType: string
) => {
  event.preventDefault()
  contextMenuModel.value = model
  contextMenuModelType.value = modelType
  showContextMenu.value = true
}

// 添加模型
const handleAddModel = (modelType: string) => {
  selectedModelType.value = modelType
  showAddModelDialog.value = true
}
```

**模板中的绑定**：

```vue
<q-chip 
  v-for="model in modelGroup.models"
  :key="model.name"
  :class="{ 
    'model-chip--active': isActiveModel(modelGroup.type, model.name)
  }"
  @click="handleModelClick(model, modelGroup.type)"
  @contextmenu.prevent="handleModelContextMenu($event, model, modelGroup.type)"
>
  {{ model.name }}
  <q-icon 
    v-if="model.config" 
    name="edit" 
    size="xs" 
    color="orange"
  />
</q-chip>

<!-- 添加模型按钮 -->
<q-chip 
  class="model-chip--add"
  @click="handleAddModel(modelGroup.type)"
>
  <q-icon name="add" size="xs" />
  添加模型
</q-chip>
```

### 2. 活动模型Tab实现说明

**关键理解**：图2展示的"活动模型"Tab实际上复用了图1的ProviderCard组件

**实现方式**：

```vue
<!-- Settings.LlmConfig.ActiveModels.vue -->
<template>
  <div class="active-models-tab">
    <div class="hint">
      <q-icon name="info" color="primary" />
      为每种模型类型选择一个默认的活动模型
    </div>
    
    <!-- 直接复用ProviderList组件 -->
    <SettingsLlmConfigProviderList />
    
    <!-- 说明：
         - 用户点击任意ProviderCard中的模型chip
         - 该模型被设为对应类型的活动模型
         - 同类型的其他模型自动取消选中
         - 这就是"为提供商选取默认模型"的交互
    -->
  </div>
</template>
```

### 3. 单选逻辑实现（每个类型只能选一个）

**在 settings.llm.store.ts 中**：

```typescript
async function setActiveModel(
  modelType: string,
  providerId: string,
  modelName: string
): Promise<boolean> {
  try {
    loading.value = true
    
    // 创建modelId
    const modelId = createModelId(providerId, modelName)
    
    // 调用DataSource（目前mock，TODO: IPC）
    const success = await DataSource.setActiveModel(modelType, modelId)
    
    if (success) {
      // 更新activeModels（自动覆盖同类型的旧选择）
      activeModels.value[modelType] = modelId
      
      // 触发UI更新（computed自动响应）
    }
    
    return success
  } catch (err) {
    error.value = '设置活动模型失败'
    return false
  } finally {
    loading.value = false
  }
}
```

### 4. CSS实现（不破坏现有样式）

**在 Settings.LlmConfig.ProviderCard.vue 的 scoped style 中添加**：

```scss
// 保持现有所有样式不变

// 只添加以下新样式
.model-chip--active {
  background: #e3f2fd !important;
  border: 2px solid #1976d2 !important;
  color: #1976d2 !important;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
}

.model-chip--add {
  border: 1px dashed #1976d2 !important;
  background: transparent !important;
  color: #1976d2 !important;
  
  &:hover {
    background: #e3f2fd !important;
  }
}

// 添加hover效果（不影响已选中的）
.q-chip:not(.model-chip--active):hover {
  border-color: #1976d2;
  background: #f5f5f5;
  cursor: pointer;
}
```

---

## 📝 实施优先级

### P0 - 核心流程（必须完成）
1. ✅ AddProviderModal三步流程
2. ⭐ ProviderCard模型chip点击选中交互（重点）
3. ⭐ 活动模型设置/取消（重点）
4. ✅ ModelConfigModal（单模型配置）
5. ✅ ProviderConfigModal（提供商配置）

### P1 - 增强交互（重要）
6. ⭐ 右键菜单（新增）
7. ⭐ 模型重命名功能（新增）
8. ⭐ 手动添加模型（AddModelModal，新增）
9. ⭐ 模型删除功能（新增）

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
- [⭐] **可以点击模型chip设置/取消活动模型（核心）**
- [⭐] **可以右键模型chip打开菜单（核心）**
- [⭐] **可以删除模型（核心）**
- [⭐] **可以重命名模型显示名（核心）**
- [ ] 可以配置单个模型参数
- [ ] 可以配置提供商（三Tab完整）
- [ ] 可以刷新模型列表
- [ ] 可以删除提供商
- [⭐] **可以手动添加单个模型（核心）**
- [⭐] **活动模型标签正确显示（核心）**
- [ ] 按状态分组正确显示

### 交互流畅性
- [ ] 所有loading状态正确显示
- [ ] 所有错误提示正确显示
- [ ] 所有成功通知正确显示
- [ ] 对话框打开/关闭动画流畅
- [⭐] **右键菜单位置正确（核心）**

### UI保持完整性（新增）
- [⭐] **现有布局结构不变**
- [⭐] **只通过CSS类添加交互状态**
- [⭐] **不添加破坏现有布局的元素**
- [⭐] **[+]添加按钮融入现有chip风格**

### Mock数据完整性
- [ ] 所有表单不做校验（直接通过）
- [ ] 测试连接总是返回成功+模型列表
- [ ] 所有操作总是返回成功

---

**设计方案完成！** 🎉

**核心原则总结：**
1. ✅ **UI布局完全不变** - 保持现有ProviderCard的所有布局
2. ✅ 完全遵循JiuZhang的交互流程
3. ✅ 三步添加、三Tab配置不变
4. ✅ 增强模型选择交互（点击选中+右键菜单）
5. ✅ 只通过CSS类和事件监听增强交互
6. ✅ 图2的"活动模型Tab"就是复用图1的ProviderCard
7. ✅ 优先保证流程完整（mock不校验）

---
