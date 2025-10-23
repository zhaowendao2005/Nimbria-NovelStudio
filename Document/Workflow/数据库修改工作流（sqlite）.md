
# 📚 数据库Schema更改工作流（精简版）

适用于个人项目，只保留核心步骤：**1️⃣ 需求分析** → **3️⃣ 创建Schema** → **4️⃣ 更新导出** → **5️⃣ 更新初始化** → **7️⃣ 测试**

---

## 第一步：需求分析 📝

快速确定：
- 要加什么表/字段？
- 需要默认数据吗？
- 会影响现有功能吗？

---

## 第二步：创建新版本Schema文件 🆕

**文件**: `Nimbria/src-electron/services/database-service/schema/versions/vX.Y.Z.schema.ts`

### 快速模板（复制粘贴修改）

```typescript
/**
 * Database Schema vX.Y.Z
 * [一句话描述：如"新增XXX表"]
 */

import type { SchemaDefinition, TableDefinition } from '../base-schema'
import {
  PROJECT_SCHEMA_V[上一版本],
  GLOBAL_SCHEMA_V[上一版本]
} from './v[上一版本].schema'

// ========== 新表定义 ==========
const NEW_TABLE: TableDefinition = {
  name: 'table_name',
  sql: `CREATE TABLE IF NOT EXISTS table_name (
    id TEXT PRIMARY KEY,
    -- 你的字段
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: [
    // 如果需要索引
    `CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field)`
  ]
}

// ========== Schema定义 ==========
export const PROJECT_TABLES: TableDefinition[] = [
  ...PROJECT_SCHEMA_V[上一版本].tables,
  NEW_TABLE  // 加上新表
]

export const GLOBAL_TABLES: TableDefinition[] = GLOBAL_SCHEMA_V[上一版本].tables

export const PROJECT_SCHEMA_VX_Y_Z: SchemaDefinition = {
  version: 'X.Y.Z',
  tables: PROJECT_TABLES,
  description: '项目数据库 Schema vX.Y.Z - [变更描述]'
}

export const GLOBAL_SCHEMA_VX_Y_Z: SchemaDefinition = {
  version: 'X.Y.Z',
  tables: GLOBAL_TABLES,
  description: '全局数据库 Schema vX.Y.Z - 保持不变'
}

// ========== 迁移脚本 ==========
export const MIGRATION_[上一版本]_TO_X_Y_Z = {
  from: '[上一版本]',
  to: 'X.Y.Z',
  description: '[一句话描述]',
  sql: `
    CREATE TABLE IF NOT EXISTS table_name (
      -- 复制上面的表结构
    );
    
    CREATE INDEX IF NOT EXISTS idx_table_field ON table_name(field);
    
    -- 如果需要初始数据
    INSERT OR IGNORE INTO table_name VALUES (...);
  `
}
```

---

## 第三步：更新版本导出 📦

**文件**: `Nimbria/src-electron/services/database-service/schema/versions/index.ts`

```typescript
// 1. 加一行导出
export { 
  GLOBAL_SCHEMA_VX_Y_Z, 
  PROJECT_SCHEMA_VX_Y_Z, 
  MIGRATION_[上一版本]_TO_X_Y_Z
} from './vX.Y.Z.schema'

// 2. 改两个版本号
export const CURRENT_GLOBAL_SCHEMA_VERSION = 'X.Y.Z'  // 改这里
export const CURRENT_PROJECT_SCHEMA_VERSION = 'X.Y.Z'  // 改这里
```

---

## 第四步：更新数据库初始化 🔧

### 4.1 更新 project-database.ts

**文件**: `Nimbria/src-electron/services/database-service/project-database.ts`

```typescript
// 1. 改导入（第8行）
import { PROJECT_SCHEMA_VX_Y_Z } from './schema/versions'  // 改版本号

// 2. 改初始化（第28行）
this.db = await this.databaseManager.createProjectDatabase(
  this.projectPath,
  PROJECT_SCHEMA_VX_Y_Z  // 改版本号
)
```

### 4.2 更新 database-manager.ts

**文件**: `Nimbria/src-electron/services/database-service/database-manager.ts`

在 `runMigrations` 方法里加一个 if 分支（约第237行）：

```typescript
private async runMigrations(db: Database.Database, fromVersion: string, toVersion: string): Promise<void> {
  console.log(`🔄 [DatabaseManager] 开始迁移: ${fromVersion} → ${toVersion}`)

  // 👇 加这一段
  if (fromVersion === '[上一版本]' && toVersion === 'X.Y.Z') {
    const { MIGRATION_[上一版本]_TO_X_Y_Z } = await import('./schema/versions/vX.Y.Z.schema')
    console.log(`📝 [DatabaseManager] 执行迁移: ${MIGRATION_[上一版本]_TO_X_Y_Z.description}`)
    db.exec(MIGRATION_[上一版本]_TO_X_Y_Z.sql)
    console.log(`✅ [DatabaseManager] 迁移完成`)
  } 
  // 已有的其他版本迁移...
  else if (fromVersion === '1.2.2' && toVersion === '1.2.3') {
    // ...
  }
  // ... 其他代码不变
}
```

---

## 第五步：测试 ✅

### 5.1 测试新项目（5分钟）

1. 删除测试项目的 `.Database` 文件夹
2. 重新打开项目
3. 看控制台日志：
   ```
   📝 [DatabaseManager] 应用Schema vX.Y.Z...
   ✅ [DatabaseManager] Schema应用完成
   ```
4. 验证新表存在（使用DB工具或代码查询）

### 5.2 测试旧项目升级（5分钟）

1. 用旧版本创建一个项目（保留数据）
2. 升级代码后打开项目
3. 看控制台日志：
   ```
   🔄 [DatabaseManager] 检测到版本差异: [旧] → [新]
   📝 [DatabaseManager] 执行迁移: ...
   ✅ [DatabaseManager] 迁移完成
   ```
4. 验证旧数据完好 + 新表存在

### 5.3 功能测试（10分钟）

- [ ] 新功能能用
- [ ] 旧功能没坏
- [ ] 没有报错

---

## 🎯 实战示例：加一个用户设置表

假设你要从 v1.2.3 升级到 v1.2.4，加一个用户设置表：

### 1. 创建 `v1.2.4.schema.ts`

```typescript
import type { SchemaDefinition, TableDefinition } from '../base-schema'
import { PROJECT_SCHEMA_V1_2_3, GLOBAL_SCHEMA_V1_2_3 } from './v1.2.3.schema'

const USER_SETTINGS_TABLE: TableDefinition = {
  name: 'user_settings',
  sql: `CREATE TABLE IF NOT EXISTS user_settings (
    id TEXT PRIMARY KEY,
    theme TEXT DEFAULT 'light',
    language TEXT DEFAULT 'zh-CN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  indexes: []
}

export const PROJECT_TABLES: TableDefinition[] = [
  ...PROJECT_SCHEMA_V1_2_3.tables,
  USER_SETTINGS_TABLE
]

export const GLOBAL_TABLES: TableDefinition[] = GLOBAL_SCHEMA_V1_2_3.tables

export const PROJECT_SCHEMA_V1_2_4: SchemaDefinition = {
  version: '1.2.4',
  tables: PROJECT_TABLES,
  description: '项目数据库 Schema v1.2.4 - 新增用户设置表'
}

export const GLOBAL_SCHEMA_V1_2_4: SchemaDefinition = {
  version: '1.2.4',
  tables: GLOBAL_TABLES,
  description: '全局数据库 Schema v1.2.4 - 保持不变'
}

export const MIGRATION_1_2_3_TO_1_2_4 = {
  from: '1.2.3',
  to: '1.2.4',
  description: '新增用户设置表',
  sql: `
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'zh-CN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `
}
```

### 2. 更新 `index.ts`

```typescript
export { GLOBAL_SCHEMA_V1_2_4, PROJECT_SCHEMA_V1_2_4, MIGRATION_1_2_3_TO_1_2_4 } from './v1.2.4.schema'

export const CURRENT_GLOBAL_SCHEMA_VERSION = '1.2.4'
export const CURRENT_PROJECT_SCHEMA_VERSION = '1.2.4'
```

### 3. 更新 `project-database.ts`

```typescript
import { PROJECT_SCHEMA_V1_2_4 } from './schema/versions'

// ...
this.db = await this.databaseManager.createProjectDatabase(
  this.projectPath,
  PROJECT_SCHEMA_V1_2_4
)
```

### 4. 更新 `database-manager.ts`

```typescript
if (fromVersion === '1.2.3' && toVersion === '1.2.4') {
  const { MIGRATION_1_2_3_TO_1_2_4 } = await import('./schema/versions/v1.2.4.schema')
  console.log(`📝 [DatabaseManager] 执行迁移: ${MIGRATION_1_2_3_TO_1_2_4.description}`)
  db.exec(MIGRATION_1_2_3_TO_1_2_4.sql)
  console.log(`✅ [DatabaseManager] 迁移完成`)
}
```

### 5. 测试

重启应用，看日志，完事！

---

## 📝 快速检查清单

```
Schema 更改完成了吗？

□ 创建了新版本schema文件
□ 在 index.ts 加了导出和改了版本号
□ 在 project-database.ts 改了导入和版本号
□ 在 database-manager.ts 加了迁移if分支
□ 测试了新项目初始化
□ 测试了旧项目升级
□ 功能都能用
```

---

## 🚨 两个注意事项

1. **SQL语法**：用 `CREATE TABLE IF NOT EXISTS` 和 `INSERT OR IGNORE`，防止重复执行
2. **备份**：改数据库前，复制一份 `.Database` 文件夹做备份

---

## 💡 小贴士

- **版本号**：小改用 X.Y.(Z+1)，大改用 X.(Y+1).0
- **迁移失败**：删掉 `.Database` 文件夹重新初始化就行（个人项目嘛）
- **忘记步骤**：看 `v1.2.3.schema.ts` 照着抄改就行

