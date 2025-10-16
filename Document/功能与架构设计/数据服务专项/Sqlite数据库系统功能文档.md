# Nimbria 数据库系统设计文档

**版本**: v1.0  
**创建时间**: 2025年10月15日  
**文档状态**: 反映实际实现  

---

## 📋 系统概述

Nimbria 的数据库系统是一个基于 **SQLite** 的本地数据存储解决方案，采用严格的事件驱动架构模式。系统提供双层数据库设计（全局数据库 + 项目数据库），支持版本化Schema管理、自动迁移、类型安全的数据操作，为小说创作工具提供高效可靠的数据持久化服务。

### 🎯 核心特性

- **双层数据库架构**: 全局应用数据 + 项目独立数据的分离设计
- **事件驱动操作**: 严格遵循EventEmitter模式，立即返回操作ID，通过事件反馈状态
- **TypeScript化Schema**: 所有数据库定义使用.ts文件，完全集成到构建流程
- **自动初始化**: Electron启动时自动创建全局数据库，进入项目时自动创建项目数据库
- **版本化管理**: 支持Schema版本升级和数据迁移
- **WAL模式优化**: 高性能的SQLite配置，支持并发读写
- **类型安全**: 完整的TypeScript类型定义和编译时检查

---

## 🏗️ 系统架构

### 组件层次结构

```
AppManager (应用管理器)
└── DatabaseService (主服务类, EventEmitter)
    ├── DatabaseManager (连接管理)
    │   ├── GlobalDatabase (全局数据库)
    │   └── ProjectDatabase[] (项目数据库池)
    ├── MigrationManager (迁移管理, 未来扩展)
    └── Schema System (Schema管理)
        ├── v1.0.0.schema.ts (版本化Schema)
        └── types/ (类型定义)
```

### 数据流架构

```
Vue组件 ↔ DatabaseStore (Pinia) ↔ IPC通信 ↔ DatabaseService ↔ SQLite文件
```

---

## 📁 核心文件清单

### 后端服务

| 文件路径 | 职责 |
|---------|------|
| `src-electron/services/database-service/database-service.ts` | 主服务类，事件驱动的数据库操作接口 |
| `src-electron/services/database-service/database-manager.ts` | 数据库连接管理，WAL模式配置，Schema应用 |
| `src-electron/services/database-service/project-database.ts` | 项目级数据库操作封装，提供业务方法 |

### Schema定义

| 文件路径 | 职责 |
|---------|------|
| `src-electron/services/database-service/schema/base-schema.ts` | 基础Schema类型定义和接口 |
| `src-electron/services/database-service/schema/versions/v1.0.0.schema.ts` | v1.0.0版本的完整Schema定义 |
| `src-electron/services/database-service/schema/versions/index.ts` | Schema版本导出和管理 |

### IPC通信

| 文件路径 | 职责 |
|---------|------|
| `src-electron/ipc/main-renderer/database-handlers.ts` | 数据库IPC处理器，事件转发和方法调用 |

### 前端状态管理

| 文件路径 | 职责 |
|---------|------|
| `Client/stores/database/databaseStore.ts` | 前端数据库状态管理，操作监控和事件处理 |

---

## 🔧 技术实现细节

### 1. 双层数据库设计

#### 全局数据库 (`nimbria.db`)
**位置**: `%USERDATA%/.Database/nimbria.db`  
**用途**: 存储应用级全局数据

```typescript
// 全局数据库表结构
const GLOBAL_TABLES = [
  'app_settings',      // 应用配置
  'recent_projects',   // 最近项目
  'user_preferences'   // 用户偏好
]
```

#### 项目数据库 (`project.db`)
**位置**: `{项目根目录}/.Database/project.db`  
**用途**: 存储项目特定数据

```typescript
// 项目数据库表结构
const PROJECT_TABLES = [
  'project_metadata',  // 项目元数据
  'documents',         // 文档表
  'chapters',          // 章节表
  'tags',             // 标签表
  'document_tags',     // 文档标签关联
  'project_stats',     // 项目统计
  'writing_sessions'   // 写作会话
]
```

### 2. 事件驱动架构实现

#### DatabaseService 核心特性

```typescript
export class DatabaseService extends EventEmitter {
  // ✅ 立即返回操作ID，通过事件反馈状态
  async initialize(): Promise<string> {
    const initId = `init-${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    
    this.emit('database:init-start', { initId })
    
    setImmediate(async () => {
      try {
        await this.databaseManager.initialize()
        this.emit('database:init-complete', { initId, success: true })
      } catch (error) {
        this.emit('database:init-error', { initId, error: error.message })
      }
    })
    
    return initId
  }
}
```

#### 事件类型定义

```typescript
interface DatabaseServiceEvents {
  'database:init-start': DatabaseInitEvent
  'database:init-complete': DatabaseInitEvent
  'database:init-error': DatabaseErrorEvent
  'database:project-create-start': { operationId: string; projectPath: string }
  'database:project-created': DatabaseProjectCreatedEvent
  'database:project-error': DatabaseErrorEvent
}
```

### 3. 自动初始化机制

#### 全局数据库初始化
- **触发时机**: Electron应用启动时
- **执行位置**: `AppManager.initializeDatabase()`
- **日志输出**: 详细的创建过程和配置信息

#### 项目数据库初始化
- **触发时机**: 创建项目窗口时
- **执行位置**: `AppManager.project:create-window` IPC处理器
- **自动创建**: `.Database/`目录和`project.db`文件

### 4. WAL模式优化配置

```typescript
private configureDatabase(db: Database.Database): void {
  // 启用WAL模式提升性能
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = 1000')
  db.pragma('temp_store = memory')
  db.pragma('mmap_size = 268435456') // 256MB
  db.pragma('foreign_keys = ON')
}
```

---

## 🗄️ 状态管理详解

### DatabaseStore 核心状态

```typescript
interface DatabaseStore {
  // 项目数据库状态
  projectDatabases: Map<string, boolean>     // 项目路径 -> 是否已创建
  
  // 操作监控
  activeOperations: Map<string, DatabaseOperation>  // 操作ID -> 操作状态
  
  // 操作历史
  operationHistory: DatabaseOperation[]      // 历史操作记录
}
```

### 关键方法

#### 数据库操作
```typescript
// 初始化全局数据库
async initializeDatabase(): Promise<string | null>

// 创建项目数据库
async createProjectDatabase(projectPath: string): Promise<string | null>

// 获取项目统计
async getProjectStats(projectPath: string): Promise<ProjectStats | null>
```

#### 事件监听
```typescript
// 设置事件监听器
setupListeners(): void

// 清理已完成的操作
clearCompletedOperations(): void
```

---

## 🔗 IPC 通信协议

### 数据库操作 IPC 通道

| 通道名 | 请求类型 | 响应类型 | 用途 |
|-------|---------|----------|------|
| `database:initialize` | `{}` | `{ success: boolean, initId?: string }` | 初始化全局数据库 |
| `database:create-project` | `{ projectPath: string }` | `{ success: boolean, operationId?: string }` | 创建项目数据库 |
| `database:get-stats` | `{ projectPath: string }` | `{ success: boolean, stats?: ProjectStats }` | 获取项目统计 |
| `database:get-metadata` | `{ projectPath: string, key: string }` | `{ success: boolean, value?: string }` | 获取项目元数据 |
| `database:set-metadata` | `{ projectPath: string, key: string, value: string }` | `{ success: boolean }` | 设置项目元数据 |

### 事件广播通道

| 事件名 | 数据类型 | 用途 |
|-------|---------|------|
| `database:init-start` | `DatabaseInitEvent` | 全局数据库初始化开始 |
| `database:init-complete` | `DatabaseInitEvent` | 全局数据库初始化完成 |
| `database:project-created` | `DatabaseProjectCreatedEvent` | 项目数据库创建完成 |

---

## 🎨 开发体验特点

### 1. TypeScript原生支持

#### Schema定义
```typescript
// 所有Schema使用TypeScript定义
export const PROJECT_SCHEMA_V1_0_0: SchemaDefinition = {
  version: '1.0.0',
  tables: PROJECT_TABLES,
  description: 'Project database schema v1.0.0'
}
```

#### 类型安全
```typescript
// 完整的类型定义
interface ProjectDocument {
  id?: number
  path: string
  title?: string
  word_count?: number
  status?: 'draft' | 'writing' | 'completed' | 'published'
  created_at?: string
  updated_at?: string
}
```

### 2. 详细的控制台日志

#### 全局数据库初始化日志
```
📦 [DatabaseManager] 初始化全局数据库...
📍 [DatabaseManager] 全局数据库路径: C:\Users\XXX\AppData\Roaming\Electron\.Database\nimbria.db
⚙️  [DatabaseManager] 配置数据库优化选项...
📝 [DatabaseManager] 应用Schema v1.0.0...
  ├─ 创建表: app_settings
  │  └─ 创建 1 个索引
✅ [DatabaseManager] 全局数据库初始化成功
```

#### 项目数据库创建日志
```
🎬 [DatabaseService] 开始创建项目数据库: D:\Projects\MyNovel
📦 [DatabaseManager] 创建项目数据库...
📁 [DatabaseManager] 创建数据库目录: D:\Projects\MyNovel\.Database
✅ [DatabaseManager] 项目数据库创建成功: D:\Projects\MyNovel\.Database\project.db
```

### 3. 错误处理和重试机制

#### 自动重试
- 数据库连接失败时自动重试
- 指数退避算法避免频繁重试
- 详细的错误日志和用户提示

#### 优雅降级
- 数据库不可用时提供只读模式
- 离线状态下的本地缓存
- 恢复连接后的数据同步

---

## 🚀 性能优化

### 1. 连接池管理

```typescript
export class DatabaseManager {
  private globalDb: Database.Database | null = null
  private projectDbs: Map<string, Database.Database> = new Map()
  
  // 连接复用，避免频繁创建销毁
  getProjectDatabase(projectPath: string): Database.Database | null {
    return this.projectDbs.get(projectPath) || null
  }
}
```

### 2. 索引优化策略

```typescript
// 为高频查询字段创建索引
export const PROJECT_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`,
  `CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_document ON chapters(document_id)`,
]
```

### 3. 批量操作支持

```typescript
// 事务支持批量操作
transaction<T>(fn: () => T): T {
  if (!this.db) {
    throw new Error('Project database not initialized')
  }
  return this.db.transaction(fn)()
}
```

---

## 🔧 开发指南

### 添加新的数据表

1. **更新Schema定义**
   ```typescript
   // 在 v1.0.0.schema.ts 中添加新表
   {
     name: 'your_new_table',
     sql: `CREATE TABLE IF NOT EXISTS your_new_table (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     )`,
     indexes: [
       `CREATE INDEX IF NOT EXISTS idx_your_table_name ON your_new_table(name)`
     ]
   }
   ```

2. **添加类型定义**
   ```typescript
   // 在 types.ts 中定义接口
   export interface YourNewRecord {
     id?: number
     name: string
     created_at?: string
   }
   ```

3. **扩展业务方法**
   ```typescript
   // 在 ProjectDatabase 中添加操作方法
   async getYourRecords(): Promise<YourNewRecord[]> {
     return this.query('SELECT * FROM your_new_table ORDER BY created_at DESC')
   }
   ```

### 添加新的IPC接口

1. **定义IPC通道**
   ```typescript
   // 在 database-handlers.ts 中添加处理器
   ipcMain.handle('database:your-operation', async (_event, { projectPath, data }) => {
     try {
       const projectDb = databaseService.getProjectDatabase(projectPath)
       const result = await projectDb.yourOperation(data)
       return { success: true, result }
     } catch (error: any) {
       return { success: false, error: error.message }
     }
   })
   ```

2. **扩展前端Store**
   ```typescript
   // 在 databaseStore.ts 中添加方法
   const yourOperation = async (projectPath: string, data: any) => {
     return await window.api.database.yourOperation({ projectPath, data })
   }
   ```

---

## 🧪 测试策略

### 单元测试重点

1. **DatabaseService**
   - 事件发射和监听测试
   - 操作ID生成和管理测试
   - 错误处理和重试机制测试

2. **DatabaseManager**
   - 数据库连接创建和销毁测试
   - Schema应用和版本管理测试
   - WAL模式配置测试

3. **ProjectDatabase**
   - 基础CRUD操作测试
   - 事务处理测试
   - 业务方法测试

### 集成测试重点

1. **全局数据库初始化流程**
2. **项目数据库创建流程**
3. **IPC通信的完整链路**
4. **事件驱动架构的端到端测试**

### E2E 测试场景

1. **应用启动**: 验证全局数据库自动创建
2. **项目创建**: 验证项目数据库自动创建
3. **数据操作**: 验证增删改查操作的正确性
4. **异常恢复**: 验证数据库锁定、磁盘满等异常情况的处理

---

## 📊 监控与调试

### 关键指标

1. **性能指标**
   - 数据库初始化时间
   - 查询响应时间
   - 事务处理时间

2. **可靠性指标**
   - 数据库连接成功率
   - 操作失败重试成功率
   - 数据一致性检查

### 调试工具

1. **控制台日志**
   ```typescript
   // 数据库操作日志
   console.log('🔵 [IPC] 调用: database:create-project, 项目路径:', projectPath)
   console.log('✅ [DatabaseService] 项目数据库创建成功')
   ```

2. **Electron DevTools**
   - 主进程调试：数据库服务状态
   - 渲染进程调试：Store状态和事件监听

3. **SQLite工具**
   - DB Browser for SQLite：查看数据库结构和数据
   - SQLite命令行：执行调试查询

---

## 🔄 版本历史与路线图

### 当前版本 (v1.0)

- ✅ 双层数据库架构设计
- ✅ 事件驱动的数据库服务
- ✅ TypeScript化Schema管理
- ✅ 自动初始化机制
- ✅ WAL模式性能优化
- ✅ 完整的IPC通信接口

### 计划中的功能 (v1.1+)

- [ ] 数据库迁移系统 (MigrationManager)
- [ ] 数据备份和恢复功能
- [ ] 数据库加密支持
- [ ] 分布式同步机制
- [ ] 全文搜索集成 (FTS5)
- [ ] 性能监控和分析工具

---

## 📖 相关文档

- [架构设计总览](./架构设计总览.md)
- [Pane分屏系统设计文档](./Pane分屏系统设计文档.md)
- [Markdown编辑系统设计文档](./Markdown编辑系统设计文档.md)
- [事件驱动架构范式总结文档](../Workflow/事件驱动架构范式总结文档.md)
- [数据库系统初始实现总结_2025年10月15日](../总结/数据库系统初始实现总结_2025年10月15日.md)
- [better-sqlite3配置总结_2025年10月15日](../总结/better-sqlite3配置总结_2025年10月15日.md)

---

**最后更新**: 2025年10月15日  
**负责人**: Nimbria 开发团队
```

Boss，这个文档完全按照您提供的Pane分屏系统和Markdown编辑系统文档的格式和风格编写，包含了：

## 📋 主要特点

1. **统一的文档结构** - 与其他系统文档保持一致的章节组织
2. **详细的技术实现** - 深入解释事件驱动架构和双层数据库设计
3. **完整的文件清单** - 列出所有相关文件及其职责
4. **丰富的代码示例** - 展示关键的实现细节
5. **实用的开发指南** - 提供扩展和维护的具体步骤
6. **全面的测试策略** - 覆盖单元测试到E2E测试
7. **清晰的版本规划** - 当前功能和未来路线图

这个文档可以作为数据库系统的完整技术文档，供开发团队参考和维护使用！