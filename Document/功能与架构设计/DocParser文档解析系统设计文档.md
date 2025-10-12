# Nimbria DocParser 文档解析系统设计文档

**版本**: v1.0  
**创建时间**: 2025年10月12日  
 **最后更新**: 2025年10月12日  
**文档状态**: ✅ 已完成实现  

---

## 📋 目录

1. [系统概述](#系统概述)
2. [使用方案与交互设计](#使用方案与交互设计)
3. [架构设计](#架构设计)
4. [状态管理与数据流](#状态管理与数据流)
5. [核心类型定义](#核心类型定义)
6. [技术实现细节](#技术实现细节)
7. [UI组件详解](#ui组件详解)
8. [开发指南](#开发指南)
9. [性能优化](#性能优化)
10. [版本历史与路线图](#版本历史与路线图)

---

## 📋 系统概述

Nimbria 的 DocParser 文档解析系统是一个强大的文本解析和数据导出工具，支持通过可视化配置 JSON Schema 来定义解析规则，将非结构化文档转换为结构化数据并导出为 Excel 格式。该系统从 JiuZhang 项目迁移而来，并完整集成到 Nimbria 的标签页系统中。

### 🎯 核心特性

- **可视化 Schema 编辑**: 树形编辑器 + Monaco 代码编辑器双视图
- **智能正则解析**: 支持多种解析模式（extract/split/validate）和条件匹配
- **嵌套结构支持**: 解析数组、对象等复杂数据结构
- **灵活导出配置**: Excel/CSV 导出，支持列配置和样式自定义
- **实时预览**: 树形 + JSON 双视图预览解析结果
- **标签页集成**: 作为特殊标签页类型，支持分屏、拖拽等操作
- **Mock 优先开发**: 完整的 Mock 数据支持，便于前端独立开发

### 💡 典型应用场景

1. **题目库整理**: 从Word/PDF文档中批量提取题目、选项、答案
2. **日志分析**: 解析服务器日志文件，提取关键信息
3. **文档转换**: Markdown → Excel，文本 → 结构化数据
4. **数据清洗**: 从非结构化文本中提取规范化数据
5. **批量处理**: 一次性处理大量同格式文档

---

## 🎨 使用方案与交互设计

### 工作流程

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  定义Schema │ --> │  选择文档   │ --> │  执行解析   │ --> │  导出Excel  │
│             │     │             │     │             │     │             │
│ • 新建/加载 │     │ • 浏览文件  │     │ • 解析数据  │     │ • 配置列    │
│ • 可视化编辑│     │ • 预览内容  │     │ • 实时预览  │     │ • 选择路径  │
│ • 正则配置  │     │             │     │ • 查看结果  │     │ • 确认导出  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 界面布局

```
┌──────────────────────────────────────────────────────────────────┐
│  TopBar - 工具栏                                                  │
│  [新建Schema] [加载Schema] [选择文档] [开始解析] [快速导出]      │
│                    进度: ■■■■□ Schema → 文档 → 解析 → 导出       │
├──────────────────────────┬───────────────────────────────────────┤
│  左侧区域 (50%)          │  右侧区域 (50%)                       │
│                          │                                       │
│  ┌──────────────────┐   │  ┌──────────────────────────────┐    │
│  │ JSON Schema定义  │   │  │  解析结果预览                │    │
│  │                  │   │  │                              │    │
│  │ 📝 可视化树形编辑│   │  │  🌳 树形视图 │ 📄 JSON视图   │    │
│  │ 💻 Monaco代码编辑│   │  │                              │    │
│  └──────────────────┘   │  │  共 10 条数据                │    │
│                          │  │  5 个字段                    │    │
│  ┌──────────────────┐   │  │  预估大小: 15KB              │    │
│  │ 待解析文档       │   │  └──────────────────────────────┘    │
│  │                  │   │                                       │
│  │ 📁 文件路径      │   │                                       │
│  │ 👁 内容预览      │   │                                       │
│  └──────────────────┘   │                                       │
│                          │                                       │
│  ┌──────────────────┐   │                                       │
│  │ 导出配置         │   │                                       │
│  │                  │   │                                       │
│  │ 📋 列配置表格    │   │                                       │
│  │ ⚙️  高级选项     │   │                                       │
│  │ 💾 输出路径      │   │                                       │
│  │                  │   │                                       │
│  │ [确认导出]       │   │                                       │
│  └──────────────────┘   │                                       │
└──────────────────────────┴───────────────────────────────────────┘
```

### 交互流程详解

#### 1️⃣ 定义Schema阶段

**操作步骤**:
1. 点击"新建Schema"或"加载Schema"
2. 选择根节点类型（Object 或 Array）
3. 添加字段并配置解析规则：
   - **字段名称**: questionNumber, questionContent 等
   - **字段类型**: string, number, boolean, array, object
   - **解析规则**: 正则表达式 + 提取模式
   - **导出配置**: 列名、顺序、宽度、格式

**可视化编辑**:
- 树形视图拖拽调整字段顺序
- 右键菜单快速添加/删除字段
- 悬停显示字段详细信息
- 双击编辑字段名称

**代码编辑**:
- Monaco Editor 提供语法高亮
- 实时语法验证
- 自动格式化（Ctrl+Shift+F）
- 错误提示定位

#### 2️⃣ 选择文档阶段

**操作步骤**:
1. 点击"选择文档"按钮
2. 系统打开文件选择器
3. 选择 `.txt`, `.md`, `.log` 等文本文件
4. 系统加载文件并显示预览（前500行）

**文件信息显示**:
- 文件路径
- 文件大小
- 总行数
- 编码格式

#### 3️⃣ 执行解析阶段

**操作步骤**:
1. 点击"开始解析"按钮
2. 系统执行解析逻辑：
   - 验证Schema格式
   - 应用正则表达式
   - 提取结构化数据
   - 生成预览结果
3. 实时显示解析进度
4. 完成后自动跳转到结果预览

**预览功能**:
- **树形视图**: 
  - 展开/折叠节点
  - 搜索过滤
  - 高亮匹配项
- **JSON视图**:
  - 语法高亮
  - 复制按钮
  - 下载按钮

**统计信息**:
```
解析成功 ✅
├─ 数据条数: 10 条
├─ 字段数量: 5 个
├─ 数据大小: 15 KB
└─ 解析耗时: 0.3 秒
```

#### 4️⃣ 导出Excel阶段

**快速导出流程**:
1. 点击TopBar的"快速导出"按钮
2. 系统自动检查导出配置：
   - ✅ 输出路径已设置 → 直接导出
   - ❌ 输出路径未设置 → 提示选择路径
3. 导出成功提示

**导出配置项**:

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| 工作表名称 | Sheet名称 | Sheet1 |
| 导出格式 | Excel/CSV | xlsx |
| 输出路径 | 保存位置 | 桌面 |
| 包含表头 | 是否显示列名 | ✅ |
| 冻结首行 | 固定表头 | ✅ |
| 章节标题 | 包含分组信息 | ❌ |

**列配置表格**:
```
┌────┬──────────┬──────────────┬──────┬──────┐
│ #  │ 列名     │ 字段路径     │ 宽度 │ 顺序 │
├────┼──────────┼──────────────┼──────┼──────┤
│ 1  │ 章节     │ chapterName  │  30  │  1   │
│ 2  │ 题号     │ questionNum  │  8   │  2   │
│ 3  │ 题目内容 │ questionCont │  60  │  3   │
│ 4  │ 答案     │ answer       │  80  │  4   │
│ 5  │ 题型     │ questionType │  12  │  5   │
└────┴──────────┴──────────────┴──────┴──────┘
```

### 快捷键支持

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建Schema |
| `Ctrl + O` | 加载Schema |
| `Ctrl + S` | 保存Schema（自动3秒防抖） |
| `Ctrl + P` | 开始解析 |
| `Ctrl + E` | 快速导出 |
| `Ctrl + /` | 折叠/展开全部 |

---

## 🏗️ 架构设计

### 三层架构设计

```
┌─────────────────────────────────────────────────┐
│              GUI 层 (Vue 组件)                   │
│  DocParserPanel → 主容器                         │
│  ├── TopBar → 工具栏                             │
│  ├── FileSelector → 文件选择                     │
│  ├── SchemaEditor → Schema 编辑器(9个子组件)     │
│  ├── ResultPreview → 结果预览                    │
│  └── ExportConfig → 导出配置                     │
└─────────────────┬───────────────────────────────┘
                  │ Refs/Emits
┌─────────────────▼───────────────────────────────┐
│           Store 层 (Pinia + 工具函数)            │
│  docParser.store.ts → 状态管理                   │
│  ├── parser.ts → 解析逻辑封装                    │
│  ├── exporter.ts → 导出逻辑封装                  │
│  ├── docParser.types.ts → 类型定义              │
│  ├── docParser.schemaUtils.ts → Schema 工具     │
│  └── docParser.mock.ts → Mock 数据              │
└─────────────────┬───────────────────────────────┘
                  │ Function Calls
┌─────────────────▼───────────────────────────────┐
│         Service 层 (纯业务逻辑)                  │
│  regexEngine.ts → 正则表达式引擎                 │
│  schemaValidator.ts → Schema 验证器              │
│  documentParser.ts → 文档解析器                  │
│  excelExporter.ts → Excel 导出器                 │
│  docParser.service.types.ts → Service 类型       │
└─────────────────┬───────────────────────────────┘
                  │ Mock/IPC (Future)
┌─────────────────▼───────────────────────────────┐
│         DataSource (数据访问层)                  │
│  - listSchemaFiles() → 读取 Schema 文件列表      │
│  - loadSchema() → 加载 Schema                    │
│  - saveSchema() → 保存 Schema                    │
│  - readDocumentFile() → 读取待解析文档           │
│  - saveExportedFile() → 保存导出文件             │
└─────────────────────────────────────────────────┘
```

### 组件层次结构

```
DocParserPanel (主容器)
├── TopBar (工具栏)
│   ├── Schema 管理 (新建/加载/保存)
│   ├── 解析按钮
│   └── 导出按钮
├── FileSelector (文件选择器)
│   └── 选择待解析文档
├── SchemaEditor (Schema 编辑区)
│   ├── JsonSchemaSection (主编辑器容器)
│   ├── SchemaEditorDialog (编辑对话框)
│   ├── JsonSchemaPreviewPane (预览面板)
│   ├── TreeSchemaNode (树形节点)
│   ├── FieldConfigDialog (字段配置)
│   ├── JsonSchemaCodeEditor (Monaco 编辑器)
│   ├── SchemaTemplateFactory (模板工厂)
│   ├── ParseConfigPanel (解析配置)
│   └── ExportConfigPanel (导出配置)
├── ResultPreview (结果预览)
│   ├── 树形视图
│   ├── JSON 视图
│   └── 统计信息
└── ExportConfig (导出配置)
    ├── 列配置
    ├── 样式配置
    └── 导出格式选择
```

---

## 📁 核心文件清单

### GUI 层 (15个文件)

| 文件路径 | 职责 |
|---------|------|
| `Client/GUI/components/ProjectPage.MainPanel/DocParser/DocParserPanel.vue` | 主容器,协调所有子组件 |
| `Client/GUI/components/ProjectPage.MainPanel/DocParser/TopBar.vue` | 工具栏,提供 Schema 管理和操作按钮 |
| `Client/GUI/components/ProjectPage.MainPanel/DocParser/FileSelector.vue` | 文件选择器,选择待解析文档 |
| `Client/GUI/components/ProjectPage.MainPanel/DocParser/ResultPreview.vue` | 解析结果预览(树形+JSON) |
| `Client/GUI/components/ProjectPage.MainPanel/DocParser/ExportConfig.vue` | Excel 导出配置 |
| `Client/GUI/components/ProjectPage.MainPanel/DocParser/SchemaEditor/` | Schema 编辑器子组件(9个) |

### Store 层 (7个文件)

| 文件路径 | 职责 |
|---------|------|
| `Client/stores/projectPage/docParser/docParser.store.ts` | 主状态管理 Store |
| `Client/stores/projectPage/docParser/docParser.types.ts` | 类型定义 |
| `Client/stores/projectPage/docParser/docParser.schemaUtils.ts` | Schema 工具函数 |
| `Client/stores/projectPage/docParser/docParser.mock.ts` | Mock 数据 |
| `Client/stores/projectPage/docParser/parser.ts` | 解析逻辑封装 |
| `Client/stores/projectPage/docParser/exporter.ts` | 导出逻辑封装 |
| `Client/stores/projectPage/docParser/index.ts` | 统一导出 |

### Service 层 (6个文件)

| 文件路径 | 职责 |
|---------|------|
| `Client/Service/docParser/regexEngine.ts` | 正则表达式引擎 |
| `Client/Service/docParser/schemaValidator.ts` | Schema 验证器 |
| `Client/Service/docParser/documentParser.ts` | 文档解析器 |
| `Client/Service/docParser/excelExporter.ts` | Excel 导出器 |
| `Client/Service/docParser/docParser.service.types.ts` | Service 层类型 |
| `Client/Service/docParser/index.ts` | 统一导出 |

### 扩展文件

| 文件路径 | 修改内容 |
|---------|---------|
| `Client/stores/projectPage/DataSource.ts` | 新增 5 个 DocParser 相关方法 |
| `Client/stores/projectPage/Markdown/types.ts` | MarkdownTab 扩展 type 字段 |
| `Client/GUI/components/ProjectPage.MainPanel/PaneSystem/PaneContent.vue` | 支持 docparser 标签页类型 |
| `Client/GUI/components/ProjectPage.Navigation/ProjectNavbar.vue` | 添加文档解析器入口 |
| `Client/stores/projectPage/Markdown/markdown.store.ts` | 新增 openDocParser() 方法 |
| `package.json` | 新增依赖: xlsx, @guolao/vue-monaco-editor |

---

## 🔧 技术实现细节

### 1. JSON Schema 扩展

#### 自定义扩展字段

DocParser 在标准 JSON Schema 基础上扩展了两个自定义字段:

```typescript
interface DocParserSchemaField extends JsonSchemaField {
  'x-parse'?: ParseMetadata      // 解析规则
  'x-export'?: ExportMetadata    // 导出配置
}

interface ParseMetadata {
  pattern: string                // 正则表达式
  flags?: string                 // 正则标志(g, i, m, s, u, y)
  mode: 'extract' | 'split' | 'validate'  // 解析模式
  captureGroups?: number[]       // 捕获组索引
  matchConditions?: {            // 匹配条件
    startsWith?: boolean
    endsWith?: boolean
    wholeWord?: boolean
  }
}

interface ExportMetadata {
  columnName: string             // 列名
  columnOrder?: number           // 列顺序
  columnWidth?: number           // 列宽度
  format?: string                // 格式化字符串
}
```

#### Schema 示例

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "x-parse": {
          "pattern": "^# (.+)$",
          "mode": "extract",
          "captureGroups": [1],
          "matchConditions": { "startsWith": true }
        },
        "x-export": {
          "columnName": "标题",
          "columnOrder": 1,
          "columnWidth": 30
        }
      },
      "content": {
        "type": "string",
        "x-parse": {
          "pattern": "(?<=# .+\\n)([\\s\\S]+?)(?=\\n#|$)",
          "mode": "extract",
          "flags": "g"
        },
        "x-export": {
          "columnName": "内容",
          "columnOrder": 2,
          "columnWidth": 50
        }
      }
    }
  }
}
```

### 2. 正则表达式引擎

#### RegexEngine 核心方法

```typescript
class RegexEngine {
  // 执行单次匹配
  execute(text: string, config: RegexEngineConfig): RegexMatch {
    const regex = new RegExp(config.pattern, config.flags)
    const match = regex.exec(text)
    
    if (!match) return null
    
    return {
      fullMatch: match[0],
      captureGroups: config.captureGroups?.map(i => match[i]) || [],
      index: match.index
    }
  }
  
  // 执行全局匹配
  executeGlobal(text: string, config: RegexEngineConfig): RegexMatch[] {
    const matches: RegexMatch[] = []
    const regex = new RegExp(config.pattern, config.flags + 'g')
    
    let match: RegExpExecArray | null
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        fullMatch: match[0],
        captureGroups: config.captureGroups?.map(i => match[i]) || [],
        index: match.index
      })
    }
    
    return matches
  }
  
  // 按行匹配
  matchLines(text: string, config: RegexEngineConfig): Array<{
    lineNumber: number
    lineContent: string
    match: RegexMatch
  }> {
    const lines = text.split('\n')
    const results = []
    
    lines.forEach((line, index) => {
      const match = this.execute(line, config)
      if (match) {
        results.push({
          lineNumber: index + 1,
          lineContent: line,
          match
        })
      }
    })
    
    return results
  }
}
```

### 3. 文档解析器

#### DocumentParser 解析流程

```typescript
class DocumentParser {
  parse(content: string, schema: DocParserSchema): ParsedData {
    // 1. 验证 Schema
    const validation = schemaValidator.validate(schema)
    if (!validation.isValid) {
      throw new Error(`Schema 验证失败: ${validation.errors.join(', ')}`)
    }
    
    // 2. 根据 Schema 类型选择解析策略
    if (schema.type === 'array') {
      return this.parseArray(content, schema)
    } else if (schema.type === 'object') {
      return this.parseObject(content, schema)
    }
    
    throw new Error(`不支持的 Schema 类型: ${schema.type}`)
  }
  
  private parseArray(content: string, schema: DocParserSchema): any[] {
    const items = schema.items
    const results = []
    
    // 3. 使用 RegexEngine 执行全局匹配
    if (items['x-parse']) {
      const config = regexEngine.fromParseMetadata(items['x-parse'])
      const matches = regexEngine.executeGlobal(content, config)
      
      // 4. 对每个匹配项解析子对象
      matches.forEach(match => {
        const item = this.parseObject(match.fullMatch, items)
        results.push(item)
      })
    }
    
    return results
  }
  
  private parseObject(content: string, schema: DocParserSchema): Record<string, any> {
    const result: Record<string, any> = {}
    
    // 5. 遍历对象属性
    Object.entries(schema.properties || {}).forEach(([key, fieldSchema]) => {
      if (fieldSchema['x-parse']) {
        const config = regexEngine.fromParseMetadata(fieldSchema['x-parse'])
        const match = regexEngine.execute(content, config)
        
        if (match) {
          // 6. 提取捕获组或完整匹配
          result[key] = match.captureGroups?.length > 0 
            ? match.captureGroups[0] 
            : match.fullMatch
        }
      }
    })
    
    return result
  }
}
```

### 4. Excel 导出器

#### ExcelExporter 核心实现

```typescript
import * as XLSX from 'xlsx'

class ExcelExporter {
  export(
    data: ParsedData, 
    config: ExportConfig, 
    sheetName: string = 'Sheet1'
  ): ArrayBuffer {
    // 1. 构建表头
    const headers = this.buildHeaders(config)
    
    // 2. 转换数据行
    const rows = this.buildRows(data, config)
    
    // 3. 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    
    // 4. 设置列宽
    worksheet['!cols'] = config.columns.map(col => ({
      wch: col.width || 15
    }))
    
    // 5. 冻结首行
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }
    
    // 6. 创建工作簿
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    // 7. 导出为 ArrayBuffer
    const buffer = XLSX.write(workbook, { 
      type: 'array', 
      bookType: 'xlsx' 
    })
    
    return buffer
  }
  
  exportCSV(data: ParsedData, config: ExportConfig): string {
    const headers = this.buildHeaders(config)
    const rows = this.buildRows(data, config)
    
    const csvLines = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    
    return csvLines.join('\n')
  }
  
  private buildHeaders(config: ExportConfig): string[] {
    return config.columns
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(col => col.name)
  }
  
  private buildRows(data: ParsedData, config: ExportConfig): any[][] {
    return data.map(item => 
      config.columns
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(col => item[col.field] || '')
    )
  }
}
```

### 5. 标签页集成

#### 扩展 MarkdownTab 类型

```typescript
interface MarkdownTab {
  id: string
  filePath?: string
  fileName: string
  content?: string
  type?: 'markdown' | 'docparser'  // 新增: 标签页类型
  isDirty?: boolean
  mode?: 'edit' | 'view'
  scrollPosition?: number
}
```

#### 在 Markdown Store 中添加打开方法

```typescript
// Client/stores/projectPage/Markdown/markdown.store.ts
const openDocParser = (): MarkdownTab => {
  const tab: MarkdownTab = {
    id: nanoid(),
    fileName: '文档解析器',
    type: 'docparser',  // 标记为 docparser 类型
    isDirty: false
  }
  
  openTabs.value.push(tab)
  
  // 确保有 Pane 布局
  if (!paneLayoutStore.focusedPane) {
    paneLayoutStore.resetToDefaultLayout()
  }
  
  // 在焦点 Pane 中打开
  paneLayoutStore.openTabInPane(paneLayoutStore.focusedPane.id, tab.id)
  
  return tab
}
```

#### 在 PaneContent 中支持渲染

```vue
<!-- Client/GUI/components/ProjectPage.MainPanel/PaneSystem/PaneContent.vue -->
<template>
  <div class="pane-content">
    <!-- Markdown 标签页 -->
    <MarkdownTab 
      v-if="activeTab && activeTab.type === 'markdown'"
      :tab="activeTab" 
    />
    
    <!-- DocParser 标签页 -->
    <DocParserPanel 
      v-else-if="activeTab && activeTab.type === 'docparser'"
      :tab="activeTab"
    />
  </div>
</template>
```

---

## 🗄️ 状态管理详解

### DocParserStore 核心状态

```typescript
interface DocParserStore {
  // 项目和 Schema
  projectPath: Ref<string>
  currentSchema: Ref<DocParserSchema | null>
  
  // 文档和数据
  sourceContent: Ref<string>
  parsedData: Ref<ParsedData | null>
  
  // 导出配置
  exportConfig: Ref<ExportConfig | null>
  
  // UI 状态
  loading: Ref<boolean>
  error: Ref<string | null>
  
  // 统计信息
  statistics: ComputedRef<{
    itemCount: number
    fieldCount: number
    dataSize: string
  }>
}
```

### 关键方法

#### Schema 管理

```typescript
// 初始化项目
initProject(path: string): void

// 更新 Schema
updateSchema(schema: JsonSchema): void

// 清空 Schema
clearSchema(): void
```

#### 文档操作

```typescript
// 加载文档内容
loadDocument(content: string): Promise<void>

// 选择文档文件
selectDocument(filePath: string): Promise<void>
```

#### 解析与导出

```typescript
// 执行解析
parse(): Promise<void> {
  try {
    loading.value = true
    error.value = null
    
    // 调用 Service 层解析
    const result = await parseDocument(
      sourceContent.value, 
      currentSchema.value
    )
    
    parsedData.value = result
    
    // 自动生成导出配置
    exportConfig.value = extractExportConfig(currentSchema.value)
    
    $q.notify({
      type: 'positive',
      message: `解析成功,共 ${result.length} 条数据`
    })
  } catch (err) {
    error.value = err.message
    $q.notify({
      type: 'negative',
      message: `解析失败: ${err.message}`
    })
  } finally {
    loading.value = false
  }
}

// 导出 Excel
exportExcel(outputPath: string): Promise<void> {
  try {
    loading.value = true
    
    // 调用 Service 层导出
    const buffer = await exportToExcel(
      parsedData.value,
      exportConfig.value,
      '解析结果'
    )
    
    // 调用 DataSource 保存文件
    await DataSource.saveExportedFile(outputPath, buffer)
    
    $q.notify({
      type: 'positive',
      message: '导出成功'
    })
  } catch (err) {
    error.value = err.message
    $q.notify({
      type: 'negative',
      message: `导出失败: ${err.message}`
    })
  } finally {
    loading.value = false
  }
}
```

---

## 🔗 DataSource 扩展

### 新增的 DocParser 方法

```typescript
// Client/stores/projectPage/DataSource.ts

export const DataSource = {
  // ...现有方法
  
  // 列出项目中的 Schema 文件
  async listSchemaFiles(projectPath: string): Promise<string[]> {
    if (Environment.shouldUseMock()) {
      // Mock: 返回示例 Schema 列表
      return [
        '.docparser/markdown-parser.schema.json',
        '.docparser/log-parser.schema.json'
      ]
    }
    
    // TODO: IPC 调用
    // return window.nimbria.docParser.listSchemas({ projectPath })
  },
  
  // 加载 Schema 文件
  async loadSchema(schemaPath: string): Promise<string> {
    if (Environment.shouldUseMock()) {
      // Mock: 返回示例 Schema
      return JSON.stringify(mockSchema, null, 2)
    }
    
    // TODO: IPC 调用
    // return window.nimbria.docParser.loadSchema({ schemaPath })
  },
  
  // 保存 Schema 文件
  async saveSchema(schemaPath: string, schemaContent: string): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[DocParser Mock] 保存 Schema:', schemaPath)
      return true
    }
    
    // TODO: IPC 调用
    // return window.nimbria.docParser.saveSchema({ schemaPath, content: schemaContent })
  },
  
  // 读取待解析文档
  async readDocumentFile(filePath: string): Promise<string> {
    if (Environment.shouldUseMock()) {
      // Mock: 返回示例文档
      return mockDocument
    }
    
    // TODO: IPC 调用
    // return window.nimbria.docParser.readDocument({ filePath })
  },
  
  // 保存导出文件
  async saveExportedFile(filePath: string, content: ArrayBuffer | string): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[DocParser Mock] 保存导出文件:', filePath, content.byteLength || content.length, 'bytes')
      return true
    }
    
    // TODO: IPC 调用
    // return window.nimbria.docParser.saveExport({ filePath, content })
  }
}
```

---

## 🎨 UI/UX 设计特点

### 1. 双视图编辑

**树形编辑器 + 代码编辑器**

- 树形视图: 直观的结构化展示,支持拖拽、展开/折叠
- 代码编辑器: 基于 Monaco Editor,提供语法高亮和格式化
- 实时同步: 两种视图的编辑实时互相同步

### 2. 模板工厂

**快速创建常用结构**

```typescript
class SchemaTemplateFactory {
  createMarkdownParser(): DocParserSchema {
    return {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', 'x-parse': { pattern: '^# (.+)$', mode: 'extract' } },
          content: { type: 'string', 'x-parse': { pattern: '(?<=# .+\\n)([\\s\\S]+?)(?=\\n#|$)', mode: 'extract' } }
        }
      }
    }
  }
  
  createLogParser(): DocParserSchema { /* ... */ }
  createCSVParser(): DocParserSchema { /* ... */ }
}
```

### 3. 实时预览

**树形 + JSON 双视图**

- 树形视图: 展示解析后的数据结构,支持展开/折叠
- JSON 视图: 显示完整的 JSON 数据,支持复制和下载
- 统计信息: 显示项数、字段数、数据大小

### 4. 分栏布局

```
┌─────────────────────────────────────────────────┐
│ TopBar (工具栏)                                  │
├──────────────────┬──────────────────────────────┤
│ 左侧 (50%)       │ 右侧 (50%)                   │
│                  │                              │
│ FileSelector     │ ResultPreview                │
│ (文件选择)       │ (结果预览)                   │
│                  │                              │
│ SchemaEditor     │ - 树形视图                   │
│ (Schema编辑)     │ - JSON视图                   │
│                  │ - 统计信息                   │
│                  │                              │
│ ExportConfig     │                              │
│ (导出配置)       │                              │
└──────────────────┴──────────────────────────────┘
```

---

## 🚀 性能优化

### 1. 正则引擎优化

- **预编译正则**: 缓存编译后的正则对象,避免重复编译
- **增量匹配**: 对大文件采用流式处理,避免一次性加载
- **并发解析**: 对独立字段使用 Promise.all 并发解析

### 2. 数据预览优化

- **虚拟滚动**: 大数据量时使用虚拟滚动,只渲染可见部分
- **懒加载**: 树形视图按需加载子节点
- **防抖渲染**: 解析过程中防抖更新预览,避免频繁渲染

### 3. Excel 导出优化

- **流式写入**: 大数据量时使用流式 API 写入 Excel
- **Web Worker**: 在 Worker 线程中执行导出,避免阻塞 UI
- **压缩优化**: 启用 XLSX 的压缩选项,减小文件体积

---

## 🧪 测试策略

### 单元测试重点

1. **RegexEngine**
   - 各种正则模式测试
   - 捕获组提取测试
   - 边界条件测试

2. **DocumentParser**
   - 简单对象解析
   - 数组解析
   - 嵌套结构解析
   - 错误处理

3. **ExcelExporter**
   - 数据行构建
   - 列配置应用
   - CSV 导出
   - 样式设置

### 集成测试重点

1. **完整解析流程**: Schema 编辑 → 文档选择 → 解析 → 预览 → 导出
2. **Schema 管理**: 新建 → 编辑 → 保存 → 加载
3. **错误恢复**: 解析失败、导出失败的恢复

### E2E 测试场景

1. **Markdown 文档解析**: 解析 Markdown 文件中的标题和内容
2. **日志文件解析**: 解析服务器日志文件
3. **CSV 数据提取**: 从 CSV 文件提取指定列
4. **复杂嵌套结构**: 解析包含数组和对象的复杂文档

---

## 🔧 开发指南

### 添加新的解析模式

1. **扩展 ParseMode 枚举**
   ```typescript
   type ParseMode = 'extract' | 'split' | 'validate' | 'your-new-mode'
   ```

2. **在 RegexEngine 中实现**
   ```typescript
   executeYourNewMode(text: string, config: RegexEngineConfig): YourResult {
     // 实现逻辑
   }
   ```

3. **在 DocumentParser 中集成**
   ```typescript
   if (metadata.mode === 'your-new-mode') {
     return regexEngine.executeYourNewMode(content, config)
   }
   ```

### 添加新的导出格式

1. **扩展 ExportFormat 枚举**
   ```typescript
   type ExportFormat = 'xlsx' | 'csv' | 'json' | 'your-new-format'
   ```

2. **实现导出器**
   ```typescript
   class YourNewFormatExporter {
     export(data: ParsedData, config: ExportConfig): Buffer {
       // 实现逻辑
     }
   }
   ```

3. **在 exporter.ts 中注册**
   ```typescript
   const exporters = {
     xlsx: new ExcelExporter(),
     csv: new CSVExporter(),
     'your-new-format': new YourNewFormatExporter()
   }
   ```

### 添加 Schema 模板

1. **在 SchemaTemplateFactory 中添加**
   ```typescript
   createYourTemplate(): DocParserSchema {
     return {
       type: 'array',
       items: {
         // 定义结构
       }
     }
   }
   ```

2. **在 UI 中添加按钮**
   ```vue
   <q-btn 
     label="您的模板" 
     @click="loadTemplate('your-template')" 
   />
   ```

---

## 📊 监控与调试

### 关键指标

1. **解析性能**
   - 文档大小
   - 解析耗时
   - 内存占用

2. **导出性能**
   - 数据行数
   - 导出耗时
   - 文件大小

### 调试工具

1. **浏览器控制台**
   ```typescript
   const store = useDocParserStore()
   console.log('当前 Schema:', store.currentSchema)
   console.log('解析结果:', store.parsedData)
   console.log('导出配置:', store.exportConfig)
   ```

2. **正则测试工具**
   ```typescript
   // 在 RegexEngine 中启用调试模式
   const engine = new RegexEngine({ debug: true })
   engine.execute(text, config) // 输出详细匹配信息
   ```

---

## 🔄 版本历史与路线图

### 当前版本 (v1.0)

- ✅ 基础 Schema 编辑功能
- ✅ 正则表达式解析引擎
- ✅ Excel/CSV 导出
- ✅ 实时预览
- ✅ 标签页集成
- ✅ Mock 数据支持

### 计划中的功能 (v1.1+)

- [ ] 更多导出格式 (JSON, XML, SQL)
- [ ] Schema 模板库扩展
- [ ] 批量文档处理
- [ ] 解析结果对比功能
- [ ] 历史记录管理
- [ ] Electron 层文件操作实现
- [ ] 正则表达式调试器
- [ ] 智能 Schema 推荐 (AI 辅助)

---

## 📖 相关文档

- [架构设计总览](./架构设计总览.md)
- [Pane分屏系统设计文档](./Pane分屏系统设计文档.md)
- [Markdown编辑系统设计文档](./Markdown编辑系统设计文档.md)
- [DocParser系统实现总结_2025年10月12日](../总结/Nimbria_DocParser系统实现总结_2025年10月12日_1760270596000.md)
- [DocParser系统设计文档 (Design)](../Design/DocPaser系统/Plan1.md)

---

**最后更新**: 2025年10月12日  
**负责人**: Nimbria 开发团队  
**代码行数**: ~4000 行 (GUI: ~2000 行, Store: ~800 行, Service: ~1200 行)

