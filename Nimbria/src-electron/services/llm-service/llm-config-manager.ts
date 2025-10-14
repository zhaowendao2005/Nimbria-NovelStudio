/**
 * LLM配置管理器
 * 负责YAML配置文件的读写和管理
 */

import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { app } from 'electron';
import type { ModelProvider, ProvidersYamlData } from './types';
import { getLogger } from '../../utils/shared/logger';

const logger = getLogger('LlmConfigManager');

export class LlmConfigManager {
  private configDir: string;
  private providersPath: string;
  
  constructor() {
    this.configDir = path.join(app.getPath('userData'), 'llm-config');
    this.providersPath = path.join(this.configDir, 'providers.yaml');
    this.ensureConfigDir();
  }
  
  /**
   * 确保配置目录存在
   */
  private ensureConfigDir(): void {
    try {
      if (!existsSync(this.configDir)) {
        mkdirSync(this.configDir, { recursive: true });
        logger.info(`Created LLM config directory: ${this.configDir}`);
      }
    } catch (error) {
      logger.error('Failed to create config directory:', error);
      throw error;
    }
  }
  
  /**
   * 加载所有提供商
   */
  async loadProviders(): Promise<ModelProvider[]> {
    try {
      if (!existsSync(this.providersPath)) {
        logger.info('Providers file not found, returning empty array');
        return [];
      }
      
      const content = await readFile(this.providersPath, 'utf8');
      const data = yaml.load(content) as ProvidersYamlData;
      
      if (!data || !Array.isArray(data.providers)) {
        logger.warn('Invalid providers data structure, returning empty array');
        return [];
      }
      
      // 转换Date字段
      const providers = data.providers.map(provider => {
        const result: ModelProvider = {
          ...provider,
        };
        if (provider.lastRefreshed) {
          result.lastRefreshed = new Date(provider.lastRefreshed);
        }
        return result;
      });
      
      logger.info(`Loaded ${providers.length} providers from config file`);
      return providers;
    } catch (error) {
      logger.error('Failed to load providers:', error);
      throw error;
    }
  }
  
  /**
   * 保存所有提供商
   */
  async saveProviders(providers: ModelProvider[]): Promise<void> {
    try {
      const data: ProvidersYamlData = { providers };
      const content = yaml.dump(data, { 
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });
      
      await writeFile(this.providersPath, content, 'utf8');
      logger.info(`Saved ${providers.length} providers to config file`);
    } catch (error) {
      logger.error('Failed to save providers:', error);
      throw error;
    }
  }
  
  /**
   * 添加提供商
   */
  async addProvider(provider: ModelProvider): Promise<ModelProvider> {
    try {
      const providers = await this.loadProviders();
      
      // 检查是否已存在
      const existingIndex = providers.findIndex(p => p.id === provider.id);
      if (existingIndex !== -1) {
        throw new Error(`Provider with id ${provider.id} already exists`);
      }
      
      providers.push(provider);
      await this.saveProviders(providers);
      
      logger.info(`Added provider: ${provider.name} (${provider.id})`);
      return provider;
    } catch (error) {
      logger.error('Failed to add provider:', error);
      throw error;
    }
  }
  
  /**
   * 更新提供商
   */
  async updateProvider(providerId: string, updates: Partial<ModelProvider>): Promise<ModelProvider> {
    try {
      const providers = await this.loadProviders();
      const index = providers.findIndex(p => p.id === providerId);
      
      if (index === -1) {
        throw new Error(`Provider not found: ${providerId}`);
      }
      
      // 合并更新（保持所有必需字段）
      const updatedProvider = { 
        ...providers[index], 
        ...updates,
        id: providerId // 确保ID不被修改
      } as ModelProvider;
      providers[index] = updatedProvider;
      
      await this.saveProviders(providers);
      
      logger.info(`Updated provider: ${providerId}`);
      return updatedProvider;
    } catch (error) {
      logger.error('Failed to update provider:', error);
      throw error;
    }
  }
  
  /**
   * 删除提供商
   */
  async removeProvider(providerId: string): Promise<void> {
    try {
      const providers = await this.loadProviders();
      const filtered = providers.filter(p => p.id !== providerId);
      
      if (filtered.length === providers.length) {
        throw new Error(`Provider not found: ${providerId}`);
      }
      
      await this.saveProviders(filtered);
      logger.info(`Removed provider: ${providerId}`);
    } catch (error) {
      logger.error('Failed to remove provider:', error);
      throw error;
    }
  }
  
  /**
   * 获取单个提供商
   */
  async getProvider(providerId: string): Promise<ModelProvider | null> {
    try {
      const providers = await this.loadProviders();
      const provider = providers.find(p => p.id === providerId);
      return provider || null;
    } catch (error) {
      logger.error('Failed to get provider:', error);
      throw error;
    }
  }
  
  /**
   * 获取配置目录路径
   */
  getConfigDir(): string {
    return this.configDir;
  }
  
  /**
   * 获取providers文件路径
   */
  getProvidersPath(): string {
    return this.providersPath;
  }
}


