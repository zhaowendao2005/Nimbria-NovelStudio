/**
 * 路径配置系统类型定义
 * 
 * 这个文件定义了业务配置系统中所有需要的类型接口
 * 用于确保配置的类型安全和IDE智能提示
 */

/**
 * 别名配置接口
 * 用于定义路径别名的映射关系
 */
export interface AliasConfig {
  /** 别名名称 - 在代码中使用的简短路径名 */
  find: string;
  
  /** 实际路径 - 别名指向的真实文件系统路径 */
  replacement: string;
  
  /** 描述信息 - 可选，用于说明这个别名的用途 */
  description?: string;
}

/**
 * 路由配置接口
 * 用于定义业务模块的路由信息
 */
export interface RouteConfig {
  /** 路由路径 */
  path: string;
  
  /** 组件路径 */
  component: string;
  
  /** 路由名称 - 可选 */
  name?: string;
  
  /** 路由元信息 - 可选 */
  meta?: Record<string, any>;
}

/**
 * 状态管理配置接口
 * 用于定义业务模块的Pinia store配置
 */
export interface StoreConfig {
  /** Store名称 */
  name: string;
  
  /** Store文件路径 */
  path: string;
  
  /** Store描述 - 可选 */
  description?: string;
}

/**
 * 服务配置接口
 * 用于定义业务模块的服务层配置
 */
export interface ServiceConfig {
  /** 服务名称 */
  name: string;
  
  /** 服务文件路径 */
  path: string;
  
  /** 服务描述 - 可选 */
  description?: string;
}

/**
 * 业务配置主接口
 * 这是每个业务模块配置文件的主要结构
 */
export interface BusinessConfig {
  /** 业务名称 - 唯一标识符 */
  name: string;
  
  /** 业务显示名称 - 可选，用于UI显示 */
  displayName?: string;
  
  /** 业务描述 - 可选 */
  description?: string;
  
  /** 别名配置数组 */
  alias: AliasConfig[];
  
  /** 路由配置数组 - 可选 */
  routes?: RouteConfig[];
  
  /** 状态管理配置数组 - 可选 */
  stores?: StoreConfig[];
  
  /** 服务配置数组 - 可选 */
  services?: ServiceConfig[];
  
  /** 扩展配置 - 可选，用于存储业务特有的配置 */
  extensions?: Record<string, any>;
}

/**
 * 配置管理器选项接口
 */
export interface ConfigManagerOptions {
  /** 是否启用调试模式 */
  debug?: boolean;
  
  /** 是否自动生成TypeScript路径配置 */
  autoGenerateTSPaths?: boolean;
  
  /** 自定义路径解析函数 */
  customPathResolver?: (path: string) => string;
}
