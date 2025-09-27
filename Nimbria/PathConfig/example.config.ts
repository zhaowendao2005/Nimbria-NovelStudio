/**
 * 业务配置示例文件
 * 
 * 这个文件展示了如何创建一个完整的业务模块配置
 * 所有内容都是注释形式的教学示例，展示了各种配置选项的用法
 * 
 * 使用方法：
 * 1. 复制这个文件，重命名为 {业务名}.config.ts
 * 2. 取消注释需要的部分
 * 3. 根据实际业务需求修改配置内容
 * 4. 在 index.ts 中导入并注册这个配置
 */

import type { BusinessConfig } from './types';
import path from 'path';

// 获取当前文件的目录路径，用于计算相对路径
const __dirname = path.dirname(new URL(import.meta.url).pathname);

/**
 * 示例业务配置：小说管理系统
 * 
 * 这是一个完整的业务配置示例，展示了所有可用的配置选项
 * 实际使用时，根据需要选择合适的配置项
 */
// export const exampleBusinessConfig: BusinessConfig = {
//   /**
//    * 业务名称（必需）
//    * 
//    * 这是业务的唯一标识符，用于在系统中区分不同的业务模块
//    * 建议使用小写字母和连字符的组合，如：novel-management
//    */
//   name: 'example-business',
//
//   /**
//    * 业务显示名称（可选）
//    * 
//    * 用于在UI界面中显示的友好名称
//    */
//   displayName: '示例业务系统',
//
//   /**
//    * 业务描述（可选）
//    * 
//    * 简要描述这个业务模块的功能和用途
//    */
//   description: '这是一个用于演示配置系统使用方法的示例业务模块',
//
//   /**
//    * 别名配置数组（必需）
//    * 
//    * 这是最重要的配置部分，定义了这个业务模块的所有路径别名
//    * 每个别名都会被注册到Vite和TypeScript的路径解析系统中
//    */
//   alias: [
//     /**
//      * 业务服务层别名
//      * 
//      * 用于访问业务逻辑和API服务
//      * 推荐命名格式：@{业务名}
//      */
//     {
//       find: '@example-business',
//       replacement: path.resolve(__dirname, '../Client/Service/example-business'),
//       description: '示例业务服务层 - 包含业务逻辑、API调用等'
//     },
//
//     /**
//      * 业务组件别名
//      * 
//      * 用于访问业务专用的Vue组件
//      * 推荐命名格式：@{业务名}-components
//      */
//     {
//       find: '@example-components',
//       replacement: path.resolve(__dirname, '../Client/GUI/components/ExampleBusiness'),
//       description: '示例业务组件 - 业务专用的Vue组件'
//     },
//
//     /**
//      * 业务状态管理别名
//      * 
//      * 用于访问业务的Pinia stores
//      * 推荐命名格式：@{业务名}-stores
//      */
//     {
//       find: '@example-stores',
//       replacement: path.resolve(__dirname, '../Client/stores/example-business'),
//       description: '示例业务状态管理 - Pinia stores'
//     },
//
//     /**
//      * 业务工具函数别名
//      * 
//      * 用于访问业务专用的工具函数和帮助类
//      * 推荐命名格式：@{业务名}-utils
//      */
//     {
//       find: '@example-utils',
//       replacement: path.resolve(__dirname, '../Client/Utils/example-business'),
//       description: '示例业务工具函数 - 格式化、验证、计算等工具'
//     },
//
//     /**
//      * 业务类型定义别名
//      * 
//      * 用于访问业务的TypeScript类型定义
//      * 推荐命名格式：@{业务名}-types
//      */
//     {
//       find: '@example-types',
//       replacement: path.resolve(__dirname, '../Client/Types/example-business'),
//       description: '示例业务类型定义 - TypeScript接口和类型'
//     },
//
//     /**
//      * 业务静态资源别名
//      * 
//      * 用于访问业务专用的图片、图标、样式等静态资源
//      * 推荐命名格式：@{业务名}-assets
//      */
//     {
//       find: '@example-assets',
//       replacement: path.resolve(__dirname, '../Client/GUI/assets/example-business'),
//       description: '示例业务静态资源 - 图片、图标、样式文件等'
//     }
//   ],
//
//   /**
//    * 路由配置数组（可选）
//    * 
//    * 定义这个业务模块的路由信息
//    * 这些信息可以用于自动生成路由配置
//    */
//   routes: [
//     /**
//      * 业务主页路由
//      */
//     {
//       path: '/example-business',
//       component: 'pages/ExampleBusinessPage.vue',
//       name: 'ExampleBusiness',
//       meta: {
//         title: '示例业务',
//         requiresAuth: true,  // 需要认证
//         roles: ['admin', 'user']  // 允许的角色
//       }
//     },
//
//     /**
//      * 业务详情页路由
//      */
//     {
//       path: '/example-business/:id',
//       component: 'pages/ExampleBusinessDetailPage.vue',
//       name: 'ExampleBusinessDetail',
//       meta: {
//         title: '示例业务详情',
//         requiresAuth: true
//       }
//     },
//
//     /**
//      * 业务管理页路由
//      */
//     {
//       path: '/example-business/manage',
//       component: 'pages/ExampleBusinessManagePage.vue',
//       name: 'ExampleBusinessManage',
//       meta: {
//         title: '示例业务管理',
//         requiresAuth: true,
//         roles: ['admin']  // 仅管理员可访问
//       }
//     }
//   ],
//
//   /**
//    * 状态管理配置数组（可选）
//    * 
//    * 定义这个业务模块使用的Pinia stores
//    * 用于文档生成和依赖分析
//    */
//   stores: [
//     {
//       name: 'exampleData',
//       path: 'Client/stores/example-business/exampleData.store.ts',
//       description: '示例业务数据状态管理 - 管理业务核心数据'
//     },
//     {
//       name: 'exampleUI',
//       path: 'Client/stores/example-business/exampleUI.store.ts',
//       description: '示例业务UI状态管理 - 管理界面状态和用户交互'
//     },
//     {
//       name: 'exampleCache',
//       path: 'Client/stores/example-business/exampleCache.store.ts',
//       description: '示例业务缓存管理 - 管理数据缓存和离线存储'
//     }
//   ],
//
//   /**
//    * 服务配置数组（可选）
//    * 
//    * 定义这个业务模块提供的服务
//    * 用于文档生成和服务发现
//    */
//   services: [
//     {
//       name: 'exampleApiService',
//       path: 'Client/Service/example-business/api.service.ts',
//       description: '示例业务API服务 - 处理与后端的数据交互'
//     },
//     {
//       name: 'exampleBusinessService',
//       path: 'Client/Service/example-business/business.service.ts',
//       description: '示例业务逻辑服务 - 处理业务规则和数据处理'
//     },
//     {
//       name: 'exampleValidationService',
//       path: 'Client/Service/example-business/validation.service.ts',
//       description: '示例业务验证服务 - 处理数据验证和格式检查'
//     }
//   ],
//
//   /**
//    * 扩展配置（可选）
//    * 
//    * 用于存储业务特有的配置信息
//    * 可以根据具体业务需求添加任意配置项
//    */
//   extensions: {
//     /**
//      * 业务特性开关
//      */
//     features: {
//       enableAdvancedSearch: true,
//       enableRealTimeSync: false,
//       enableOfflineMode: true
//     },
//
//     /**
//      * 业务常量配置
//      */
//     constants: {
//       maxItemsPerPage: 20,
//       cacheExpireTime: 300000,  // 5分钟
//       supportedFileTypes: ['.jpg', '.png', '.pdf', '.docx']
//     },
//
//     /**
//      * 第三方服务配置
//      */
//     externalServices: {
//       apiBaseUrl: process.env.EXAMPLE_API_URL || 'https://api.example.com',
//       cdnBaseUrl: process.env.EXAMPLE_CDN_URL || 'https://cdn.example.com'
//     }
//   }
// };

/**
 * 简化版配置示例
 * 
 * 如果您的业务比较简单，只需要基本的别名配置，可以参考这个简化版本
 */
// export const simpleExampleConfig: BusinessConfig = {
//   name: 'simple-example',
//   displayName: '简单示例',
//   alias: [
//     {
//       find: '@simple',
//       replacement: path.resolve(__dirname, '../Client/Service/simple-example'),
//       description: '简单业务服务层'
//     },
//     {
//       find: '@simple-components',
//       replacement: path.resolve(__dirname, '../Client/GUI/components/SimpleExample'),
//       description: '简单业务组件'
//     }
//   ]
// };

/**
 * 使用说明：
 * 
 * 1. 创建新的业务配置文件
 *    - 复制这个文件
 *    - 重命名为 {您的业务名}.config.ts
 *    - 例如：novel.config.ts, user-management.config.ts
 * 
 * 2. 配置业务信息
 *    - 取消注释需要的配置部分
 *    - 修改 name 为您的业务名称
 *    - 修改 displayName 和 description
 * 
 * 3. 配置别名路径
 *    - 根据您的目录结构修改 replacement 路径
 *    - 确保路径指向正确的文件夹
 *    - 添加合适的描述信息
 * 
 * 4. 注册配置
 *    - 在 index.ts 文件中导入您的配置
 *    - 在 loadConfigs() 方法中注册配置
 * 
 * 5. 使用别名
 *    - 在代码中使用定义的别名进行导入
 *    - 例如：import { someService } from '@your-business/some.service'
 * 
 * 6. 重启开发服务器
 *    - 修改配置后需要重启 npm run dev
 *    - 新的别名配置才会生效
 */

/**
 * 最佳实践建议：
 * 
 * 1. 别名命名规范
 *    - 使用 @{业务名} 作为主要别名
 *    - 使用 @{业务名}-{类型} 作为分类别名
 *    - 保持命名一致性和可读性
 * 
 * 2. 目录结构建议
 *    - Service/{业务名}/ - 业务逻辑层
 *    - GUI/components/{业务名}/ - 业务组件
 *    - stores/{业务名}/ - 业务状态管理
 *    - Utils/{业务名}/ - 业务工具函数
 *    - Types/{业务名}/ - 业务类型定义
 * 
 * 3. 配置维护
 *    - 定期检查别名是否还在使用
 *    - 保持配置文件的注释更新
 *    - 使用 validateConfigs() 检查冲突
 * 
 * 4. 团队协作
 *    - 在团队中统一别名命名规范
 *    - 文档化每个业务模块的用途
 *    - 定期review配置文件的变更
 */
