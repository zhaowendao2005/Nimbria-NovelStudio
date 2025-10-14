<!-- d884f308-c947-4fff-9e89-3fc60358955f b82509a4-ed34-45e8-a8e0-6e1f50d661b2 -->
# LLM配置系统Electron实装计划

## 一、文件架构修改树

```
Nimbria/
├── src-electron/
│   ├── services/llm-service/              [新增目录]
│   │   ├── llm-config-manager.ts          [新增] YAML配置文件管理 + 文件监听
│   │   ├── llm-api-client.ts              [新增] OpenAI SDK封装
│   │   ├── llm-broadcast-service.ts       [新增] 多窗口事件广播服务
│   │   └── types.ts                       [新增] 服务层类型定义
│   │
│   ├── ipc/main-renderer/
│   │   └── llm-handlers.ts                [新增] LLM相关IPC处理器 + 广播集成
│   │
│   ├── types/
│   │   └── ipc.ts                         [修改] 添加17个LLM通道定义
│   │
│   ├── core/
│   │   ├── main-preload.ts                [修改] 暴露window.nimbria.llm API
│   │   └── app-manager.ts                 [修改] 注册LLM handlers + 广播服务
│   │
│   └── utils/
│       └── config-paths.ts                [新增] 配置文件路径工具
│
├── Client/
│   ├── stores/
│   │   ├── settings/
│   │   │   ├── DataSource.ts              [修改] 替换Mock为IPC调用
│   │   │   └── llm.mock.ts                [保留] 开发测试用
│   │   │
│   │   └── global/                        [新增目录]
│   │       └── global-llm.store.ts        [新增] 全局LLM信息缓存Store
│   │
│   └── Types/
│       └── window.d.ts                    [修改] 添加LLM API类型声明
│
└── package.json                            [修改] 添加依赖：openai, js-yaml, chokidar
```

## 二、核心架构设计

### 2.1 数据流架构

```
GUI组件 (Settings.LlmConfig.vue)
    ↓ 调用Store方法
Store层 (settings.llm.store.ts)
    ↓ 调用DataSource
DataSource层 (DataSource.ts)
    ├─ useMockSource=true → llm.mock.ts
    └─ useMockSource=false → window.nimbria.llm.* (IPC)
        ↓
    Electron IPC (llm-handlers.ts)
        ↓
    LlmConfigManager (YAML读写)
    LlmApiClient (OpenAI SDK)
        ↓
    用户数据目录/llm-config/
    ├─ providers.yaml
    └─ active-models.yaml (废弃，数据合并到providers)
```

### 2.2 配置文件结构

**providers.yaml**:

```yaml
providers:
  - id: "openai-1234567890"
    name: "openai"
    displayName: "OpenAI"
    description: "OpenAI官方API"
    status: "active"
    apiKey: "sk-xxxxxx"
    baseUrl: "https://api.openai.com/v1"
    defaultConfig:
      timeout: 30000
      maxRetries: 3
      contextLength: 4096
      maxTokens: 4096
      completionMode: "对话"
      agentThought: "不支持"
      functionCalling: "不支持"
      structuredOutput: "不支持"
      systemPromptSeparator: "\n\n"
    supportedModels:
      - type: "LLM"
        models:
          - name: "gpt-4o"
            config: null
          - name: "gpt-3.5-turbo"
            config: null
      - type: "TEXT_EMBEDDING"
        models:
          - name: "text-embedding-3-large"
            config: null
    activeModels:
      LLM: "gpt-4o"
      TEXT_EMBEDDING: "text-embedding-3-large"
    lastRefreshed: "2025-10-14T12:00:00Z"
    refreshStatus: "success"
```

## 三、关键代码实现

### 3.1 LlmConfigManager (YAML配置管理)

**文件**: `src-electron/services/llm-service/llm-config-manager.ts`

```typescript
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { app } from 'electron';
import type { ModelProvider } from './types';

export class LlmConfigManager {
  private configDir: string;
  private providersPath: string;
  
  constructor() {
    this.configDir = path.join(app.getPath('userData'), 'llm-config');
    this.providersPath = path.join(this.configDir, 'providers.yaml');
    this.ensureConfigDir();
  }
  
  private ensureConfigDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }
  
  async loadProviders(): Promise<ModelProvider[]> {
    if (!fs.existsSync(this.providersPath)) {
      return [];
    }
    const content = await fs.readFile(this.providersPath, 'utf8');
    const data = yaml.load(content) as { providers: ModelProvider[] };
    return data.providers || [];
  }
  
  async saveProviders(providers: ModelProvider[]): Promise<void> {
    const data = { providers };
    const content = yaml.dump(data, { lineWidth: -1 });
    await fs.writeFile(this.providersPath, content, 'utf8');
  }
  
  async addProvider(provider: ModelProvider): Promise<ModelProvider> {
    const providers = await this.loadProviders();
    providers.push(provider);
    await this.saveProviders(providers);
    return provider;
  }
  
  async updateProvider(providerId: string, updates: Partial<ModelProvider>): Promise<ModelProvider> {
    const providers = await this.loadProviders();
    const index = providers.findIndex(p => p.id === providerId);
    if (index === -1) throw new Error('Provider not found');
    providers[index] = { ...providers[index], ...updates };
    await this.saveProviders(providers);
    return providers[index];
  }
  
  async removeProvider(providerId: string): Promise<void> {
    const providers = await this.loadProviders();
    const filtered = providers.filter(p => p.id !== providerId);
    await this.saveProviders(filtered);
  }
  
  async getProvider(providerId: string): Promise<ModelProvider | null> {
    const providers = await this.loadProviders();
    return providers.find(p => p.id === providerId) || null;
  }
}
```

### 3.2 LlmApiClient (OpenAI SDK封装)

**文件**: `src-electron/services/llm-service/llm-api-client.ts`

```typescript
import OpenAI from 'openai';
import type { DiscoveredModel, ModelType } from './types';

export class LlmApiClient {
  private client: OpenAI;
  
  constructor(config: { apiKey: string; baseURL: string; timeout?: number }) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      maxRetries: 3
    });
  }
  
  async testConnection(): Promise<{ success: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    try {
      await this.client.models.list();
      return { success: true, latency: Date.now() - startTime };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  async discoverModels(): Promise<DiscoveredModel[]> {
    const response = await this.client.models.list();
    const modelNames = response.data.map(m => m.id);
    return this.categorizeModels(modelNames);
  }
  
  private categorizeModels(modelNames: string[]): DiscoveredModel[] {
    const categories: Record<ModelType, string[]> = {
      'LLM': [],
      'TEXT_EMBEDDING': [],
      'IMAGE_GENERATION': [],
      'SPEECH_TO_TEXT': [],
      'TEXT_TO_SPEECH': [],
      'RERANK': [],
      'SPEECH2TEXT': [],
      'TTS': []
    };
    
    for (const name of modelNames) {
      if (name.includes('embedding')) {
        categories['TEXT_EMBEDDING'].push(name);
      } else if (name.includes('whisper')) {
        categories['SPEECH_TO_TEXT'].push(name);
      } else if (name.includes('tts')) {
        categories['TEXT_TO_SPEECH'].push(name);
      } else if (name.includes('dall-e') || name.includes('dalle')) {
        categories['IMAGE_GENERATION'].push(name);
      } else {
        categories['LLM'].push(name);
      }
    }
    
    return Object.entries(categories)
      .filter(([_, models]) => models.length > 0)
      .map(([type, models]) => ({
        type: type as ModelType,
        models: models.map(name => ({ name, isAvailable: true }))
      }));
  }
}
```

### 3.3 IPC通道定义

**文件**: `src-electron/types/ipc.ts` (添加部分)

```typescript
export interface IPCChannelMap {
  // ... 现有通道
  
  // LLM配置管理
  'llm:get-providers': {
    request: void
    response: { success: boolean; providers?: ModelProvider[]; error?: string }
  }
  'llm:add-provider': {
    request: { provider: Omit<ModelProvider, 'id' | 'lastRefreshed' | 'refreshStatus'> }
    response: { success: boolean; provider?: ModelProvider; error?: string }
  }
  'llm:remove-provider': {
    request: { providerId: string }
    response: { success: boolean; error?: string }
  }
  'llm:update-provider-config': {
    request: { providerId: string; config: Partial<ModelProvider> }
    response: { success: boolean; provider?: ModelProvider; error?: string }
  }
  'llm:activate-provider': {
    request: { providerId: string }
    response: { success: boolean; provider?: ModelProvider; error?: string }
  }
  'llm:deactivate-provider': {
    request: { providerId: string }
    response: { success: boolean; provider?: ModelProvider; error?: string }
  }
  'llm:refresh-models': {
    request: { providerId: string }
    response: { success: boolean; providerId?: string; modelsCount?: number; duration?: number; error?: string }
  }
  'llm:test-connection': {
    request: { providerId: string }
    response: { success: boolean; message?: string; error?: string }
  }
  'llm:test-new-connection': {
    request: { baseUrl: string; apiKey: string }
    response: { success: boolean; discoveredModels?: DiscoveredModel[]; modelsCount?: number; error?: string }
  }
  'llm:validate-provider': {
    request: { config: Partial<ModelProvider> }
    response: { isValid: boolean; errors?: string[]; warnings?: string[] }
  }
  'llm:update-model-config': {
    request: { providerId: string; modelType: string; modelName: string; config: Partial<ModelConfig> }
    response: { success: boolean; error?: string }
  }
  'llm:set-model-display-name': {
    request: { providerId: string; modelName: string; displayName: string }
    response: { success: boolean; error?: string }
  }
  'llm:toggle-model-selection': {
    request: { providerId: string; modelType: string; modelName: string }
    response: { success: boolean; error?: string }
  }
  'llm:set-preferred-model': {
    request: { providerId: string; modelType: string; modelName: string }
    response: { success: boolean; error?: string }
  }
}
```

### 3.4 IPC Handlers实现

**文件**: `src-electron/ipc/main-renderer/llm-handlers.ts`

```typescript
import { ipcMain } from 'electron';
import { LlmConfigManager } from '../../services/llm-service/llm-config-manager';
import { LlmApiClient } from '../../services/llm-service/llm-api-client';
import { getLogger } from '../../utils/shared/logger';
import { nanoid } from 'nanoid';

const logger = getLogger('LlmHandlers');

export function registerLlmHandlers(deps: { llmConfigManager: LlmConfigManager }) {
  
  // 获取所有提供商
  ipcMain.handle('llm:get-providers', async () => {
    try {
      const providers = await deps.llmConfigManager.loadProviders();
      return { success: true, providers };
    } catch (error: any) {
      logger.error('Get providers failed:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 添加提供商
  ipcMain.handle('llm:add-provider', async (event, request) => {
    try {
      const newProvider = {
        ...request.provider,
        id: nanoid(),
        lastRefreshed: new Date(),
        refreshStatus: 'idle' as const
      };
      const provider = await deps.llmConfigManager.addProvider(newProvider);
      return { success: true, provider };
    } catch (error: any) {
      logger.error('Add provider failed:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 删除提供商
  ipcMain.handle('llm:remove-provider', async (event, request) => {
    try {
      await deps.llmConfigManager.removeProvider(request.providerId);
      return { success: true };
    } catch (error: any) {
      logger.error('Remove provider failed:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 测试新连接并发现模型
  ipcMain.handle('llm:test-new-connection', async (event, request) => {
    try {
      const client = new LlmApiClient({
        apiKey: request.apiKey,
        baseURL: request.baseUrl
      });
      
      const connectionResult = await client.testConnection();
      if (!connectionResult.success) {
        return { success: false, error: connectionResult.error };
      }
      
      const discoveredModels = await client.discoverModels();
      const modelsCount = discoveredModels.reduce((sum, g) => sum + g.models.length, 0);
      
      return { success: true, discoveredModels, modelsCount };
    } catch (error: any) {
      logger.error('Test new connection failed:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 刷新提供商模型
  ipcMain.handle('llm:refresh-models', async (event, request) => {
    try {
      const provider = await deps.llmConfigManager.getProvider(request.providerId);
      if (!provider) {
        return { success: false, error: 'Provider not found' };
      }
      
      const client = new LlmApiClient({
        apiKey: provider.apiKey!,
        baseURL: provider.baseUrl!
      });
      
      const startTime = Date.now();
      const discoveredModels = await client.discoverModels();
      const duration = Date.now() - startTime;
      
      await deps.llmConfigManager.updateProvider(request.providerId, {
        supportedModels: discoveredModels,
        lastRefreshed: new Date(),
        refreshStatus: 'success'
      });
      
      const modelsCount = discoveredModels.reduce((sum, g) => sum + g.models.length, 0);
      
      return { success: true, providerId: request.providerId, modelsCount, duration };
    } catch (error: any) {
      logger.error('Refresh models failed:', error);
      await deps.llmConfigManager.updateProvider(request.providerId, {
        refreshStatus: 'error'
      });
      return { success: false, error: error.message };
    }
  });
  
  // TODO: 实现其他9个handlers
  // - llm:update-provider-config
  // - llm:activate-provider
  // - llm:deactivate-provider
  // - llm:test-connection
  // - llm:validate-provider
  // - llm:update-model-config
  // - llm:set-model-display-name
  // - llm:toggle-model-selection
  // - llm:set-preferred-model
}
```

### 3.5 Preload API暴露

**文件**: `src-electron/core/main-preload.ts` (添加部分)

```typescript
contextBridge.exposeInMainWorld('nimbria', {
  // ... 现有API
  
  llm: {
    getProviders: () => channelInvoke('llm:get-providers', undefined),
    addProvider: (provider: any) => channelInvoke('llm:add-provider', { provider }),
    removeProvider: (providerId: string) => channelInvoke('llm:remove-provider', { providerId }),
    updateProviderConfig: (providerId: string, config: any) => 
      channelInvoke('llm:update-provider-config', { providerId, config }),
    activateProvider: (providerId: string) => channelInvoke('llm:activate-provider', { providerId }),
    deactivateProvider: (providerId: string) => channelInvoke('llm:deactivate-provider', { providerId }),
    refreshModels: (providerId: string) => channelInvoke('llm:refresh-models', { providerId }),
    testConnection: (providerId: string) => channelInvoke('llm:test-connection', { providerId }),
    testNewConnection: (baseUrl: string, apiKey: string) => 
      channelInvoke('llm:test-new-connection', { baseUrl, apiKey }),
    validateProvider: (config: any) => channelInvoke('llm:validate-provider', { config }),
    updateModelConfig: (providerId: string, modelType: string, modelName: string, config: any) =>
      channelInvoke('llm:update-model-config', { providerId, modelType, modelName, config }),
    setModelDisplayName: (providerId: string, modelName: string, displayName: string) =>
      channelInvoke('llm:set-model-display-name', { providerId, modelName, displayName }),
    toggleModelSelection: (providerId: string, modelType: string, modelName: string) =>
      channelInvoke('llm:toggle-model-selection', { providerId, modelType, modelName }),
    setPreferredModel: (providerId: string, modelType: string, modelName: string) =>
      channelInvoke('llm:set-preferred-model', { providerId, modelType, modelName })
  }
})
```

### 3.6 DataSource层IPC调用

**文件**: `Client/stores/settings/DataSource.ts` (修改示例)

```typescript
// 配置数据源开关
const useMockSource = ref(true); // 开发时true，生产时false

export async function fetchProviders(): Promise<ModelProvider[]> {
  if (useMockSource.value) {
    await simulateDelay();
    return JSON.parse(JSON.stringify(llmProvidersMock));
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.getProviders();
  if (!response.success) {
    throw new Error(response.error || '获取提供商失败');
  }
  return response.providers || [];
}

export async function addProvider(provider: Omit<ModelProvider, 'id'> & { id?: string }): Promise<ModelProvider> {
  if (useMockSource.value) {
    await simulateDelay();
    const newProvider: ModelProvider = {
      ...provider,
      id: provider.id || `provider-${Date.now()}`,
      lastRefreshed: new Date(),
      refreshStatus: 'idle',
    } as ModelProvider;
    llmProvidersMock.push(newProvider);
    return newProvider;
  }
  
  // 真实IPC调用
  const response = await window.nimbria.llm.addProvider(provider);
  if (!response.success) {
    throw new Error(response.error || '添加提供商失败');
  }
  return response.provider!;
}

// TODO: 更新其他13个方法的实现
```

## 四、实施步骤

### Phase 1: 基础设施搭建 (3-4小时)

- 安装依赖: `npm install openai js-yaml @types/js-yaml`
- 创建服务层目录结构
- 实现LlmConfigManager（YAML读写）
- 实现LlmApiClient（OpenAI SDK封装）
- 实现服务层类型定义

### Phase 2: IPC通道创建 (3-4小时)

- 在ipc.ts中定义15个LLM通道类型
- 实现llm-handlers.ts（15个handler）
- 在main-preload.ts中暴露window.nimbria.llm API
- 在app-manager.ts中注册LLM handlers

### Phase 3: DataSource层对接 (2-3小时)

- 修改DataSource.ts的15个方法，添加IPC调用
- 保留Mock模式，通过useMockSource切换
- 测试IPC通道通信
- 错误处理完善

### Phase 4: 集成测试 (2-3小时)

- 测试提供商增删改查
- 测试连接测试和模型发现
- 测试模型刷新功能
- 测试配置持久化
- 性能优化

## 五、TODO清单

### 服务层实现

- [ ] 创建services/llm-service目录
- [ ] 实现LlmConfigManager类（YAML配置管理）
- [ ] 实现LlmApiClient类（OpenAI SDK封装）
- [ ] 创建服务层类型定义文件
- [ ] 添加日志记录

### IPC层实现

- [ ] 在ipc.ts中添加15个LLM通道定义
- [ ] 创建llm-handlers.ts文件
- [ ] 实现15个IPC handler
- [ ] 在main-preload.ts暴露llm API
- [ ] 在app-manager.ts注册handlers

### 前端对接

- [ ] 修改DataSource.ts的fetchProviders方法
- [ ] 修改DataSource.ts的addProvider方法
- [ ] 修改DataSource.ts的removeProvider方法
- [ ] 修改DataSource.ts的updateProviderConfig方法
- [ ] 修改DataSource.ts的其他11个方法
- [ ] 保留llm.mock.ts用于开发
- [ ] 添加类型声明到window.d.ts

### 测试验证

- [ ] 测试配置文件读写
- [ ] 测试OpenAI API连接
- [ ] 测试本地模型（Ollama/LM Studio）连接
- [ ] 测试模型发现功能
- [ ] 测试前后端联调
- [ ] 压力测试和性能优化

### 文档更新

- [ ] 更新LLM配置系统设计文档
- [ ] 添加Electron实装总结文档
- [ ] 更新已实现功能清单

## 六、关键注意事项

1. **配置文件位置**: 使用`app.getPath('userData')/llm-config/`
2. **不加密存储**: API Key明文存储在YAML中
3. **保留Mock**: 通过`useMockSource`切换，便于开发测试
4. **只支持OpenAI格式**: 不添加Azure等特殊配置字段
5. **错误处理**: 所有IPC调用需要try-catch和统一错误格式
6. **日志记录**: 使用现有logger系统记录关键操作
7. **类型安全**: 确保前后端类型定义一致

## 七、预估工作量

- **代码行数**: 约1400行（新增~1200行 + 修改~200行）
- **新增文件**: 5个
- **修改文件**: 4个
- **总工时**: 10-14小时

### To-dos

- [ ] Phase 1: 基础设施 - 创建服务层，实现配置管理和API客户端
- [ ] Phase 2: IPC通道 - 定义类型，实现handlers，暴露API
- [ ] Phase 3: DataSource对接 - 替换Mock为IPC调用
- [ ] Phase 4: 集成测试 - 功能测试、性能优化、文档更新