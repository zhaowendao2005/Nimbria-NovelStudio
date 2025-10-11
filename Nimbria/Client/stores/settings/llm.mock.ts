/**
 * LLM提供商Mock数据
 * 模拟3个提供商：OpenAI、Anthropic、Custom Provider
 */

import type { ModelProvider, ActiveModelConfig } from './types';
import { DEFAULT_MODEL_CONFIG } from './types';

/**
 * Mock数据：OpenAI Provider (active状态)
 */
export const openAIProviderMock: ModelProvider = {
  id: 'openai',
  name: 'openai',
  displayName: 'OpenAI',
  description: 'Official OpenAI API provider with GPT-3.5 and GPT-4 models',
  logo: '🤖',
  status: 'active',
  apiKey: 'sk-mock-openai-key-xxxxxxxxxxxxx',
  baseUrl: 'https://api.openai.com/v1',
  defaultConfig: {
    ...DEFAULT_MODEL_CONFIG,
    contextLength: 8192,
    maxTokens: 4096,
    functionCalling: '支持',
    structuredOutput: '支持',
  },
  supportedModels: [
    {
      type: 'LLM',
      models: [
        {
          name: 'gpt-3.5-turbo',
          config: {
            contextLength: 4096,
            maxTokens: 4096,
            functionCalling: '支持',
          }
        },
        {
          name: 'gpt-3.5-turbo-16k',
          config: {
            contextLength: 16384,
            maxTokens: 16384,
            functionCalling: '支持',
          }
        },
        {
          name: 'gpt-4',
          config: {
            contextLength: 8192,
            maxTokens: 8192,
            functionCalling: '支持',
            structuredOutput: '支持',
          }
        },
        {
          name: 'gpt-4-turbo',
          config: {
            contextLength: 128000,
            maxTokens: 4096,
            functionCalling: '支持',
            structuredOutput: '支持',
          }
        },
        {
          name: 'gpt-4o',
          config: {
            contextLength: 128000,
            maxTokens: 16384,
            functionCalling: '支持',
            structuredOutput: '支持',
          }
        }
      ]
    },
    {
      type: 'TEXT_EMBEDDING',
      models: [
        {
          name: 'text-embedding-ada-002',
          config: {
            contextLength: 8191,
            maxTokens: 8191,
          }
        },
        {
          name: 'text-embedding-3-small',
          config: {
            contextLength: 8191,
            maxTokens: 8191,
          }
        },
        {
          name: 'text-embedding-3-large',
          config: {
            contextLength: 8191,
            maxTokens: 8191,
          }
        }
      ]
    }
  ],
  lastRefreshed: new Date(),
  refreshStatus: 'success',
};

/**
 * Mock数据：Anthropic Provider (inactive状态)
 */
export const anthropicProviderMock: ModelProvider = {
  id: 'anthropic',
  name: 'anthropic',
  displayName: 'Anthropic',
  description: 'Claude AI models by Anthropic with long context support',
  logo: '🧠',
  status: 'inactive',
  apiKey: 'sk-ant-mock-key-xxxxxxxxxxxxx',
  baseUrl: 'https://api.anthropic.com/v1',
  defaultConfig: {
    ...DEFAULT_MODEL_CONFIG,
    contextLength: 200000,
    maxTokens: 4096,
    functionCalling: '支持',
  },
  supportedModels: [
    {
      type: 'LLM',
      models: [
        {
          name: 'claude-3-opus-20240229',
          config: {
            contextLength: 200000,
            maxTokens: 4096,
            functionCalling: '支持',
          }
        },
        {
          name: 'claude-3-sonnet-20240229',
          config: {
            contextLength: 200000,
            maxTokens: 4096,
            functionCalling: '支持',
          }
        },
        {
          name: 'claude-3-haiku-20240307',
          config: {
            contextLength: 200000,
            maxTokens: 4096,
            functionCalling: '支持',
          }
        },
        {
          name: 'claude-3-5-sonnet-20240620',
          config: {
            contextLength: 200000,
            maxTokens: 8192,
            functionCalling: '支持',
          }
        }
      ]
    }
  ],
  lastRefreshed: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
  refreshStatus: 'idle',
};

/**
 * Mock数据：Custom Provider (available状态)
 */
export const customProviderMock: ModelProvider = {
  id: 'custom-local',
  name: 'custom-local',
  displayName: 'Local LLM Server',
  description: 'Self-hosted local LLM server with custom models',
  logo: '🏠',
  status: 'available',
  apiKey: 'local-api-key',
  baseUrl: 'http://localhost:8000/v1',
  defaultConfig: {
    ...DEFAULT_MODEL_CONFIG,
    timeout: 60000,
    contextLength: 32768,
    maxTokens: 8192,
  },
  supportedModels: [
    {
      type: 'LLM',
      models: [
        {
          name: 'llama-3-70b-instruct',
          config: {
            contextLength: 32768,
            maxTokens: 8192,
            agentThought: '支持',
          }
        },
        {
          name: 'qwen-2.5-72b-instruct',
          config: {
            contextLength: 32768,
            maxTokens: 8192,
            functionCalling: '支持',
          }
        },
        {
          name: 'mistral-large-2',
          config: {
            contextLength: 131072,
            maxTokens: 8192,
            functionCalling: '支持',
          }
        }
      ]
    },
    {
      type: 'TEXT_EMBEDDING',
      models: [
        {
          name: 'bge-large-zh-v1.5',
          config: {
            contextLength: 512,
            maxTokens: 512,
          }
        }
      ]
    }
  ],
  lastRefreshed: undefined,
  refreshStatus: 'idle',
};

/**
 * 所有Mock Providers
 */
export const llmProvidersMock: ModelProvider[] = [
  openAIProviderMock,
  anthropicProviderMock,
  customProviderMock,
];

/**
 * Mock数据：活动模型配置
 */
export const activeModelsMock: ActiveModelConfig = {
  'LLM': 'openai.gpt-4o',
  'TEXT_EMBEDDING': 'openai.text-embedding-3-large',
};

