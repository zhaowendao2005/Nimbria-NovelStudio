/**
 * LLM API客户端
 * 封装OpenAI SDK，用于连接测试和模型发现
 */

import OpenAI from 'openai';
import type { 
  DiscoveredModel, 
  ModelType, 
  ModelDetail,
  ConnectionTestResult 
} from './types';
import { getLogger } from '../../utils/shared/logger';

const logger = getLogger('LlmApiClient');

export interface LlmApiClientConfig {
  apiKey: string;
  baseURL: string;
  timeout?: number;
  maxRetries?: number;
}

export class LlmApiClient {
  private client: OpenAI;
  private config: LlmApiClientConfig;
  
  constructor(config: LlmApiClientConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      dangerouslyAllowBrowser: false
    });
  }
  
  /**
   * 测试连接
   */
  async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      logger.info('Testing connection to LLM provider...');
      
      // 尝试列出模型
      await this.client.models.list();
      
      const latency = Date.now() - startTime;
      logger.info(`Connection test successful (latency: ${latency}ms)`);
      
      return { 
        success: true, 
        latency,
        message: `连接成功 (延迟: ${latency}ms)`
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;
      logger.error('Connection test failed:', error);
      
      // 解析错误信息
      let errorMessage = '连接失败';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        errorMessage = `错误代码: ${error.code}`;
      }
      
      return { 
        success: false, 
        latency,
        error: errorMessage,
        message: errorMessage
      };
    }
  }
  
  /**
   * 发现所有可用模型
   */
  async discoverModels(): Promise<DiscoveredModel[]> {
    try {
      logger.info('Discovering models from provider...');
      
      const response = await this.client.models.list();
      const modelNames = response.data.map(m => m.id);
      
      logger.info(`Discovered ${modelNames.length} models`);
      
      return this.categorizeModels(modelNames);
    } catch (error) {
      logger.error('Failed to discover models:', error);
      throw error;
    }
  }
  
  /**
   * 将模型名称分类到不同的模型类型
   */
  private categorizeModels(modelNames: string[]): DiscoveredModel[] {
    const categories: Record<ModelType, ModelDetail[]> = {
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
      const lowerName = name.toLowerCase();
      
      // 根据模型名称特征分类
      if (lowerName.includes('embedding')) {
        categories['TEXT_EMBEDDING'].push(this.createModelDetail(name));
      } else if (lowerName.includes('whisper')) {
        categories['SPEECH_TO_TEXT'].push(this.createModelDetail(name));
        categories['SPEECH2TEXT'].push(this.createModelDetail(name));
      } else if (lowerName.includes('tts')) {
        categories['TEXT_TO_SPEECH'].push(this.createModelDetail(name));
        categories['TTS'].push(this.createModelDetail(name));
      } else if (lowerName.includes('dall-e') || lowerName.includes('dalle')) {
        categories['IMAGE_GENERATION'].push(this.createModelDetail(name));
      } else if (lowerName.includes('rerank')) {
        categories['RERANK'].push(this.createModelDetail(name));
      } else {
        // 默认归类为LLM
        categories['LLM'].push(this.createModelDetail(name));
      }
    }
    
    // 转换为DiscoveredModel数组，只保留有模型的类型
    const discoveredModels = Object.entries(categories)
      .filter(([_, models]) => models.length > 0)
      .map(([type, models]) => ({
        type: type as ModelType,
        models
      }));
    
    logger.info(`Categorized models into ${discoveredModels.length} types`);
    
    return discoveredModels;
  }
  
  /**
   * 创建模型详情对象
   */
  private createModelDetail(name: string): ModelDetail {
    return {
      name,
      isAvailable: true
    };
  }
  
  /**
   * 验证API密钥格式（基本验证）
   */
  static validateApiKey(apiKey: string): boolean {
    return apiKey && apiKey.length > 0;
  }
  
  /**
   * 验证Base URL格式
   */
  static validateBaseUrl(baseUrl: string): boolean {
    try {
      const url = new URL(baseUrl);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}


