/**
 * 路径配置管理器
 * 
 * 这个文件是整个路径配置系统的核心管理器
 * 负责加载、管理和导出所有业务模块的路径配置
 */

import type { 
  BusinessConfig, 
  AliasConfig, 
  ConfigManagerOptions 
} from './types';

// 导入所有业务配置文件
// 注意：当您创建新的业务配置文件时，需要在这里导入
// import { exampleBusinessConfig } from './example.config';
// import { novelConfig } from './novel.config';
// import { editorConfig } from './editor.config';

/**
 * 配置管理器类
 * 
 * 采用单例模式，确保整个应用中只有一个配置管理器实例
 * 负责统一管理所有业务模块的路径配置
 */
export class PathConfigManager {
  private static instance: PathConfigManager;
  private configs: Map<string, BusinessConfig> = new Map();
  private options: ConfigManagerOptions;

  /**
   * 私有构造函数，防止外部直接实例化
   */
  private constructor(options: ConfigManagerOptions = {}) {
    this.options = {
      debug: false,
      autoGenerateTSPaths: true,
      ...options
    };
    this.loadConfigs();
  }

  /**
   * 获取单例实例
   * @param options 配置选项
   * @returns PathConfigManager实例
   */
  public static getInstance(options?: ConfigManagerOptions): PathConfigManager {
    if (!PathConfigManager.instance) {
      PathConfigManager.instance = new PathConfigManager(options);
    }
    return PathConfigManager.instance;
  }

  /**
   * 加载所有业务配置
   * 
   * 在这个方法中注册所有的业务配置
   * 当您添加新的业务配置文件时，需要在这里注册
   */
  private loadConfigs(): void {
    // 这里注册所有业务配置
    // 示例：
    // this.registerConfig(exampleBusinessConfig);
    // this.registerConfig(novelConfig);
    // this.registerConfig(editorConfig);

    if (this.options.debug) {
      console.log('已加载的业务配置:', Array.from(this.configs.keys()));
    }
  }

  /**
   * 注册单个业务配置
   * @param config 业务配置对象
   */
  private registerConfig(config: BusinessConfig): void {
    if (this.configs.has(config.name)) {
      console.warn(`业务配置 "${config.name}" 已存在，将被覆盖`);
    }
    this.configs.set(config.name, config);
  }

  /**
   * 获取所有业务别名配置
   * 用于生成Vite构建配置
   * @returns 所有业务的别名配置数组
   */
  public getAllAliases(): AliasConfig[] {
    const aliases: AliasConfig[] = [];
    this.configs.forEach(config => {
      if (config.alias && config.alias.length > 0) {
        aliases.push(...config.alias);
      }
    });
    return aliases;
  }

  /**
   * 获取特定业务的配置
   * @param businessName 业务名称
   * @returns 业务配置对象或undefined
   */
  public getBusinessConfig(businessName: string): BusinessConfig | undefined {
    return this.configs.get(businessName);
  }

  /**
   * 获取所有业务配置
   * @returns 所有业务配置数组
   */
  public getAllConfigs(): BusinessConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * 生成Vite别名配置
   * 这个方法的返回值可以直接用于quasar.config.ts中的Vite配置
   * @returns Vite别名配置数组
   */
  public generateViteAliases(): Array<{ find: string; replacement: string }> {
    return this.getAllAliases().map(alias => ({
      find: alias.find,
      replacement: alias.replacement
    }));
  }

  /**
   * 生成TypeScript路径配置
   * 这个方法的返回值可以用于tsconfig.json中的paths配置
   * @returns TypeScript路径配置对象
   */
  public generateTSPaths(): Record<string, string[]> {
    const paths: Record<string, string[]> = {};
    
    this.getAllAliases().forEach(alias => {
      // 将绝对路径转换为相对于项目根目录的路径
      const relativePath = this.convertToRelativePath(alias.replacement);
      
      // 添加基础路径
      paths[alias.find] = [relativePath];
      
      // 添加通配符路径（用于子路径导入）
      paths[`${alias.find}/*`] = [`${relativePath}/*`];
    });

    return paths;
  }

  /**
   * 将绝对路径转换为相对路径
   * @param absolutePath 绝对路径
   * @returns 相对路径
   */
  private convertToRelativePath(absolutePath: string): string {
    // 这里可以根据实际需要实现路径转换逻辑
    // 简单实现：假设所有路径都是相对于项目根目录
    if (this.options.customPathResolver) {
      return this.options.customPathResolver(absolutePath);
    }
    
    // 默认处理：移除项目根路径前缀
    const projectRoot = process.cwd();
    if (absolutePath.startsWith(projectRoot)) {
      return absolutePath.replace(projectRoot + '/', '').replace(/\\/g, '/');
    }
    
    return absolutePath;
  }

  /**
   * 获取配置统计信息
   * @returns 配置统计对象
   */
  public getStats(): {
    totalBusinesses: number;
    totalAliases: number;
    businessNames: string[];
  } {
    return {
      totalBusinesses: this.configs.size,
      totalAliases: this.getAllAliases().length,
      businessNames: Array.from(this.configs.keys())
    };
  }

  /**
   * 验证配置是否有冲突
   * @returns 验证结果
   */
  public validateConfigs(): {
    isValid: boolean;
    conflicts: string[];
    warnings: string[];
  } {
    const conflicts: string[] = [];
    const warnings: string[] = [];
    const aliasMap = new Map<string, string>();

    // 检查别名冲突
    this.configs.forEach(config => {
      config.alias.forEach(alias => {
        const existingBusiness = aliasMap.get(alias.find);
        if (existingBusiness && existingBusiness !== config.name) {
          conflicts.push(
            `别名冲突: "${alias.find}" 在业务 "${config.name}" 和 "${existingBusiness}" 中都有定义`
          );
        } else {
          aliasMap.set(alias.find, config.name);
        }
      });
    });

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    };
  }
}

// 导出单例实例和便捷函数
export const pathConfigManager = PathConfigManager.getInstance();

/**
 * 便捷导出函数
 * 这些函数可以直接在其他文件中导入使用，无需直接操作管理器实例
 */

/** 获取所有业务别名配置 */
export const getAllBusinessAliases = () => pathConfigManager.getAllAliases();

/** 获取特定业务配置 */
export const getBusinessConfig = (name: string) => pathConfigManager.getBusinessConfig(name);

/** 生成Vite别名配置 */
export const generateViteAliases = () => pathConfigManager.generateViteAliases();

/** 生成TypeScript路径配置 */
export const generateTSPaths = () => pathConfigManager.generateTSPaths();

/** 获取配置统计信息 */
export const getConfigStats = () => pathConfigManager.getStats();

/** 验证配置 */
export const validateConfigs = () => pathConfigManager.validateConfigs();
