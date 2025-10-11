<!-- 0002dd21-43ec-430d-af34-860f7674b8b4 6f672864-b9a9-4939-bb78-1220f792dd4c -->
# LLM配置交互设计实现计划
//
## 一、Store层重构与LLM状态管理

### 1. 拆分Settings Store（缓存部分独立）

**目标文件结构：**

```
Nimbria/Client/stores/settings/
├── index.ts                          # 统一导出
├── settings.store.ts                 # 通用设置（AI配置、主题等未实现功能）
├── settings.cache.store.ts           # 缓存管理状态（从settings.store.ts拆出）
├── settings.llm.store.ts             # LLM配置状态管理
├── mock.ts                           # Mock数据（包含LLM模拟数据）
├── DataSource.ts                     # 数据源管理
└── types.ts                          # 类型定义
```

**实现步骤：**

#### 1.1 创建 `types.ts`

- 从JiuZhang项目复制核心类型定义：
  - `ModelType`, `ProviderStatus`, `ModelConfig`
  - `ModelDetail`, `SupportedModel`, `ModelProvider`
  - `ActiveModelConfig`, `ParsedModelId`
  - 工具函数：`parseModelId`, `createModelId`, `isValidModelId`
  - 常量：`DEFAULT_MODEL_CONFIG`
- 新增验证相关类型：
  - `ValidationResult`, `ModelRefreshResult`, `BatchRefreshResult`

#### 1.2 创建 `settings.cache.store.ts`

- 从现有 `settings.store.ts` 中提取缓存管理相关代码：
  - 状态：无（纯函数式）
  - 方法：
    - `getAllCacheData()`
    - `getCacheSizeInBytes()`
    - `getModuleCacheItems()`
    - `clearAllCache()`
  - 计算属性：`formattedCacheSize`

#### 1.3 创建 `settings.llm.store.ts`

- 参照JiuZhang的 `settings.ts`，实现完整的LLM状态管理：

**状态定义：**

```typescript
- providers: ref<ModelProvider[]>([])
- activeModels: ref<ActiveModelConfig>({})
- loading: ref(false)
- error: ref<string | null>(null)
- modelRefreshStatus: ref<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({})
- lastRefreshTime: ref<Record<string, Date>>({})
- validationErrors: ref<Record<string, string[]>>({})
- batchRefreshProgress: ref<{ total: number; completed: number; failed: number }>
```

**计算属性：**

```typescript
- activeProviders
- inactiveProviders
- availableProviders
- getProvidersByModelType
- hasError
- activeModelTypes
```

**方法（所有方法调用DataSource）：**

```typescript
- loadProviders()
- loadActiveModels()
- activateProvider(providerId)
- deactivateProvider(providerId)
- updateProviderConfig(providerId, config)
- setActiveModel(modelType, providerId, modelName)
- clearActiveModel(modelType)
- addProvider(provider)
- removeProvider(providerId)
- resetToDefault()
- exportConfig()
- importConfig(yamlContent)
- refreshProviderModels(providerId)
- refreshAllProviders()
- validateProvider(config)
- testProviderConnection(providerId)
- updateModelConfig(providerId, modelName, config)
- resetModelConfig(providerId, modelName)
- getActiveModelInfo(modelType)
- initialize()
```

#### 1.4 创建 `mock.ts`

- 创建模拟的LLM提供商数据（至少3个provider）：
  - OpenAI（状态：active，包含GPT-3.5/GPT-4模型）
  - Anthropic（状态：inactive，包含Claude系列模型）
  - Custom Provider（状态：available，自定义配置示例）
- 每个provider包含完整的字段：
  ```typescript
  {
    id, name, displayName, description, logo,
    status, apiKey, baseUrl,
    defaultConfig,
    supportedModels: [
      { type: 'LLM', models: [...] },
      { type: 'TEXT_EMBEDDING', models: [...] }
    ]
  }
  ```

- 模拟的activeModels配置

#### 1.5 创建 `DataSource.ts`

- 参照 `home/DataSource.ts` 结构：
  ```typescript
  const useMockSource = ref(true)
  
  export function configureLlmDataSource(options: { useMock?: boolean })
  
  export async function fetchProviders(): Promise<ModelProvider[]>
  export async function fetchActiveModels(): Promise<ActiveModelConfig>
  export async function addProvider(provider): Promise<ModelProvider>
  export async function removeProvider(id): Promise<boolean>
  // ... 其他数据获取方法
  ```

- 所有方法在 `useMockSource = true` 时返回mock数据
- 添加 `TODO` 注释标记未来需要对接真实服务的位置

#### 1.6 更新 `settings.store.ts`

- 移除缓存管理相关代码
- 保留AI配置和主题配置的ref（未实现功能的占位）

#### 1.7 更新 `index.ts`

```typescript
export * from './types'
export * from './settings.store'
export * from './settings.cache.store'
export * from './settings.llm.store'
export * from './DataSource'
```

---

## 二、GUI组件实现

### 2. 创建LLM配置组件体系

**目标文件结构：**

```
Nimbria/Client/GUI/components/HomeDashboardPage/Settings/
├── SettingsDialog.vue                      # 已存在，需更新菜单项
├── Settings.CacheManagement.vue            # 已存在（更新导入路径）
├── Settings.AIConfig.vue                   # 已存在（保持不变）
├── Settings.ThemeSettings.vue              # 已存在（保持不变）
├── Settings.LlmConfig.vue                  # 新增：LLM配置主组件
├── Settings.LlmConfig.ProviderList.vue     # 新增：提供商列表
├── Settings.LlmConfig.ProviderCard.vue     # 新增：提供商卡片
├── Settings.LlmConfig.AddProviderModal.vue # 新增：添加提供商弹窗
├── Settings.LlmConfig.AddOpenAIModal.vue   # 新增：OpenAI快捷添加
├── Settings.LlmConfig.ConfigModal.vue      # 新增：提供商配置弹窗
├── Settings.LlmConfig.ModelConfigModal.vue # 新增：模型配置弹窗
├── Settings.LlmConfig.ActiveModels.vue     # 新增：活动模型管理
└── index.ts                                # 更新导出
```

### 2.1 更新 `SettingsDialog.vue`

- 在 `menuItems` 中添加：
  ```typescript
  { id: 'llm', label: 'LLM配置', icon: 'psychology' }
  ```

- 在 `settings-content` 区域添加：
  ```vue
  <section :id="'section-llm'" class="settings-section">
    <SettingsLlmConfig />
  </section>
  ```

- 更新sections数组包含 `'llm'`

### 2.2 创建 `Settings.LlmConfig.vue`（主容器）

参照JiuZhang的 `ModelProviders.vue` 设计：

**布局结构：**

```vue
<template>
  <div class="llm-config">
    <h5 class="settings-title">LLM 配置</h5>
    <p class="settings-description">管理大语言模型提供商和活动模型</p>

    <!-- 顶部操作栏 -->
    <div class="llm-config__toolbar">
      <q-btn @click="showAddModal = true" icon="add" label="添加提供商" />
      <q-btn @click="refreshAll" icon="refresh" label="刷新全部" />
      <q-btn @click="handleExport" icon="download" label="导出配置" />
      <q-btn @click="handleImport" icon="upload" label="导入配置" />
    </div>

    <!-- Tab切换：提供商列表 / 活动模型 -->
    <q-tabs v-model="activeTab">
      <q-tab name="providers" label="提供商列表" />
      <q-tab name="active-models" label="活动模型" />
    </q-tabs>

    <q-tab-panels v-model="activeTab">
      <!-- 提供商列表面板 -->
      <q-tab-panel name="providers">
        <SettingsLlmConfigProviderList
          :providers="llmStore.providers"
          :loading="llmStore.loading"
          @activate="handleActivate"
          @deactivate="handleDeactivate"
          @configure="handleConfigure"
          @remove="handleRemove"
          @refresh="handleRefreshProvider"
        />
      </q-tab-panel>

      <!-- 活动模型面板 -->
      <q-tab-panel name="active-models">
        <SettingsLlmConfigActiveModels
          :active-models="llmStore.activeModels"
          :providers="llmStore.providers"
          @set-active="handleSetActive"
          @clear-active="handleClearActive"
        />
      </q-tab-panel>
    </q-tab-panels>

    <!-- 各类弹窗组件 -->
    <SettingsLlmConfigAddProviderModal v-model="showAddModal" />
    <SettingsLlmConfigConfigModal v-model="showConfigModal" :provider-id="currentProviderId" />
    <!-- ... -->
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsLlmStore } from '@stores/settings'
// 导入子组件...

const llmStore = useSettingsLlmStore()
const activeTab = ref('providers')
// 状态和方法...

onMounted(() => {
  llmStore.initialize()
})
</script>
```

### 2.3 创建 `Settings.LlmConfig.ProviderList.vue`

- 接收props：`providers`, `loading`
- 发出事件：`activate`, `deactivate`, `configure`, `remove`, `refresh`
- 布局：
  - 分组显示：已激活 / 未激活 / 可用
  - 每个提供商使用 `ProviderCard` 组件
  - 空状态提示

### 2.4 创建 `Settings.LlmConfig.ProviderCard.vue`

参照JiuZhang的 `ModelProviderCard.vue`：

**UI元素：**

- Logo + 名称 + 状态badge
- 描述信息
- 支持的模型类型标签
- 操作按钮：
  - 激活/停用
  - 配置
  - 刷新模型
  - 删除
- 刷新状态指示器
- 最后刷新时间

**交互：**

- 支持折叠展开显示模型列表
- 悬浮显示详细信息

### 2.5 创建 `Settings.LlmConfig.AddProviderModal.vue`

参照JiuZhang的 `AddProviderModal.vue`：

**功能：**

- 提供两种添加方式：

  1. 快捷添加（OpenAI/Anthropic等常见provider）
  2. 自定义添加（手动输入所有字段）

- 表单字段：
  - Provider ID
  - 显示名称
  - API Key
  - Base URL
  - 描述
- 验证规则
- 提交后调用 `llmStore.addProvider()`

### 2.6 创建 `Settings.LlmConfig.AddOpenAIModal.vue`

- 简化版表单，只需输入API Key
- 预设OpenAI的baseUrl和默认配置
- 支持选择OpenAI或兼容的provider（如Azure OpenAI）

### 2.7 创建 `Settings.LlmConfig.ConfigModal.vue`

参照JiuZhang的 `ProviderConfigModal.vue`：

**功能：**

- 编辑提供商配置：
  - API Key（密码框）
  - Base URL
  - 默认超时时间
  - 重试次数
  - 其他高级配置（可选）
- 表单验证
- 测试连接按钮
- 保存后调用 `llmStore.updateProviderConfig()`

### 2.8 创建 `Settings.LlmConfig.ModelConfigModal.vue`

参照JiuZhang的 `ModelConfigModal.vue`：

**功能：**

- 编辑特定模型的配置（覆盖提供商默认配置）：
  - Context Length
  - Max Tokens
  - Completion Mode（对话/补全）
  - Function Calling支持
  - Structured Output支持
  - Agent Thought支持
- 重置为默认配置按钮
- 保存后调用 `llmStore.updateModelConfig()`

### 2.9 创建 `Settings.LlmConfig.ActiveModels.vue`

**功能：**

- 显示所有模型类型（LLM, TEXT_EMBEDDING, IMAGE_GENERATION等）
- 每个类型显示当前选中的模型
- 提供下拉选择器切换活动模型
- 选项格式：`{providerId}.{modelName}`
- 显示模型详细信息（来自provider的supportedModels）
- 清除按钮

### 2.10 更新 `index.ts`

```typescript
export { default as SettingsLlmConfig } from './Settings.LlmConfig.vue'
export { default as SettingsLlmConfigProviderList } from './Settings.LlmConfig.ProviderList.vue'
export { default as SettingsLlmConfigProviderCard } from './Settings.LlmConfig.ProviderCard.vue'
// ... 导出所有新组件
```

### 2.11 更新 `Settings.CacheManagement.vue`

- 修改导入语句：
  ```typescript
  import { useSettingsCacheStore } from '@stores/settings'
  const cacheStore = useSettingsCacheStore()
  ```


---

## 三、样式与交互细节

### 3.1 样式指南

- 遵循现有的设计风格（参考 `HomeDashboardPage.scss`）
- 使用Quasar组件和主题变量
- 卡片样式保持一致（圆角、阴影、padding）
- 状态颜色：
  - active: green
  - inactive: grey
  - available: blue
  - loading: orange
  - error: red

### 3.2 交互反馈

- 所有异步操作显示loading状态
- 成功/失败操作使用 `Notify` 提示
- 危险操作（删除）需要二次确认对话框
- 表单验证实时反馈

### 3.3 响应式布局

- 提供商卡片使用grid布局，自适应列数
- 移动端友好（Stack布局）

---

## 四、类型安全与路径别名

### 4.1 更新 `quasar.config.ts`（如需要）

添加别名：

```typescript
{
  find: '@stores/settings',
  replacement: path.resolve(__dirname, 'Client/stores/settings')
}
```

### 4.2 确保所有import使用别名

```typescript
import { useSettingsLlmStore } from '@stores/settings'
import type { ModelProvider } from '@stores/settings'
```

---

## 五、实现验证清单

完成后验证以下功能：

**Store层：**

- [ ] 缓存store独立且正常工作
- [ ] LLM store初始化加载mock数据
- [ ] 所有computed属性正确计算
- [ ] 所有方法调用DataSource并返回模拟结果

**UI层：**

- [ ] SettingsDialog新增LLM配置菜单项
- [ ] 可以查看所有mock的提供商
- [ ] 提供商卡片正确显示状态和信息
- [ ] 可以激活/停用提供商（视觉状态改变）
- [ ] 可以打开配置弹窗并编辑
- [ ] 可以添加新提供商（数据添加到store）
- [ ] 可以删除提供商（有确认对话框）
- [ ] 活动模型tab显示当前配置
- [ ] 可以切换活动模型
- [ ] 刷新按钮触发loading状态
- [ ] 导出/导入配置按钮可点击（暂时只显示提示）

**交互体验：**

- [ ] 所有操作有loading反馈
- [ ] 成功/失败有Notify提示
- [ ] 表单有验证提示
- [ ] 无控制台错误
- [ ] 类型检查通过

---

## 注意事项

1. **不对接真实后端**：所有数据操作在DataSource层返回mock结果，不调用Electron API
2. **保留接口兼容**：DataSource方法签名设计为未来易于对接真实服务
3. **完整复制JiuZhang交互**：UI和功能完全参照JiuZhang项目，确保用户体验一致
4. **文件命名规范**：严格遵循 `Settings.LlmConfig.{SubComponent}.vue` 命名模式
5. **代码模块化**：单个组件不超过500行，复杂逻辑拆分到composables（如需要）

### To-dos

- [ ] 创建 stores/settings/types.ts - 定义所有LLM相关类型
- [ ] 创建 stores/settings/mock.ts - 模拟3个provider的完整数据
- [ ] 创建 stores/settings/DataSource.ts - 数据获取层（返回mock）
- [ ] 创建 stores/settings/settings.cache.store.ts - 拆分缓存管理
- [ ] 创建 stores/settings/settings.llm.store.ts - LLM状态管理核心
- [ ] 重构 stores/settings/settings.store.ts - 移除缓存代码
- [ ] 更新 stores/settings/index.ts - 统一导出所有模块
- [ ] 更新 SettingsDialog.vue - 添加LLM配置菜单项
- [ ] 创建 Settings.LlmConfig.vue - LLM配置主容器组件
- [ ] 创建 Settings.LlmConfig.ProviderCard.vue - 提供商卡片组件
- [ ] 创建 Settings.LlmConfig.ProviderList.vue - 提供商列表组件
- [ ] 创建 Settings.LlmConfig.ActiveModels.vue - 活动模型管理组件
- [ ] 创建 Settings.LlmConfig.AddProviderModal.vue - 添加提供商弹窗
- [ ] 创建 Settings.LlmConfig.AddOpenAIModal.vue - OpenAI快捷添加
- [ ] 创建 Settings.LlmConfig.ConfigModal.vue - 提供商配置弹窗
- [ ] 创建 Settings.LlmConfig.ModelConfigModal.vue - 模型配置弹窗
- [ ] 更新 components/HomeDashboardPage/Settings/index.ts - 导出新组件
- [ ] 更新 Settings.CacheManagement.vue - 修改store导入路径
- [ ] 集成测试 - 验证所有交互功能正常工作