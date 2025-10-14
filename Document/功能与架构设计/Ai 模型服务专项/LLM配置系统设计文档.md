# Nimbria LLM 配置系统设计文档

**版本**: v1.0  
**创建时间**: 2025年10月11日  
**文档状态**: 反映实际实现  

---

## 📋 系统概述

Nimbria 的 LLM 配置系统提供了一个完整的大语言模型提供商管理和活动模型配置方案。用户可以添加、配置多个 LLM 提供商（如 OpenAI、Anthropic、本地模型等），为不同的模型类型（LLM、TEXT_EMBEDDING 等）设置活动模型，并管理每个提供商的连接参数和默认配置。

该系统从 JiuZhang 项目迁移而来，采用分层架构设计，通过 DataSource 抽象层实现前后端解耦，支持 Mock 数据开发，为未来对接真实后端服务预留了清晰的接口。

### 🎯 核心特性

- **多提供商管理**: 支持添加、配置、激活、删除多个 LLM 提供商
- **活动模型配置**: 为不同模型类型设置当前活跃的模型
- **连接测试**: 实时测试提供商连接状态和 API 可用性
- **模型自动发现**: 连接提供商后自动获取可用模型列表
- **配置继承体系**: Provider 默认配置 + Model 特定覆盖
- **状态分组展示**: 按 active / available / inactive 状态分组
- **Mock 优先开发**: 完整的 Mock 数据支持，便于前端独立开发
- **类型安全**: 完整的 TypeScript 类型系统

---

## 🏗️ 系统架构

### 分层架构设计

```
┌─────────────────────────────────────────────────┐
│              GUI 层 (Vue 组件)                   │
│  SettingsDialog → 设置对话框容器                 │
│  └── Settings.LlmConfig → LLM 配置主组件         │
│       ├── ProviderList → 提供商列表              │
│       │   └── ProviderCard → 提供商卡片          │
│       ├── ActiveModels → 活动模型管理            │
│       ├── AddProviderModal → 添加提供商          │
│       └── ConfigModal → 配置提供商               │
└─────────────────┬───────────────────────────────┘
                  │ Refs/Emits/Store
┌─────────────────▼───────────────────────────────┐
│           Store 层 (Pinia Stores)                │
│  settings.llm.store.ts → LLM 状态管理            │
│  ├── providers (提供商列表)                      │
│  ├── activeModels (活动模型配置)                 │
│  ├── modelRefreshStatus (刷新状态)               │
│  ├── validationErrors (验证错误)                 │
│  └── batchRefreshProgress (批量刷新进度)         │
│                                                  │
│  settings.cache.store.ts → 缓存管理              │
│  settings.store.ts → 通用设置                    │
└─────────────────┬───────────────────────────────┘
                  │ Function Calls
┌─────────────────▼───────────────────────────────┐
│         DataSource 层 (数据访问抽象)             │
│  llm.mock.ts → Mock 数据源                       │
│  DataSource.ts → 统一数据访问接口                │
│  ├── fetchProviders()                           │
│  ├── addProvider()                              │
│  ├── updateProviderConfig()                     │
│  ├── setActiveModel()                           │
│  ├── refreshProviderModels()                    │
│  └── ...                                        │
└─────────────────┬───────────────────────────────┘
                  │ Mock / IPC (Future)
┌─────────────────▼───────────────────────────────┐
│      Backend Service (未来实现)                  │
│  - Electron Main Process                        │
│  - IPC Handlers                                 │
│  - YAML 配置文件读写                             │
│  - LLM API 调用                                  │
└─────────────────────────────────────────────────┘
```

### 数据流架构

```
用户操作 (UI)
    ↓
Vue 组件 emit 事件
    ↓
Store 方法调用
    ↓
DataSource 抽象层
    ├→ Mock 数据 (开发环境)
    └→ IPC 调用 (生产环境, TODO)
        ↓
    Electron Main Process
        ↓
    配置文件 / LLM API
        ↓
    返回结果
        ↓
Store 更新状态
    ↓
Vue 组件响应式更新
```

---

## 📁 核心文件清单

### Store 层 (7个文件)

| 文件路径 | 职责 | 行数 |
|---------|------|------|
| `Client/stores/settings/settings.llm.store.ts` | LLM 状态管理主 Store | 499 |
| `Client/stores/settings/types.ts` | 类型定义 | 174 |
| `Client/stores/settings/llm.mock.ts` | Mock 数据 | 232 |
| `Client/stores/settings/DataSource.ts` | 数据源抽象层 | 407 |
| `Client/stores/settings/settings.cache.store.ts` | 缓存管理 Store | 158 |
| `Client/stores/settings/settings.store.ts` | 通用设置 Store | 29 |
| `Client/stores/settings/index.ts` | 统一导出 | - |

### GUI 层 (7个文件)

| 文件路径 | 职责 | 行数 |
|---------|------|------|
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.LlmConfig.vue` | LLM 配置主组件 | 344 |
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.LlmConfig.ProviderList.vue` | 提供商列表 | 150 |
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.LlmConfig.ProviderCard.vue` | 提供商卡片 | 309 |
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.LlmConfig.ActiveModels.vue` | 活动模型管理 | 275 |
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.LlmConfig.AddProviderModal.vue` | 添加提供商弹窗 | 249 |
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.LlmConfig.ConfigModal.vue` | 配置提供商弹窗 | 256 |
| `Client/GUI/components/HomeDashboardPage/Settings/SettingsDialog.vue` | 设置对话框容器 (扩展) | - |

### 修改的文件

| 文件路径 | 修改内容 |
|---------|---------|
| `Client/GUI/components/HomeDashboardPage/Settings/Settings.CacheManagement.vue` | 更新导入路径 |
| `Client/GUI/components/HomeDashboardPage/Settings/index.ts` | 添加 LLM 组件导出 |

---

## 🔧 技术实现细节

### 1. 数据模型设计

#### ModelProvider (提供商)

```typescript
interface ModelProvider {
  id: string                          // 唯一标识
  name: string                        // 内部名称 (如 'openai')
  displayName: string                 // 显示名称 (如 'OpenAI')
  description: string                 // 描述
  status: ProviderStatus              // 'active' | 'inactive' | 'available'
  
  // 连接配置
  apiKey: string
  baseUrl: string
  
  // 默认配置
  defaultConfig: ModelConfig
  
  // 支持的模型
  supportedModels: ModelTypeGroup[]
  
  // 元数据
  createdAt: Date
  updatedAt: Date
}

interface ModelTypeGroup {
  type: ModelType                     // 'LLM' | 'TEXT_EMBEDDING' | ...
  models: Model[]
}

interface Model {
  name: string                        // 模型名称
  displayName?: string                // 显示名称
  contextLength?: number              // 上下文长度
  maxTokens?: number                  // 最大 Token
  config?: Partial<ModelConfig>       // 特定配置覆盖
}
```

#### ActiveModelConfig (活动模型配置)

```typescript
type ActiveModelConfig = {
  [key in ModelType]?: string         // 格式: 'providerId.modelName'
}

// 示例
const activeModels: ActiveModelConfig = {
  'LLM': 'openai.gpt-4o',
  'TEXT_EMBEDDING': 'openai.text-embedding-3-large'
}
```

#### ModelConfig (模型配置)

```typescript
interface ModelConfig {
  // 请求配置
  timeout: number                     // 请求超时 (ms)
  maxRetries: number                  // 最大重试次数
  
  // 模型参数
  contextLength: number               // 上下文长度
  maxTokens: number                   // 最大生成 Token
  temperature?: number                // 温度参数
  topP?: number                       // Top-P 采样
  
  // 能力配置
  completionMode: 'chat' | 'completion'
  supportsFunctionCalling: boolean
  supportsAgentThinking: boolean
  supportsStructuredOutput: boolean
  
  // 其他
  systemPromptSeparator: string       // 系统提示分隔符
}
```

### 2. DataSource 抽象层

#### 设计理念

DataSource 层的核心作用是**解耦前后端**，为 Store 层提供统一的数据访问接口，内部根据环境自动切换 Mock 数据或真实 IPC 调用。

#### 核心实现

```typescript
// Client/stores/settings/DataSource.ts

// 配置数据源
let useMockSource = true  // 当前使用 Mock

export function configureLlmDataSource(useMock: boolean) {
  useMockSource = useMock
}

// 获取提供商列表
export async function fetchProviders(): Promise<ModelProvider[]> {
  if (useMockSource) {
    // Mock 模式: 返回 Mock 数据
    await simulateDelay(500)
    return mockProviders
  } else {
    // 真实模式: IPC 调用
    // TODO: 实现 IPC 调用
    // return await window.api.llm.getProviders()
    throw new Error('真实后端尚未实现')
  }
}

// 添加提供商
export async function addProvider(provider: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelProvider> {
  if (useMockSource) {
    await simulateDelay(800)
    
    const newProvider: ModelProvider = {
      ...provider,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    mockProviders.push(newProvider)
    return newProvider
  } else {
    // TODO: IPC 调用
    // return await window.api.llm.addProvider(provider)
    throw new Error('真实后端尚未实现')
  }
}

// 更新提供商配置
export async function updateProviderConfig(
  providerId: string, 
  config: Partial<ModelProvider>
): Promise<ModelProvider> {
  if (useMockSource) {
    await simulateDelay(600)
    
    const provider = mockProviders.find(p => p.id === providerId)
    if (!provider) {
      throw new Error(`提供商 ${providerId} 不存在`)
    }
    
    Object.assign(provider, config, { updatedAt: new Date() })
    return provider
  } else {
    // TODO: IPC 调用
    // return await window.api.llm.updateProvider(providerId, config)
    throw new Error('真实后端尚未实现')
  }
}

// 设置活动模型
export async function setActiveModel(
  modelType: ModelType,
  providerId: string,
  modelName: string
): Promise<void> {
  if (useMockSource) {
    await simulateDelay(300)
    
    const modelId = `${providerId}.${modelName}`
    mockActiveModels[modelType] = modelId
  } else {
    // TODO: IPC 调用
    // await window.api.llm.setActiveModel({ modelType, providerId, modelName })
    throw new Error('真实后端尚未实现')
  }
}

// 刷新提供商模型
export async function refreshProviderModels(providerId: string): Promise<ModelTypeGroup[]> {
  if (useMockSource) {
    await simulateDelay(1500)  // 模拟网络请求
    
    const provider = mockProviders.find(p => p.id === providerId)
    if (!provider) {
      throw new Error(`提供商 ${providerId} 不存在`)
    }
    
    // Mock: 随机添加一个新模型
    if (Math.random() > 0.5) {
      const llmGroup = provider.supportedModels.find(g => g.type === 'LLM')
      if (llmGroup) {
        llmGroup.models.push({
          name: `gpt-4o-${Date.now()}`,
          displayName: 'GPT-4o (New)',
          contextLength: 128000,
          maxTokens: 4096
        })
      }
    }
    
    return provider.supportedModels
  } else {
    // TODO: IPC 调用
    // return await window.api.llm.refreshModels(providerId)
    throw new Error('真实后端尚未实现')
  }
}

// 验证提供商配置
export async function validateProvider(provider: Partial<ModelProvider>): Promise<ValidationResult> {
  if (useMockSource) {
    await simulateDelay(400)
    
    const errors: string[] = []
    
    if (!provider.displayName) errors.push('显示名称不能为空')
    if (!provider.name) errors.push('内部名称不能为空')
    if (!provider.apiKey) errors.push('API密钥不能为空')
    if (!provider.baseUrl) errors.push('API地址不能为空')
    
    return {
      isValid: errors.length === 0,
      errors
    }
  } else {
    // TODO: IPC 调用
    // return await window.api.llm.validateProvider(provider)
    throw new Error('真实后端尚未实现')
  }
}

// 测试提供商连接
export async function testProviderConnection(provider: {
  apiKey: string
  baseUrl: string
  timeout?: number
}): Promise<ConnectionTestResult> {
  if (useMockSource) {
    await simulateDelay(1200)
    
    // Mock: 随机成功/失败
    const success = Math.random() > 0.2
    
    return {
      success,
      latency: success ? Math.floor(Math.random() * 200 + 50) : undefined,
      error: success ? undefined : '连接超时或 API 密钥无效'
    }
  } else {
    // TODO: IPC 调用
    // return await window.api.llm.testConnection(provider)
    throw new Error('真实后端尚未实现')
  }
}

// 工具函数: 模拟延迟
function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

### 3. Store 层实现

#### settings.llm.store.ts 核心逻辑

```typescript
// Client/stores/settings/settings.llm.store.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as DataSource from './DataSource'

export const useLlmStore = defineStore('llm', () => {
  // ==================== 状态 ====================
  
  const providers = ref<ModelProvider[]>([])
  const activeModels = ref<ActiveModelConfig>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const modelRefreshStatus = ref<Record<string, RefreshStatus>>({})
  const lastRefreshTime = ref<Record<string, Date>>({})
  const validationErrors = ref<Record<string, string[]>>({})
  
  const batchRefreshProgress = ref({
    total: 0,
    current: 0,
    isRefreshing: false
  })
  
  // ==================== 计算属性 ====================
  
  const activeProviders = computed(() => 
    providers.value.filter(p => p.status === 'active')
  )
  
  const inactiveProviders = computed(() => 
    providers.value.filter(p => p.status === 'inactive')
  )
  
  const availableProviders = computed(() => 
    providers.value.filter(p => p.status === 'available')
  )
  
  const activeModelTypes = computed(() => {
    return Object.entries(activeModels.value).map(([type, modelId]) => {
      const { providerId, modelName } = parseModelId(modelId)
      const provider = providers.value.find(p => p.id === providerId)
      return {
        type: type as ModelType,
        provider,
        modelName
      }
    })
  })
  
  const getProvidersByModelType = computed(() => {
    return (modelType: ModelType) => {
      return providers.value.filter(p => 
        p.supportedModels.some(g => g.type === modelType)
      )
    }
  })
  
  // ==================== 数据加载 ====================
  
  async function loadProviders() {
    try {
      loading.value = true
      error.value = null
      
      providers.value = await DataSource.fetchProviders()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function loadActiveModels() {
    try {
      activeModels.value = await DataSource.fetchActiveModels()
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }
  
  // ==================== 提供商管理 ====================
  
  async function addProvider(provider: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      loading.value = true
      
      const newProvider = await DataSource.addProvider(provider)
      providers.value.push(newProvider)
      
      $q.notify({
        type: 'positive',
        message: `提供商 ${newProvider.displayName} 添加成功`
      })
      
      return newProvider
    } catch (err: any) {
      error.value = err.message
      $q.notify({
        type: 'negative',
        message: `添加提供商失败: ${err.message}`
      })
      throw err
    } finally {
      loading.value = false
    }
  }
  
  async function removeProvider(providerId: string) {
    try {
      const provider = providers.value.find(p => p.id === providerId)
      if (!provider) {
        throw new Error(`提供商 ${providerId} 不存在`)
      }
      
      await DataSource.removeProvider(providerId)
      
      // 移除本地状态
      providers.value = providers.value.filter(p => p.id !== providerId)
      
      // 清理相关的活动模型
      for (const [type, modelId] of Object.entries(activeModels.value)) {
        if (modelId?.startsWith(`${providerId}.`)) {
          delete activeModels.value[type as ModelType]
        }
      }
      
      $q.notify({
        type: 'positive',
        message: `提供商 ${provider.displayName} 已删除`
      })
    } catch (err: any) {
      error.value = err.message
      $q.notify({
        type: 'negative',
        message: `删除提供商失败: ${err.message}`
      })
      throw err
    }
  }
  
  async function activateProvider(providerId: string) {
    try {
      await DataSource.activateProvider(providerId)
      
      const provider = providers.value.find(p => p.id === providerId)
      if (provider) {
        provider.status = 'active'
      }
      
      $q.notify({
        type: 'positive',
        message: '提供商已激活'
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }
  
  async function deactivateProvider(providerId: string) {
    try {
      await DataSource.deactivateProvider(providerId)
      
      const provider = providers.value.find(p => p.id === providerId)
      if (provider) {
        provider.status = 'inactive'
      }
      
      $q.notify({
        type: 'info',
        message: '提供商已停用'
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }
  
  // ==================== 活动模型管理 ====================
  
  async function setActiveModel(modelType: ModelType, providerId: string, modelName: string) {
    try {
      await DataSource.setActiveModel(modelType, providerId, modelName)
      
      const modelId = createModelId(providerId, modelName)
      activeModels.value[modelType] = modelId
      
      $q.notify({
        type: 'positive',
        message: `${modelType} 活动模型已设置为 ${modelName}`
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }
  
  async function clearActiveModel(modelType: ModelType) {
    try {
      await DataSource.clearActiveModel(modelType)
      
      delete activeModels.value[modelType]
      
      $q.notify({
        type: 'info',
        message: `${modelType} 活动模型已清除`
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }
  
  // ==================== 模型刷新 ====================
  
  async function refreshProviderModels(providerId: string) {
    try {
      modelRefreshStatus.value[providerId] = 'loading'
      
      const newModels = await DataSource.refreshProviderModels(providerId)
      
      // 更新提供商的模型列表
      const provider = providers.value.find(p => p.id === providerId)
      if (provider) {
        provider.supportedModels = newModels
        provider.updatedAt = new Date()
      }
      
      modelRefreshStatus.value[providerId] = 'success'
      lastRefreshTime.value[providerId] = new Date()
      
      const modelCount = newModels.reduce((sum, g) => sum + g.models.length, 0)
      
      $q.notify({
        type: 'positive',
        message: `刷新成功，发现 ${modelCount} 个模型`
      })
    } catch (err: any) {
      modelRefreshStatus.value[providerId] = 'error'
      error.value = err.message
      
      $q.notify({
        type: 'negative',
        message: `刷新失败: ${err.message}`
      })
      throw err
    }
  }
  
  async function refreshAllProviders() {
    try {
      batchRefreshProgress.value = {
        total: activeProviders.value.length,
        current: 0,
        isRefreshing: true
      }
      
      for (const provider of activeProviders.value) {
        await refreshProviderModels(provider.id)
        batchRefreshProgress.value.current++
      }
      
      $q.notify({
        type: 'positive',
        message: '所有提供商刷新完成'
      })
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      batchRefreshProgress.value.isRefreshing = false
    }
  }
  
  // ==================== 工具函数 ====================
  
  return {
    // 状态
    providers,
    activeModels,
    loading,
    error,
    modelRefreshStatus,
    lastRefreshTime,
    validationErrors,
    batchRefreshProgress,
    
    // 计算属性
    activeProviders,
    inactiveProviders,
    availableProviders,
    activeModelTypes,
    getProvidersByModelType,
    
    // 方法
    loadProviders,
    loadActiveModels,
    addProvider,
    removeProvider,
    activateProvider,
    deactivateProvider,
    setActiveModel,
    clearActiveModel,
    refreshProviderModels,
    refreshAllProviders
  }
})

// ==================== 工具函数 ====================

function parseModelId(modelId: string): { providerId: string; modelName: string } {
  const [providerId, modelName] = modelId.split('.')
  return { providerId, modelName }
}

function createModelId(providerId: string, modelName: string): string {
  return `${providerId}.${modelName}`
}
```

### 4. GUI 组件实现

#### Settings.LlmConfig.vue (主组件)

```vue
<template>
  <div class="llm-config">
    <!-- Tab 切换 -->
    <q-tabs v-model="activeTab" dense class="text-grey-7">
      <q-tab name="providers" label="提供商列表" />
      <q-tab name="active-models" label="活动模型" />
    </q-tabs>
    
    <!-- 顶部操作栏 -->
    <div class="operation-bar">
      <q-btn
        flat
        dense
        icon="add"
        label="添加提供商"
        @click="showAddModal = true"
      />
      <q-btn
        flat
        dense
        icon="refresh"
        label="刷新全部"
        :loading="llmStore.batchRefreshProgress.isRefreshing"
        @click="handleRefreshAll"
      />
      <q-btn
        flat
        dense
        icon="file_download"
        label="导出配置"
        @click="handleExport"
      />
      <q-btn
        flat
        dense
        icon="file_upload"
        label="导入配置"
        @click="handleImport"
      />
    </div>
    
    <!-- Tab 面板 -->
    <q-tab-panels v-model="activeTab" animated>
      <!-- 提供商列表 -->
      <q-tab-panel name="providers">
        <ProviderList
          :providers="llmStore.providers"
          :loading="llmStore.loading"
          @activate="handleActivate"
          @deactivate="handleDeactivate"
          @configure="handleConfigure"
          @refresh="handleRefresh"
          @remove="handleRemove"
          @model-config="handleModelConfig"
          @toggle-active-model="handleToggleActiveModel"
        />
      </q-tab-panel>
      
      <!-- 活动模型 -->
      <q-tab-panel name="active-models">
        <ActiveModels
          :active-models="llmStore.activeModels"
          :providers="llmStore.providers"
          @set-active="handleSetActive"
          @clear-active="handleClearActive"
        />
      </q-tab-panel>
    </q-tab-panels>
    
    <!-- 添加提供商弹窗 -->
    <AddProviderModal
      v-model="showAddModal"
      @save="handleAdd"
    />
    
    <!-- 配置提供商弹窗 -->
    <ConfigModal
      v-model="showConfigModal"
      :provider="selectedProvider"
      @save="handleSaveConfig"
      @delete="handleDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useLlmStore } from '@stores/settings'

const llmStore = useLlmStore()

const activeTab = ref('providers')
const showAddModal = ref(false)
const showConfigModal = ref(false)
const selectedProvider = ref<ModelProvider | null>(null)

// 加载数据
llmStore.loadProviders()
llmStore.loadActiveModels()

// 事件处理
const handleActivate = (providerId: string) => {
  llmStore.activateProvider(providerId)
}

const handleDeactivate = (providerId: string) => {
  llmStore.deactivateProvider(providerId)
}

const handleConfigure = (provider: ModelProvider) => {
  selectedProvider.value = provider
  showConfigModal.value = true
}

const handleRefresh = (providerId: string) => {
  llmStore.refreshProviderModels(providerId)
}

const handleRemove = async (providerId: string) => {
  const confirmed = await $q.dialog({
    title: '确认删除',
    message: '确定要删除此提供商吗？',
    cancel: true
  })
  
  if (confirmed) {
    llmStore.removeProvider(providerId)
  }
}

const handleAdd = (provider: Omit<ModelProvider, 'id' | 'createdAt' | 'updatedAt'>) => {
  llmStore.addProvider(provider)
  showAddModal.value = false
}

const handleSaveConfig = (config: Partial<ModelProvider>) => {
  if (selectedProvider.value) {
    llmStore.updateProviderConfig(selectedProvider.value.id, config)
  }
  showConfigModal.value = false
}

const handleSetActive = (modelType: ModelType, modelId: string) => {
  const { providerId, modelName } = parseModelId(modelId)
  llmStore.setActiveModel(modelType, providerId, modelName)
}

const handleClearActive = (modelType: ModelType) => {
  llmStore.clearActiveModel(modelType)
}
</script>
```

#### Settings.LlmConfig.ProviderCard.vue (提供商卡片)

```vue
<template>
  <q-card class="provider-card">
    <q-card-section class="provider-header">
      <!-- Logo -->
      <div class="provider-logo">
        <img v-if="provider.logo" :src="provider.logo" />
        <q-icon v-else name="cloud" size="48px" />
      </div>
      
      <!-- 信息 -->
      <div class="provider-info">
        <div class="provider-name">
          {{ provider.displayName }}
          <q-chip :color="statusColor" text-color="white" dense>
            {{ statusLabel }}
          </q-chip>
        </div>
        <div class="provider-description">
          {{ provider.description }}
        </div>
        <div class="provider-meta">
          {{ modelCount }} 个模型 • 上次刷新: {{ lastRefreshText }}
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="provider-actions">
        <q-btn
          flat
          dense
          round
          icon="settings"
          @click="$emit('configure', provider)"
        >
          <q-tooltip>配置</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          icon="refresh"
          :loading="isRefreshing"
          @click="$emit('refresh', provider.id)"
        >
          <q-tooltip>刷新模型</q-tooltip>
        </q-btn>
        <q-toggle
          :model-value="provider.status === 'active'"
          @update:model-value="handleToggleStatus"
          icon="power_settings_new"
        >
          <q-tooltip>激活/停用</q-tooltip>
        </q-toggle>
      </div>
    </q-card-section>
    
    <!-- 模型列表 (可展开) -->
    <q-expansion-item
      dense
      label="显示模型"
      :caption="`共 ${modelCount} 个模型`"
    >
      <q-card-section v-for="group in provider.supportedModels" :key="group.type">
        <div class="model-type-header">
          {{ group.type }} ({{ group.models.length }})
        </div>
        
        <div v-for="model in group.models" :key="model.name" class="model-item">
          <div class="model-info">
            <div class="model-name">
              {{ model.displayName || model.name }}
              <q-chip v-if="isActiveModel(group.type, model.name)" dense color="primary">
                活动
              </q-chip>
              <q-chip v-if="model.config" dense color="orange" icon="edit">
                自定义
              </q-chip>
            </div>
            <div class="model-meta">
              上下文: {{ model.contextLength }} • 最大Token: {{ model.maxTokens }}
            </div>
          </div>
          
          <div class="model-actions">
            <q-toggle
              :model-value="isActiveModel(group.type, model.name)"
              @update:model-value="(val) => handleToggleActiveModel(group.type, model.name, val)"
              label="设为活动"
              dense
            />
            <q-btn
              flat
              dense
              round
              icon="settings"
              size="sm"
              @click="$emit('model-config', provider, model.name)"
            >
              <q-tooltip>配置此模型</q-tooltip>
            </q-btn>
          </div>
        </div>
      </q-card-section>
    </q-expansion-item>
  </q-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLlmStore } from '@stores/settings'

const props = defineProps<{
  provider: ModelProvider
}>()

const emit = defineEmits<{
  configure: [provider: ModelProvider]
  refresh: [providerId: string]
  activate: [providerId: string]
  deactivate: [providerId: string]
  modelConfig: [provider: ModelProvider, modelName: string]
  toggleActiveModel: [modelType: ModelType, modelName: string, active: boolean]
}>()

const llmStore = useLlmStore()

const modelCount = computed(() => 
  props.provider.supportedModels.reduce((sum, g) => sum + g.models.length, 0)
)

const statusColor = computed(() => {
  switch (props.provider.status) {
    case 'active': return 'positive'
    case 'inactive': return 'grey'
    case 'available': return 'info'
    default: return 'grey'
  }
})

const statusLabel = computed(() => {
  switch (props.provider.status) {
    case 'active': return '活动'
    case 'inactive': return '已停用'
    case 'available': return '可用'
    default: return '未知'
  }
})

const isRefreshing = computed(() => 
  llmStore.modelRefreshStatus[props.provider.id] === 'loading'
)

const lastRefreshText = computed(() => {
  const time = llmStore.lastRefreshTime[props.provider.id]
  if (!time) return '从未'
  
  const diff = Date.now() - time.getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  
  if (hours > 0) return `${hours} 小时前`
  if (minutes > 0) return `${minutes} 分钟前`
  return '刚刚'
})

const isActiveModel = (modelType: ModelType, modelName: string) => {
  const activeModelId = llmStore.activeModels[modelType]
  return activeModelId === `${props.provider.id}.${modelName}`
}

const handleToggleStatus = (active: boolean) => {
  if (active) {
    emit('activate', props.provider.id)
  } else {
    emit('deactivate', props.provider.id)
  }
}

const handleToggleActiveModel = (modelType: ModelType, modelName: string, active: boolean) => {
  emit('toggleActiveModel', modelType, modelName, active)
}
</script>
```

---

## 🗄️ 状态管理详解

### Store 状态总览

```typescript
// settings.llm.store.ts 状态

interface LlmStoreState {
  // 核心数据
  providers: ModelProvider[]              // 提供商列表
  activeModels: ActiveModelConfig         // 活动模型配置
  
  // UI 状态
  loading: boolean                        // 全局加载状态
  error: string | null                    // 错误信息
  
  // 刷新状态
  modelRefreshStatus: Record<string, RefreshStatus>  // 每个提供商的刷新状态
  lastRefreshTime: Record<string, Date>              // 最后刷新时间
  
  // 验证
  validationErrors: Record<string, string[]>         // 验证错误
  
  // 批量操作
  batchRefreshProgress: {
    total: number
    current: number
    isRefreshing: boolean
  }
}
```

### 计算属性

| 属性名 | 返回类型 | 说明 |
|-------|---------|------|
| `activeProviders` | `ModelProvider[]` | 状态为 active 的提供商 |
| `inactiveProviders` | `ModelProvider[]` | 状态为 inactive 的提供商 |
| `availableProviders` | `ModelProvider[]` | 状态为 available 的提供商 |
| `activeModelTypes` | `Array<{type, provider, modelName}>` | 所有已设置的活动模型 |
| `getProvidersByModelType` | `(type) => ModelProvider[]` | 获取支持指定模型类型的提供商 |

### 关键方法

| 方法名 | 参数 | 返回值 | 说明 |
|-------|------|--------|------|
| `loadProviders` | - | `Promise<void>` | 加载提供商列表 |
| `loadActiveModels` | - | `Promise<void>` | 加载活动模型配置 |
| `addProvider` | `provider` | `Promise<ModelProvider>` | 添加新提供商 |
| `removeProvider` | `providerId` | `Promise<void>` | 删除提供商 |
| `activateProvider` | `providerId` | `Promise<void>` | 激活提供商 |
| `deactivateProvider` | `providerId` | `Promise<void>` | 停用提供商 |
| `updateProviderConfig` | `providerId, config` | `Promise<void>` | 更新提供商配置 |
| `setActiveModel` | `modelType, providerId, modelName` | `Promise<void>` | 设置活动模型 |
| `clearActiveModel` | `modelType` | `Promise<void>` | 清除活动模型 |
| `refreshProviderModels` | `providerId` | `Promise<void>` | 刷新提供商模型列表 |
| `refreshAllProviders` | - | `Promise<void>` | 批量刷新所有活动提供商 |
| `validateProvider` | `provider` | `Promise<ValidationResult>` | 验证提供商配置 |
| `testProviderConnection` | `provider` | `Promise<ConnectionTestResult>` | 测试提供商连接 |

---

## 🎨 UI/UX 设计特点

### 1. 分组展示

**按状态分组提供商**

- **活动 (Active)**: 当前正在使用的提供商
- **可用 (Available)**: 已配置但未激活的提供商
- **已停用 (Inactive)**: 被手动停用的提供商

### 2. 卡片式布局

**提供商卡片包含:**

- Logo + 名称 + 状态 Badge
- 描述信息
- 模型数量和刷新时间
- 操作按钮 (配置、刷新、激活/停用)
- 可展开的模型列表

### 3. 活动模型管理

**按模型类型分类**

```
LLM (大语言模型)
  当前: OpenAI - GPT-4o
  [下拉选择器: openai.gpt-3.5-turbo, openai.gpt-4, anthropic.claude-3-opus, ...]
  [清除]

TEXT_EMBEDDING (文本嵌入)
  当前: OpenAI - text-embedding-3-large
  [下拉选择器: ...]
  [清除]

SPEECH_TO_TEXT (语音转文字)
  未设置
  [下拉选择器: ...]
```

### 4. 实时反馈

- **Loading 状态**: 按钮 loading 动画、全局 loading overlay
- **成功/失败通知**: Quasar Notify 提示
- **刷新进度**: 批量刷新时显示进度条
- **连接测试结果**: 绿色/红色 Banner 显示测试结果

### 5. 危险操作确认

- 删除提供商: 二次确认对话框
- 停用活动提供商: 警告提示
- 清除活动模型: 确认提示

---

## 🚀 性能优化

### 1. 懒加载

- 模型列表默认折叠,点击展开时才渲染
- 大量提供商时使用虚拟滚动 (未来扩展)

### 2. 防抖与节流

- 刷新按钮添加防抖,避免频繁点击
- 批量刷新时串行执行,避免并发过高

### 3. 数据缓存

- 模型列表刷新后缓存结果
- 上次刷新时间记录,避免重复刷新

### 4. 错误恢复

- 单个提供商刷新失败不影响其他
- 批量刷新失败后可单独重试

---

## 🧪 测试策略

### 单元测试重点

1. **DataSource 层**
   - Mock 模式的所有方法
   - 延迟模拟的准确性
   - 错误场景的处理

2. **Store 层**
   - 状态更新的正确性
   - 计算属性的逻辑
   - 异步操作的错误处理

3. **工具函数**
   - `parseModelId` / `createModelId`
   - `isValidModelId`

### 集成测试重点

1. **完整配置流程**: 添加提供商 → 连接测试 → 刷新模型 → 设置活动模型
2. **状态同步**: Store 状态与 UI 的同步
3. **错误恢复**: 各种异常情况的恢复

### E2E 测试场景

1. **首次使用**: 添加 OpenAI 提供商并设置活动模型
2. **多提供商管理**: 添加多个提供商并切换活动模型
3. **刷新与更新**: 刷新模型列表,发现新模型
4. **删除与清理**: 删除提供商,自动清理相关活动模型

---

## 📊 监控与调试

### 关键指标

1. **加载性能**
   - 提供商列表加载时间
   - 模型刷新时间
   - 连接测试响应时间

2. **用户行为**
   - 提供商激活率
   - 模型刷新频率
   - 配置修改频率

### 调试工具

1. **浏览器控制台**
   ```typescript
   const llmStore = useLlmStore()
   console.log('提供商:', llmStore.providers)
   console.log('活动模型:', llmStore.activeModels)
   console.log('刷新状态:', llmStore.modelRefreshStatus)
   ```

2. **Mock 数据查看**
   ```typescript
   import { mockProviders, mockActiveModels } from '@stores/settings/llm.mock'
   console.log('Mock 提供商:', mockProviders)
   console.log('Mock 活动模型:', mockActiveModels)
   ```

---

## 🔄 版本历史与路线图

### 当前版本 (v1.0)

- ✅ 完整的 Mock 数据支持
- ✅ 提供商增删改查
- ✅ 活动模型配置
- ✅ 模型刷新功能
- ✅ 连接测试
- ✅ 配置验证
- ✅ 分层架构设计
- ✅ 类型安全保障

### 计划中的功能 (v1.1+)

- [ ] Electron IPC 通信实现
- [ ] YAML 配置文件读写
- [ ] 真实 LLM API 调用
- [ ] 模型使用统计
- [ ] 成本追踪
- [ ] 配置模板系统
- [ ] 配置导入/导出
- [ ] 模型性能监控
- [ ] 智能模型推荐
- [ ] 多语言支持

---

## 📖 相关文档

- [架构设计总览](./架构设计总览.md)
- [LLM配置系统实现总结_2025年10月11日](../总结/LLM配置系统实现总结_2025年10月11日.md)
- [JiuZhang-LLM配置交互设计分析](../总结/JiuZhang-LLM配置交互设计分析.md)
- [LLM配置系统设计文档 (Design)](../Design/LLm配置系统/Plan1.md)

---

**最后更新**: 2025年10月11日  
**负责人**: Nimbria 开发团队  
**代码行数**: ~2583 行 (Store: ~1312 行, GUI: ~1583 行)

