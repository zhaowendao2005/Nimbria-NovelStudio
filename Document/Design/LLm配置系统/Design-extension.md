# 提供商添加与模型配置流程设计

## 一、核心流程概述

```
添加提供商流程：
1. 输入基础信息（名称、API Key、Base URL）
2. 测试连接 → 获取可用模型列表
3. 选择要启用的模型
4. 配置提供商级默认配置（高级设置）
5. （可选）为每个模型配置独立的高级设置
6. 保存并激活提供商

模型配置流程（已添加提供商）：
1. 右键模型chip → 弹出菜单
2. 菜单选项：
   - 重命名（修改displayName）
   - 配置模型（打开高级设置）
   - 删除模型
```

## 二、状态设计

### 2.1 AddProviderModal 状态

```json
{
  "modalState": {
    "visible": true,
    "currentStep": "basic | testing | modelSelection | advancedConfig | complete",
    "canGoBack": true,
    "canGoNext": false,
    "isLoading": false
  },
  
  "basicInfo": {
    "name": "siliconflow",
    "displayName": "硅基流动",
    "description": "OpenAI兼容API - 硅基流动",
    "apiKey": "sk-xxxxx",
    "baseUrl": "https://api.siliconflow.cn/v1"
  },
  
  "testingState": {
    "status": "idle | testing | success | failed",
    "error": null,
    "discoveredModels": [
      {
        "type": "LLM",
        "models": [
          {"name": "deepseek-ai/DeepSeek-V3", "isAvailable": true},
          {"name": "Qwen/Qwen2.5-72B-Instruct", "isAvailable": true}
        ]
      },
      {
        "type": "TEXT_EMBEDDING",
        "models": [
          {"name": "BAAI/bge-m3", "isAvailable": true}
        ]
      }
    ]
  },
  
  "modelSelection": {
    "selectedModels": {
      "LLM": ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
      "TEXT_EMBEDDING": ["BAAI/bge-m3"]
    }
  },
  
  "providerConfig": {
    "timeout": 30000,
    "maxRetries": 3,
    "contextLength": 4096,
    "maxTokens": 4096,
    "completionMode": "对话",
    "agentThought": "不支持",
    "functionCalling": "不支持",
    "structuredOutput": "不支持",
    "systemPromptSeparator": "\n\n"
  }
}
```

### 2.2 ModelProvider 最终数据结构

```json
{
  "id": "provider_1757272412113_lcna8g",
  "name": "siliconflow",
  "displayName": "硅基流动",
  "description": "OpenAI兼容API - 硅基流动",
  "status": "active",
  "apiKey": "sk-xxxxx",
  "baseUrl": "https://api.siliconflow.cn/v1",
  
  "defaultConfig": {
    "timeout": 30000,
    "maxRetries": 3,
    "contextLength": 4096,
    "maxTokens": 4096,
    "completionMode": "对话",
    "agentThought": "不支持",
    "functionCalling": "不支持",
    "structuredOutput": "不支持",
    "systemPromptSeparator": "\n\n"
  },
  
  "supportedModels": [
    {
      "type": "LLM",
      "models": [
        {
          "name": "deepseek-ai/DeepSeek-V3",
          "displayName": "DeepSeek V3",
          "config": {
            "maxTokens": 8192,
            "agentThought": "支持",
            "functionCalling": "支持",
            "structuredOutput": "支持"
          }
        },
        {
          "name": "Qwen/Qwen2.5-72B-Instruct",
          "displayName": null
        }
      ]
    }
  ],
  
  "activeModels": {
    "LLM": {
      "selectedModels": ["deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
      "preferredModel": "deepseek-ai/DeepSeek-V3"
    }
  }
}
```

### 2.3 ModelConfigModal 状态（独立模型配置）

```json
{
  "modalState": {
    "visible": true,
    "mode": "edit | rename",
    "isLoading": false
  },
  
  "targetModel": {
    "providerId": "provider_1757272412113_lcna8g",
    "modelType": "LLM",
    "modelName": "deepseek-ai/DeepSeek-V3"
  },
  
  "modelConfig": {
    "displayName": "DeepSeek V3",
    "config": {
      "timeout": 30000,
      "maxRetries": 3,
      "contextLength": 4096,
      "maxTokens": 8192,
      "completionMode": "对话",
      "agentThought": "支持",
      "functionCalling": "支持",
      "structuredOutput": "支持",
      "systemPromptSeparator": "\n\n"
    },
    "useProviderDefault": {
      "timeout": true,
      "maxRetries": true,
      "contextLength": true,
      "maxTokens": false,
      "completionMode": true,
      "agentThought": false,
      "functionCalling": false,
      "structuredOutput": false,
      "systemPromptSeparator": true
    }
  }
}
```

### 2.4 右键菜单状态

```json
{
  "contextMenu": {
    "visible": true,
    "position": {"x": 450, "y": 300},
    "targetModel": {
      "providerId": "provider_1757272412113_lcna8g",
      "modelType": "LLM",
      "modelName": "deepseek-ai/DeepSeek-V3"
    },
    "actions": [
      {
        "id": "rename",
        "label": "重命名",
        "icon": "edit",
        "action": "openRenameDialog"
      },
      {
        "id": "configure",
        "label": "配置模型",
        "icon": "settings",
        "action": "openModelConfigModal"
      },
      {
        "id": "delete",
        "label": "删除模型",
        "icon": "delete",
        "color": "negative",
        "action": "deleteModel"
      }
    ]
  },
  
  "renameDialog": {
    "visible": true,
    "targetModel": {
      "providerId": "provider_1757272412113_lcna8g",
      "modelType": "LLM",
      "modelName": "deepseek-ai/DeepSeek-V3",
      "currentDisplayName": "DeepSeek V3"
    },
    "newDisplayName": "DeepSeek V3"
  }
}
```

## 三、组件设计

### 3.1 新增组件

```
Settings.LlmConfig.AddProviderWizard.vue
├── Step 1: Settings.LlmConfig.AddProviderWizard.BasicInfo.vue
├── Step 2: Settings.LlmConfig.AddProviderWizard.TestConnection.vue
├── Step 3: Settings.LlmConfig.AddProviderWizard.ModelSelection.vue
├── Step 4: Settings.LlmConfig.AddProviderWizard.AdvancedConfig.vue
└── Step 5: Settings.LlmConfig.AddProviderWizard.Complete.vue

Settings.LlmConfig.ModelConfigModal.vue
├── Tab 1: 基本信息（显示名称）
├── Tab 2: 高级配置
└── Tab 3: 继承设置（从provider继承哪些配置）
```

### 3.2 修改的组件

```
Settings.LlmConfig.ProviderCard.vue
├── 右键菜单（已有，需扩展）
└── 重命名对话框（已有，需确保与ModelConfigModal联动）

Settings.LlmConfig.AddProviderModal.vue
└── 改造为向导式流程或保持快捷添加+调用新向导
```

## 四、Store 方法扩展

### 4.1 settings.llm.store.ts 新增方法

```typescript
// 连接测试与模型发现
async function testProviderConnection(config: {
  baseUrl: string;
  apiKey: string;
}): Promise<{
  success: boolean;
  discoveredModels?: DiscoveredModel[];
  error?: string;
}>

// 模型配置管理
async function setModelDisplayName(
  providerId: string,
  modelType: string,
  modelName: string,
  displayName: string
): Promise<boolean>

async function setModelConfig(
  providerId: string,
  modelType: string,
  modelName: string,
  config: Partial<ModelConfig>
): Promise<boolean>

function getModelConfig(
  providerId: string,
  modelType: string,
  modelName: string
): ModelConfig | null

// 获取模型的最终配置（考虑继承）
function getEffectiveModelConfig(
  providerId: string,
  modelType: string,
  modelName: string
): ModelConfig
```

## 五、交互流程细节

### 5.1 添加提供商完整流程

```
Step 1: 基础信息
┌─────────────────────────────────────┐
│ 名称: siliconflow                   │
│ 显示名称: 硅基流动                  │
│ API Key: sk-xxxxx                   │
│ Base URL: https://api.siliconflow.cn/v1 │
│                                     │
│ [快捷选择: OpenAI | Anthropic | Google] │
│                                     │
│              [下一步 →]              │
└─────────────────────────────────────┘

Step 2: 测试连接
┌─────────────────────────────────────┐
│ 正在测试连接...                     │
│ ● 验证 API Key                      │
│ ● 检测可用模型                      │
│                                     │
│ [进度条动画]                         │
│                                     │
│ [← 上一步]        [重新测试]        │
└─────────────────────────────────────┘

Step 2.1: 测试成功
┌─────────────────────────────────────┐
│ ✓ 连接成功！                        │
│                                     │
│ 发现 85 个可用模型：                 │
│ • LLM: 78 个                        │
│ • TEXT_EMBEDDING: 5 个              │
│ • TEXT_TO_SPEECH: 2 个              │
│                                     │
│ [← 上一步]        [下一步 →]        │
└─────────────────────────────────────┘

Step 3: 选择模型
┌─────────────────────────────────────┐
│ 请选择要启用的模型：                 │
│                                     │
│ LLM (78个可用)                      │
│ ☑ deepseek-ai/DeepSeek-V3          │
│ ☑ Qwen/Qwen2.5-72B-Instruct        │
│ ☐ Qwen/Qwen2.5-7B-Instruct         │
│ ... [展开更多]                       │
│                                     │
│ TEXT_EMBEDDING (5个可用)            │
│ ☑ BAAI/bge-m3                      │
│ ☐ Qwen/Qwen3-Embedding-8B          │
│ ... [展开更多]                       │
│                                     │
│ [全选] [清空] [搜索: ___________]    │
│                                     │
│ [← 上一步]        [下一步 →]        │
└─────────────────────────────────────┘

Step 4: 高级配置（提供商级默认）
┌─────────────────────────────────────┐
│ 提供商默认配置（所有模型继承）       │
│                                     │
│ 基础设置                             │
│ • 超时时间: [30000] ms              │
│ • 最大重试: [3] 次                   │
│                                     │
│ 模型能力                             │
│ • 上下文长度: [4096] tokens          │
│ • 最大输出: [4096] tokens            │
│ • 完成模式: [对话 ▼]                 │
│                                     │
│ 高级能力                             │
│ • Agent思维: [不支持 ▼]             │
│ • 函数调用: [不支持 ▼]               │
│ • 结构化输出: [不支持 ▼]             │
│ • 系统提示分隔符: [________]         │
│                                     │
│ 💡 提示：这些配置将作为所有模型的默认值，│
│    您可以稍后为单个模型自定义配置。     │
│                                     │
│ [← 上一步] [跳过并使用默认] [完成 ✓] │
└─────────────────────────────────────┘

Step 5: 完成
┌─────────────────────────────────────┐
│ ✓ 提供商添加成功！                   │
│                                     │
│ 硅基流动                             │
│ • 已启用 3 个模型                    │
│ • 状态: 活跃                         │
│                                     │
│ 后续操作：                           │
│ • 在"提供商列表"中管理模型           │
│ • 在"活动模型"中设置首选模型         │
│ • 右键单个模型进行独立配置           │
│                                     │
│              [关闭]                  │
└─────────────────────────────────────┘
```

### 5.2 模型配置流程

```
右键菜单 → 选择"配置模型"
┌─────────────────────────────────────┐
│ 配置模型: DeepSeek V3               │
│ (deepseek-ai/DeepSeek-V3)          │
│                                     │
│ [基本信息] [高级配置] [继承设置]     │
│                                     │
│ === 基本信息 ===                     │
│ 显示名称: [DeepSeek V3_________]    │
│ 模型标识: deepseek-ai/DeepSeek-V3   │
│ 提供商: 硅基流动                     │
│ 类型: LLM                           │
│                                     │
│ === 高级配置 ===                     │
│ ☐ 使用提供商默认                     │
│                                     │
│ • 上下文长度: [4096] ⚙️ (继承)       │
│ • 最大输出: [8192] ✏️ (自定义)        │
│ • Agent思维: [支持 ▼] ✏️ (自定义)    │
│ • 函数调用: [支持 ▼] ✏️ (自定义)      │
│ • 结构化输出: [支持 ▼] ✏️ (自定义)    │
│                                     │
│ === 继承设置 ===                     │
│ [表格显示哪些配置继承，哪些自定义]    │
│                                     │
│ [取消]            [保存]             │
└─────────────────────────────────────┘

右键菜单 → 选择"重命名"
┌─────────────────────────────────────┐
│ 重命名模型                           │
│                                     │
│ 模型: deepseek-ai/DeepSeek-V3       │
│                                     │
│ 当前显示名称: DeepSeek V3           │
│ 新显示名称: [DeepSeek V3_________]  │
│                                     │
│ 💡 提示：重命名只影响显示，不影响      │
│    模型的实际调用名称。               │
│                                     │
│ [取消]            [确认]             │
└─────────────────────────────────────┘
```

## 六、联动关系

### 6.1 重命名联动

```
触发点 A: 右键菜单 → 重命名
触发点 B: ModelConfigModal → 基本信息 Tab → 显示名称

效果：
- 任一处修改 displayName
- 立即同步到 provider.supportedModels[].models[].displayName
- 所有显示该模型的地方实时更新
```

### 6.2 配置继承联动

```
继承逻辑：
model.config[key] 存在 → 使用 model.config[key]
model.config[key] 不存在 → 使用 provider.defaultConfig[key]

示例：
{
  "provider.defaultConfig.maxTokens": 4096,
  "model.config.maxTokens": 8192
}
→ 实际使用: 8192

{
  "provider.defaultConfig.maxTokens": 4096,
  "model.config.maxTokens": undefined
}
→ 实际使用: 4096
```

## 七、Mock数据更新

### 7.1 llm-provider/service.ts 新增方法

```typescript
// Mock: 测试连接并返回可用模型
export async function testConnection(
  baseUrl: string,
  apiKey: string
): Promise<DiscoveredModel[]>

// Mock: 获取模型详细配置
export async function fetchModelDetails(
  providerId: string,
  modelName: string
): Promise<ModelDetail>
```

### 7.2 types.ts 新增类型

```typescript
export interface DiscoveredModel {
  type: ModelType;
  models: {
    name: string;
    isAvailable: boolean;
  }[];
}

export interface ModelDetail extends SupportedModel {
  displayName?: string;
  config?: Partial<ModelConfig>;
}
```