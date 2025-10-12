# DocParser 系统实施计划

## 一、系统概述

**系统名称**：DocParser（文档解析器）  
**功能定位**：将固定格式的文档按照 JSON Schema 和正则规则转换为结构化数据，并导出为 Excel 格式  
**数据存储**：项目目录下的 `.docparser/` 文件夹（自动创建）  
**UI布局**：长页面 + Flex + Overflow 滚动（参照 Markdown 系统的扁平化架构）

---

## 二、文件架构修改树

```
Nimbria/
├── Client/
│   ├── GUI/
│   │   ├── components/
│   │   │   └── ProjectPage.MainPanel/
│   │   │       ├── DocParser/                          [🆕 新增目录]
│   │   │       │   ├── DocParserPanel.vue             [🆕 主容器]
│   │   │       │   ├── TopBar.vue                      [🆕 顶部工具栏]
│   │   │       │   ├── SchemaEditor/                  [🆕 Schema编辑区]
│   │   │       │   │   ├── JsonSchemaSection.vue     [📋 从JiuZhang复制]
│   │   │       │   │   ├── SchemaEditorDialog.vue    [📋 从JiuZhang复制]
│   │   │       │   │   ├── TreeSchemaNode.vue        [📋 从JiuZhang复制]
│   │   │       │   │   ├── FieldConfigDialog.vue     [📋 从JiuZhang复制]
│   │   │       │   │   ├── ObjectFieldManager.vue    [📋 从JiuZhang复制]
│   │   │       │   │   ├── JsonSchemaCodeEditor.vue  [📋 从JiuZhang复制]
│   │   │       │   │   ├── JsonSchemaCodePreview.vue [📋 从JiuZhang复制]
│   │   │       │   │   └── JsonSchemaPreviewPane.vue [📋 从JiuZhang复制]
│   │   │       │   ├── DocumentProcessor/             [🆕 文档处理区]
│   │   │       │   │   ├── FileSelector.vue          [🆕 文件选择]
│   │   │       │   │   ├── ParserEngine.vue          [🆕 解析引擎控制]
│   │   │       │   │   └── ResultPreview.vue         [🆕 结果预览 - Tree+JSON双栏]
│   │   │       │   └── ExcelExporter/                 [🆕 Excel导出区]
│   │   │       │       ├── ExportConfig.vue          [🆕 导出配置]
│   │   │       │       └── ExcelPreview.vue          [🆕 Excel预览表格]
│   │   │       ├── Markdown/                          [✅ 已存在-参考架构]
│   │   │       ├── PaneSystem/                        [✅ 已存在]
│   │   │       └── AutoSave/                          [✅ 已存在]
│   │   └── PagesLayout/
│   │       ├── ProjectPage.DetachedPage.vue           [✏️ 修改-添加DocParser路由]
│   │       └── ProjectPage.Shell.vue                  [✏️ 修改-添加DocParser入口]
│   ├── stores/
│   │   └── projectPage/
│   │       ├── docParser/                             [🆕 新增目录]
│   │       │   ├── index.ts                           [🆕 导出]
│   │       │   ├── docParser.store.ts                 [🆕 主Store]
│   │       │   ├── docParser.utils.ts                 [🆕 工具函数]
│   │       │   ├── docParser.schemaUtils.ts          [📋 从JiuZhang精简]
│   │       │   ├── docParser.parser.ts               [🆕 解析引擎]
│   │       │   ├── docParser.exporter.ts             [🆕 Excel导出]
│   │       │   └── types.ts                           [🆕 类型定义]
│   │       ├── Markdown/                              [✅ 已存在-参考架构]
│   │       ├── paneLayout/                            [✅ 已存在]
│   │       ├── DataSource.ts                          [✏️ 修改-添加DocParser数据源]
│   │       └── index.ts                               [✏️ 修改-导出DocParser]
│   ├── Service/
│   │   └── docParser/                                 [🆕 新增目录]
│   │       ├── index.ts                               [🆕 导出]
│   │       ├── fileService.ts                         [🆕 文件读写]
│   │       ├── schemaService.ts                       [🆕 Schema管理]
│   │       └── excelService.ts                        [🆕 Excel生成-使用xlsx库]
│   ├── Types/
│   │   └── docParser/                                 [🆕 新增目录]
│   │       ├── index.ts                               [🆕 导出]
│   │       ├── schema.ts                              [🆕 Schema类型]
│   │       ├── parser.ts                              [🆕 解析器类型]
│   │       └── exporter.ts                            [🆕 导出器类型]
│   └── Utils/
│       └── docParser/                                 [🆕 新增目录]
│           ├── index.ts                               [🆕 导出]
│           ├── regexEngine.ts                         [🆕 正则引擎]
│           ├── validation.ts                          [🆕 验证工具]
│           └── formatting.ts                          [🆕 格式化工具]
└── src-electron/                                       [可选-后端支持]
    └── services/
        └── docParserService.ts                         [🆕 Electron端文件操作]

```

---

## 三、关键架构设计

### 3.1 长页面布局设计（避免嵌套过深）

**参考 Markdown 系统的扁平化架构**：

```vue
<!-- DocParserPanel.vue - 主容器 -->
<template>
  <div class="docparser-panel">
    <!-- 顶部工具栏（固定高度） -->
    <TopBar class="topbar" />
    
    <!-- 主内容区（可滚动长页面） -->
    <div class="content-scroll-area">
      <!-- Section 1: Schema 编辑器 -->
      <section class="section-card">
        <div class="section-header">
          <span>Schema 与解析规则定义</span>
          <div class="section-actions">
            <q-btn @click="handleLoadSchema" />
            <q-btn @click="handleSaveSchema" />
          </div>
        </div>
        <div class="section-body">
          <JsonSchemaSection 
            v-model="currentSchema"
            @update:modelValue="handleSchemaChange"
          />
        </div>
      </section>

      <!-- Section 2: 文档选择与解析 -->
      <section class="section-card">
        <div class="section-header">
          <span>文档处理</span>
          <div class="section-actions">
            <q-btn @click="handleSelectDocument" />
            <q-btn @click="handleParse" color="primary" />
          </div>
        </div>
        <div class="section-body">
          <FileSelector v-model:filePath="selectedFilePath" />
        </div>
      </section>

      <!-- Section 3: 解析结果（Tree + JSON 双栏） -->
      <section class="section-card" v-if="parsedData">
        <div class="section-header">
          <span>解析结果</span>
          <q-toggle v-model="viewMode" />
        </div>
        <div class="section-body result-split-view">
          <!-- 左侧：Element Plus Tree -->
          <div class="panel tree-panel">
            <el-tree :data="treeData" :props="treeProps" />
          </div>
          <!-- 右侧：JSON 预览 -->
          <div class="panel json-panel">
            <pre>{{ formattedJson }}</pre>
          </div>
        </div>
      </section>

      <!-- Section 4: Excel 导出 -->
      <section class="section-card" v-if="parsedData">
        <div class="section-header">
          <span>Excel 导出</span>
          <q-btn @click="handleExportExcel" color="positive" />
        </div>
        <div class="section-body">
          <ExcelPreview :data="parsedData" :config="exportConfig" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.docparser-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* 🔑 关键：防止整体滚动 */
}

.topbar {
  flex-shrink: 0;
  height: 56px;
}

.content-scroll-area {
  flex: 1;
  min-height: 0; /* 🔑 关键：触发 Flex 布局计算 */
  overflow-y: auto; /* 🔑 关键：启用滚动 */
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  flex-shrink: 0; /* 🔑 关键：固定高度，不收缩 */
}

.result-split-view {
  display: flex;
  gap: 16px;
  height: 600px; /* 固定高度，内部滚动 */
}

.panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto; /* 内部滚动 */
}
</style>
```

**关键点**：
1. **顶层 `overflow: hidden`** - 防止整体滚动
2. **`content-scroll-area` 的 `min-height: 0` + `overflow-y: auto`** - 触发滚动
3. **Section 卡片 `flex-shrink: 0`** - 固定大小，长页面布局
4. **双栏内部 `overflow-y: auto`** - 内部独立滚动

---

### 3.2 Store 架构设计（参考 Markdown Store）

**扁平化设计，避免嵌套过深**：

```typescript
// docParser.store.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DocParserSchema, ParsedData, ExportConfig } from './types'
import { parseDocument } from './docParser.parser'
import { exportToExcel } from './docParser.exporter'
import { DocParserDataSource } from '@stores/projectPage/DataSource'

export const useDocParserStore = defineStore('projectPage-docParser', () => {
  // ==================== 状态 ====================
  
  const projectPath = ref<string>('')
  const currentSchema = ref<DocParserSchema | null>(null)
  const selectedFilePath = ref<string>('')
  const sourceContent = ref<string>('')
  const parsedData = ref<ParsedData | null>(null)
  const exportConfig = ref<ExportConfig | null>(null)
  
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // ==================== 计算属性 ====================
  
  const isSchemaValid = computed(() => {
    return currentSchema.value && currentSchema.value.properties
  })
  
  const canParse = computed(() => {
    return isSchemaValid.value && sourceContent.value.length > 0
  })
  
  const canExport = computed(() => {
    return parsedData.value !== null
  })
  
  // ==================== 方法 ====================
  
  /**
   * 加载 Schema
   */
  const loadSchema = async (schemaPath: string) => {
    try {
      loading.value = true
      const content = await DocParserDataSource.readSchemaFile(schemaPath)
      currentSchema.value = JSON.parse(content)
    } catch (err) {
      error.value = `加载 Schema 失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 保存 Schema
   */
  const saveSchema = async (schemaName: string) => {
    if (!currentSchema.value) return
    
    try {
      loading.value = true
      const schemaPath = `${projectPath.value}/.docparser/${schemaName}.json`
      await DocParserDataSource.writeSchemaFile(schemaPath, JSON.stringify(currentSchema.value, null, 2))
    } catch (err) {
      error.value = `保存 Schema 失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 选择文档
   */
  const selectDocument = async (filePath: string) => {
    try {
      loading.value = true
      selectedFilePath.value = filePath
      sourceContent.value = await DocParserDataSource.readDocumentFile(filePath)
    } catch (err) {
      error.value = `读取文档失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 解析文档
   */
  const parse = async () => {
    if (!canParse.value) {
      throw new Error('解析条件不满足')
    }
    
    try {
      loading.value = true
      parsedData.value = await parseDocument(
        sourceContent.value,
        currentSchema.value!
      )
      
      // 自动提取导出配置
      exportConfig.value = extractExportConfigFromSchema(currentSchema.value!)
    } catch (err) {
      error.value = `解析失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 导出 Excel
   */
  const exportExcel = async (outputPath: string) => {
    if (!canExport.value || !exportConfig.value) {
      throw new Error('导出条件不满足')
    }
    
    try {
      loading.value = true
      await exportToExcel(
        parsedData.value!,
        exportConfig.value,
        outputPath
      )
    } catch (err) {
      error.value = `导出失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 从 Schema 提取导出配置
   */
  const extractExportConfigFromSchema = (schema: DocParserSchema): ExportConfig => {
    // 实现见后续章节
    return { columns: [], sectionHeaders: [] }
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    projectPath,
    currentSchema,
    selectedFilePath,
    sourceContent,
    parsedData,
    exportConfig,
    loading,
    error,
    
    // 计算属性
    isSchemaValid,
    canParse,
    canExport,
    
    // 方法
    loadSchema,
    saveSchema,
    selectDocument,
    parse,
    exportExcel
  }
})
```

---

### 3.3 JSON Schema 扩展字段设计

**在 JiuZhang 的 Schema 基础上扩展解析和导出字段**：

```typescript
// types/docParser/schema.ts

import type { JsonSchema as BaseJsonSchema, JsonSchemaField as BaseJsonSchemaField } from '@types/shared'

// ==================== 扩展的 Schema 类型 ====================

export interface DocParserSchema extends BaseJsonSchema {
  properties: Record<string, DocParserSchemaField>
}

export interface DocParserSchemaField extends BaseJsonSchemaField {
  // 🆕 解析规则（正则）
  'x-parse'?: ParseMetadata
  
  // 🆕 导出配置
  'x-export'?: ExportMetadata
}

// ==================== 解析规则 ====================

export interface ParseMetadata {
  // 正则表达式（字符串形式）
  regex?: string
  
  // 正则 flags
  flags?: string  // 如 'gi', 'gm'
  
  // 匹配模式
  mode?: 'match' | 'split' | 'extract' | 'test'
  
  // 提取组（用于 extract 模式）
  captureGroup?: number  // 1, 2, 3...
  
  // 前置条件（可选）
  conditions?: {
    previousMatch?: string  // 前一个匹配的标识
    lineStart?: boolean     // 必须在行首
    afterEmpty?: boolean    // 必须在空行之后
  }
  
  // 示例（用于 UI 提示）
  examples?: string[]
}

// ==================== 导出配置 ====================

export interface ExportMetadata {
  type: 'column' | 'section-header' | 'merged-row' | 'ignore'
  columnName?: string
  order?: number
  width?: number
  mergeCols?: number  // 合并列数
  format?: {
    bold?: boolean
    fontSize?: number
    alignment?: 'left' | 'center' | 'right'
    background?: string
    border?: boolean
  }
}

// ==================== 导出配置结果 ====================

export interface ExportConfig {
  columns: Array<{
    field: string[]      // 字段路径
    name: string
    order: number
    width: number
    format?: ExportMetadata['format']
  }>
  sectionHeaders: Array<{
    field: string[]
    mergeCols: number
    format?: ExportMetadata['format']
  }>
}
```

**实际应用示例**：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "chapters": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "chapterTitle": {
            "type": "string",
            "description": "章节标题",
            "x-parse": {
              "regex": "^第[一二三四五六七八九十百]+章\\s+(.+)$",
              "mode": "extract",
              "captureGroup": 1,
              "conditions": {
                "lineStart": true
              }
            },
            "x-export": {
              "type": "section-header",
              "mergeCols": 3,
              "format": {
                "bold": true,
                "fontSize": 14,
                "alignment": "center",
                "background": "#f0f0f0"
              }
            }
          },
          "questions": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "questionNumber": {
                  "type": "string",
                  "x-parse": {
                    "regex": "^(\\d+)、",
                    "mode": "extract",
                    "captureGroup": 1
                  },
                  "x-export": {
                    "type": "column",
                    "columnName": "题号",
                    "order": 1,
                    "width": 8,
                    "format": {
                      "alignment": "center"
                    }
                  }
                },
                "questionContent": {
                  "type": "string",
                  "x-parse": {
                    "regex": "^\\d+、(.+?)(?=\\n答[：:])",
                    "flags": "s",
                    "mode": "extract",
                    "captureGroup": 1
                  },
                  "x-export": {
                    "type": "column",
                    "columnName": "题目内容",
                    "order": 2,
                    "width": 50
                  }
                },
                "answer": {
                  "type": "string",
                  "x-parse": {
                    "regex": "答[：:]\\s*(.+?)(?=\\n\\d+、|\\n第[一二三四五六七八九十百]+章|$)",
                    "flags": "s",
                    "mode": "extract",
                    "captureGroup": 1
                  },
                  "x-export": {
                    "type": "column",
                    "columnName": "答案",
                    "order": 3,
                    "width": 60
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 四、组件迁移与调整方案

### 4.1 从 JiuZhang 复制的组件（需调整）

**组件清单**：
1. `JsonSchemaSection.vue` - 主入口组件
2. `SchemaEditorDialog.vue` - Schema 编辑对话框
3. `TreeSchemaNode.vue` - 树节点组件
4. `FieldConfigDialog.vue` - 字段配置对话框
5. `ObjectFieldManager.vue` - 对象字段管理器
6. `JsonSchemaCodeEditor.vue` - 代码编辑器（Monaco）
7. `JsonSchemaCodePreview.vue` - 代码预览
8. `JsonSchemaPreviewPane.vue` - 预览面板

**调整步骤**：

#### Step 1: 使用 MCP 文件系统工具批量复制

```bash
# 源目录
source="JiuZhang-Novelstudio-Extract-llmbatch/llmbatch/webview/LlmBatch-Webview/src/components/LlmBatch/SystemPrompt/JsonSchemaEditor/"

# 目标目录
target="Nimbria-NovelStudio/Nimbria/Client/GUI/components/ProjectPage.MainPanel/DocParser/SchemaEditor/"
```

#### Step 2: 批量替换导入路径

| 原路径 | 新路径 |
|--------|--------|
| `@/stores/modules/LlmBatch/JsonSchemaUtils` | `@stores/projectPage/docParser/docParser.schemaUtils` |
| `@/stores/modules/LlmBatch/types` | `@types/docParser` |
| `@/stores/modules/LlmBatch` | `@stores/projectPage/docParser` |

#### Step 3: 移除不需要的功能

**FieldConfigDialog.vue** - 移除 LLM 生成相关：
- 移除 `LlmSchemaGeneratorDialog` 相关代码
- 移除 `useLlmBatchProviderStore` 和 `useLlmBatchModelStore` 引用

**JsonSchemaSection.vue** - 简化工具栏：
- 保留 "编辑 Schema"、"导入 JSON"
- 移除 "智能生成" 按钮（LLM 相关）

---

### 4.2 新增组件设计

#### 4.2.1 TopBar.vue

```vue
<template>
  <div class="docparser-topbar">
    <div class="topbar-left">
      <q-icon name="rule" size="md" />
      <span class="title">DocParser</span>
    </div>
    
    <div class="topbar-center">
      <!-- 当前 Schema 名称显示 -->
      <q-chip v-if="currentSchemaName" icon="schema" color="primary">
        {{ currentSchemaName }}
      </q-chip>
    </div>
    
    <div class="topbar-right">
      <q-btn-group flat>
        <q-btn icon="help_outline" flat dense>
          <q-tooltip>帮助文档</q-tooltip>
        </q-btn>
        <q-btn icon="settings" flat dense>
          <q-tooltip>设置</q-tooltip>
        </q-btn>
      </q-btn-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDocParserStore } from '@stores/projectPage/docParser'

const docParserStore = useDocParserStore()

const currentSchemaName = computed(() => {
  // 从当前 Schema 提取名称
  return 'demo-schema'
})
</script>
```

#### 4.2.2 FileSelector.vue

```vue
<template>
  <div class="file-selector">
    <q-file
      v-model="selectedFile"
      label="选择文档"
      outlined
      dense
      :filter="fileFilter"
      @update:model-value="handleFileChange"
    >
      <template #prepend>
        <q-icon name="attach_file" />
      </template>
    </q-file>
    
    <div v-if="fileInfo" class="file-info">
      <q-chip icon="description" color="primary">
        {{ fileInfo.name }}
      </q-chip>
      <span class="file-size">{{ formatFileSize(fileInfo.size) }}</span>
      <span class="file-chars">{{ fileInfo.chars }} 字符</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'file-loaded': [content: string]
}>()

const selectedFile = ref<File | null>(null)
const fileContent = ref<string>('')

const fileInfo = computed(() => {
  if (!selectedFile.value) return null
  return {
    name: selectedFile.value.name,
    size: selectedFile.value.size,
    chars: fileContent.value.length
  }
})

const fileFilter = (files: File[]) => {
  return files.filter(file => 
    file.name.endsWith('.txt') || file.name.endsWith('.md')
  )
}

const handleFileChange = async (file: File | null) => {
  if (!file) return
  
  try {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      fileContent.value = content
      emit('file-loaded', content)
    }
    reader.readAsText(file)
  } catch (error) {
    console.error('读取文件失败:', error)
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
</script>
```

#### 4.2.3 ResultPreview.vue（Tree + JSON 双栏）

```vue
<template>
  <div class="result-preview">
    <!-- 视图切换 -->
    <div class="view-controls">
      <q-btn-toggle
        v-model="viewMode"
        :options="[
          { label: '树形', value: 'tree' },
          { label: 'JSON', value: 'json' },
          { label: '双栏', value: 'split' }
        ]"
        dense
        flat
      />
    </div>
    
    <!-- 双栏布局 -->
    <div v-if="viewMode === 'split'" class="split-view">
      <!-- 左侧：Element Plus Tree -->
      <div class="panel tree-panel">
        <div class="panel-header">
          <span>结构化视图</span>
        </div>
        <div class="panel-body">
          <el-tree
            :data="treeData"
            :props="treeProps"
            default-expand-all
            :expand-on-click-node="false"
            node-key="id"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <q-icon :name="getNodeIcon(data.type)" size="16px" />
                <span class="node-label">{{ node.label }}</span>
                <span class="node-value" v-if="data.value">{{ formatValue(data.value) }}</span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>
      
      <!-- 右侧：JSON 预览 -->
      <div class="panel json-panel">
        <div class="panel-header">
          <span>JSON 数据</span>
          <q-btn icon="content_copy" size="sm" flat dense @click="handleCopyJson">
            <q-tooltip>复制 JSON</q-tooltip>
          </q-btn>
        </div>
        <div class="panel-body">
          <pre class="json-code">{{ formattedJson }}</pre>
        </div>
      </div>
    </div>
    
    <!-- 单栏视图 -->
    <div v-else class="single-view">
      <el-tree v-if="viewMode === 'tree'" :data="treeData" :props="treeProps" />
      <pre v-else class="json-code">{{ formattedJson }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElTree } from 'element-plus'

const props = defineProps<{
  data: any
}>()

const viewMode = ref<'tree' | 'json' | 'split'>('split')

const treeData = computed(() => {
  return convertToTreeData(props.data)
})

const treeProps = {
  label: 'label',
  children: 'children'
}

const formattedJson = computed(() => {
  return JSON.stringify(props.data, null, 2)
})

const convertToTreeData = (data: any, parentPath = ''): any[] => {
  if (Array.isArray(data)) {
    return data.map((item, index) => ({
      id: `${parentPath}[${index}]`,
      label: `[${index}]`,
      type: 'array-item',
      children: convertToTreeData(item, `${parentPath}[${index}]`)
    }))
  } else if (typeof data === 'object' && data !== null) {
    return Object.entries(data).map(([key, value]) => {
      const nodePath = parentPath ? `${parentPath}.${key}` : key
      
      if (typeof value === 'object' && value !== null) {
        return {
          id: nodePath,
          label: key,
          type: Array.isArray(value) ? 'array' : 'object',
          children: convertToTreeData(value, nodePath)
        }
      } else {
        return {
          id: nodePath,
          label: key,
          type: 'value',
          value: value,
          children: []
        }
      }
    })
  }
  return []
}

const getNodeIcon = (type: string) => {
  const iconMap = {
    'array': 'data_array',
    'array-item': 'remove',
    'object': 'data_object',
    'value': 'label'
  }
  return iconMap[type] || 'label'
}

const formatValue = (value: any): string => {
  const str = String(value)
  return str.length > 50 ? str.substring(0, 50) + '...' : str
}

const handleCopyJson = () => {
  navigator.clipboard.writeText(formattedJson.value)
}
</script>

<style scoped>
.result-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.view-controls {
  margin-bottom: 16px;
}

.split-view {
  display: flex;
  gap: 16px;
  height: 600px;
  flex: 1;
  min-height: 0;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--obsidian-border);
  border-radius: 4px;
  overflow: hidden;
}

.panel-header {
  height: 40px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--obsidian-bg-secondary);
  border-bottom: 1px solid var(--obsidian-border);
  font-weight: 600;
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-value {
  font-size: 12px;
  color: var(--obsidian-text-secondary);
  margin-left: auto;
}

.json-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
  color: var(--obsidian-text-primary);
}
</style>
```

---

## 五、核心逻辑实现

### 5.1 解析引擎 (`docParser.parser.ts`)

```typescript
import type { DocParserSchema, ParsedData } from './types'

interface ParseRule {
  path: string[]
  regex: RegExp
  mode: 'match' | 'split' | 'extract' | 'test'
  captureGroup?: number
  conditions?: any
}

/**
 * 从 Schema 提取所有解析规则
 */
export function extractParseRules(schema: DocParserSchema): ParseRule[] {
  const rules: ParseRule[] = []
  
  function traverse(node: any, path: string[]) {
    if (node['x-parse']) {
      const parseConfig = node['x-parse']
      rules.push({
        path: [...path],
        regex: new RegExp(parseConfig.regex!, parseConfig.flags || ''),
        mode: parseConfig.mode || 'match',
        captureGroup: parseConfig.captureGroup,
        conditions: parseConfig.conditions
      })
    }
    
    if (node.properties) {
      Object.entries(node.properties).forEach(([key, subNode]) => {
        traverse(subNode, [...path, key])
      })
    }
    
    if (node.items) {
      traverse(node.items, [...path, '[]'])
    }
  }
  
  traverse(schema, [])
  return rules
}

/**
 * 基于规则解析文档
 */
export async function parseDocument(
  content: string,
  schema: DocParserSchema
): Promise<ParsedData> {
  const rules = extractParseRules(schema)
  const lines = content.split('\n')
  
  const result: any = {}
  const chapters: any[] = []
  
  let currentChapter: any = null
  let currentQuestion: any = null
  let collectingAnswer = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // 匹配章节
    const chapterTitleRule = rules.find(r => 
      r.path.join('.') === 'chapters.[].chapterTitle'
    )
    
    if (chapterTitleRule && chapterTitleRule.regex.test(line)) {
      // 保存上一个章节
      if (currentChapter && currentQuestion) {
        currentChapter.questions.push(currentQuestion)
        currentQuestion = null
      }
      if (currentChapter) {
        chapters.push(currentChapter)
      }
      
      // 创建新章节
      const titleMatch = line.match(chapterTitleRule.regex)
      currentChapter = {
        chapterTitle: titleMatch ? titleMatch[chapterTitleRule.captureGroup!] : '',
        questions: []
      }
      
      collectingAnswer = false
      continue
    }
    
    // 匹配题号
    const questionNumberRule = rules.find(r => 
      r.path.join('.') === 'chapters.[].questions.[].questionNumber'
    )
    if (questionNumberRule && questionNumberRule.regex.test(line)) {
      // 保存上一题
      if (currentQuestion && currentChapter) {
        currentChapter.questions.push(currentQuestion)
      }
      
      const match = line.match(questionNumberRule.regex)
      currentQuestion = {
        questionNumber: match ? match[questionNumberRule.captureGroup!] : '',
        questionContent: line.replace(questionNumberRule.regex, '').trim(),
        answer: ''
      }
      
      collectingAnswer = false
      continue
    }
    
    // 匹配答案开始
    if (/^答[：:]/.test(line)) {
      collectingAnswer = true
      if (currentQuestion) {
        currentQuestion.answer = line.replace(/^答[：:]\s*/, '').trim()
      }
      continue
    }
    
    // 累积内容
    if (collectingAnswer && currentQuestion) {
      currentQuestion.answer += '\n' + line
    } else if (currentQuestion) {
      currentQuestion.questionContent += '\n' + line
    }
  }
  
  // 收尾
  if (currentQuestion && currentChapter) {
    currentChapter.questions.push(currentQuestion)
  }
  if (currentChapter) {
    chapters.push(currentChapter)
  }
  
  result.chapters = chapters
  return result
}
```

---

### 5.2 Excel 导出器 (`docParser.exporter.ts`)

```typescript
import * as XLSX from 'xlsx'
import type { ParsedData, ExportConfig, DocParserSchema } from './types'

/**
 * 从 Schema 提取导出配置
 */
export function extractExportConfig(schema: DocParserSchema): ExportConfig {
  const config: ExportConfig = {
    columns: [],
    sectionHeaders: []
  }
  
  function traverse(node: any, path: string[]) {
    if (node['x-export']) {
      const exportMeta = node['x-export']
      
      if (exportMeta.type === 'column') {
        config.columns.push({
          field: [...path],
          name: exportMeta.columnName!,
          order: exportMeta.order || 999,
          width: exportMeta.width || 15,
          format: exportMeta.format
        })
      } else if (exportMeta.type === 'section-header') {
        config.sectionHeaders.push({
          field: [...path],
          mergeCols: exportMeta.mergeCols || 1,
          format: exportMeta.format
        })
      }
    }
    
    if (node.properties) {
      Object.entries(node.properties).forEach(([key, subNode]) => {
        traverse(subNode, [...path, key])
      })
    }
    
    if (node.items) {
      traverse(node.items, [...path, '[]'])
    }
  }
  
  traverse(schema, [])
  
  // 按 order 排序
  config.columns.sort((a, b) => a.order - b.order)
  
  return config
}

/**
 * 导出为 Excel
 */
export async function exportToExcel(
  parsedData: ParsedData,
  exportConfig: ExportConfig,
  outputPath: string
): Promise<void> {
  const workbook = XLSX.utils.book_new()
  const worksheetData: any[][] = []
  
  // 表头行
  worksheetData.push(exportConfig.columns.map(col => col.name))
  
  // 数据行
  const chapters = parsedData.chapters || []
  
  for (const chapter of chapters) {
    // 章节标题行（合并单元格）
    const chapterTitle = chapter.chapterTitle
    worksheetData.push([chapterTitle, ...Array(exportConfig.columns.length - 1).fill('')])
    
    // 题目行
    for (const question of chapter.questions) {
      const row = exportConfig.columns.map(col => {
        const fieldName = col.field[col.field.length - 1]
        return question[fieldName] || ''
      })
      worksheetData.push(row)
    }
  }
  
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)
  
  // 设置列宽
  worksheet['!cols'] = exportConfig.columns.map(col => ({ wch: col.width }))
  
  // 合并章节行的单元格
  const merges: XLSX.Range[] = []
  let rowIndex = 1 // 跳过表头
  for (const chapter of chapters) {
    merges.push({
      s: { r: rowIndex, c: 0 },
      e: { r: rowIndex, c: exportConfig.columns.length - 1 }
    })
    rowIndex += chapter.questions.length + 1
  }
  worksheet['!merges'] = merges
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  
  // 保存文件
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  
  // 通过 Electron API 保存
  await window.nimbria.file.writeFile(outputPath, buffer)
  
  console.log('✅ Excel 导出完成:', outputPath)
}
```

---

## 六、导航栏集成

### 6.1 修改 ProjectPage.Shell.vue

```vue
<!-- 添加 DocParser 导航项 -->
<template>
  <div class="project-navbar">
    <!-- ... 其他导航项 ... -->
    
    <q-btn
      flat
      dense
      icon="rule"
      label="DocParser"
      class="nav-btn"
      @click="openDocParser"
    >
      <q-tooltip>文档解析器</q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { usePaneLayoutStore } from '@stores/projectPage/paneLayout'

const paneLayoutStore = usePaneLayoutStore()

const openDocParser = () => {
  // 在最左上角的面板创建 DocParser 标签页
  const targetPane = paneLayoutStore.getTopLeftLeafPane()
  
  if (targetPane) {
    paneLayoutStore.createDocParserTab(targetPane.id)
  } else {
    // 如果没有分屏，在主面板创建
    const mainPane = paneLayoutStore.rootPane
    if (mainPane) {
      paneLayoutStore.createDocParserTab(mainPane.id)
    }
  }
}
</script>
```

### 6.2 修改 PaneLayoutStore

```typescript
// paneLayout.store.ts

/**
 * 创建 DocParser 标签页
 */
const createDocParserTab = (paneId: string) => {
  const pane = findPaneById(rootPane.value, paneId)
  if (!pane || pane.type !== 'leaf') return
  
  const newTab: MarkdownTab = {
    id: `docparser-${Date.now()}`,
    filePath: '__docparser__', // 特殊标识
    fileName: 'DocParser',
    content: '',
    mode: 'edit',
    isDirty: false,
    originalContent: '',
    lastSaved: new Date(),
    isDocParser: true // 🔑 标记为 DocParser 类型
  }
  
  pane.tabIds.push(newTab.id)
  pane.activeTabId = newTab.id
  
  // 在 Markdown Store 中注册（复用标签页系统）
  const markdownStore = useMarkdownStore()
  markdownStore.openTabs.push(newTab)
}
```

---

## 七、依赖包安装

### 7.1 package.json 新增依赖

```json
{
  "dependencies": {
    "xlsx": "^0.18.5",
    "element-plus": "^2.4.3"
  },
  "devDependencies": {
    "@types/xlsx": "^0.0.36"
  }
}
```

### 7.2 安装命令

```bash
cd Nimbria
npm install xlsx element-plus
npm install --save-dev @types/xlsx
```

---

## 八、实施步骤总结

### Phase 1: 基础架构搭建（1天）
1. ✅ 创建目录结构
2. ✅ 定义类型系统 (`types/docParser/`)
3. ✅ 创建基础 Store (`docParser.store.ts`)
4. ✅ 扩展 DataSource (`DataSource.ts`)

### Phase 2: 组件迁移（2天）
1. ✅ 使用 MCP 批量复制 JsonSchemaEditor 组件
2. ✅ 调整导入路径
3. ✅ 移除 LLM 相关功能
4. ✅ 测试 Schema 编辑功能

### Phase 3: 核心功能实现（2天）
1. ✅ 实现解析引擎 (`docParser.parser.ts`)
2. ✅ 实现 Excel 导出器 (`docParser.exporter.ts`)
3. ✅ 创建新增组件（TopBar, FileSelector, ResultPreview）

### Phase 4: 集成与测试（1天）
1. ✅ 集成导航栏
2. ✅ 创建主容器组件 (`DocParserPanel.vue`)
3. ✅ 端到端测试
4. ✅ 优化样式和交互

---

## 九、注意事项

### 9.1 避免嵌套过深

**参考 Markdown 系统**：
- ❌ 不要：`<div><div><div><q-card><q-card-section>`（5层嵌套）
- ✅ 应该：`<section class="section-card"><div class="section-body">`（2层嵌套）

**关键 CSS**：
```scss
.content-scroll-area {
  flex: 1;
  min-height: 0; // 🔑 触发 Flex 布局计算
  overflow-y: auto; // 🔑 启用滚动
}
```

### 9.2 文件操作抽象

**不要直接使用 `window.nimbria`**，而是通过 `DataSource` 抽象：

```typescript
// DocParserDataSource.ts
export class DocParserDataSource {
  static async readSchemaFile(path: string): Promise<string> {
    if (Environment.shouldUseMock()) {
      return mockSchemaContent
    }
    return await window.nimbria.file.readFile(path)
  }
  
  static async writeSchemaFile(path: string, content: string): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] Write schema:', path)
      return true
    }
    return await window.nimbria.file.writeFile(path, content)
  }
}
```

### 9.3 Store 设计原则

**参考 Markdown Store**：
- ✅ 扁平化状态，不嵌套对象
- ✅ 使用 `computed` 派生数据，不存储冗余
- ✅ 方法命名清晰：`load*`, `save*`, `create*`, `delete*`

---

## 十、后续扩展

### 10.1 Schema 模板库
- 预置常见格式的 Schema（问答、表格、列表等）
- 支持导入/导出 Schema 模板

### 10.2 解析规则可视化调试
- 实时预览正则匹配结果
- 高亮匹配的文本片段

### 10.3 多格式导出
- CSV 导出
- Markdown 表格导出
- JSON 文件导出

---

**完成状态**：✅ 计划已完成，可开始实施

**预计工时**：6个工作日

**关键依赖**：
- Element Plus（Tree 组件）
- XLSX（Excel 生成）
- Monaco Editor（已集成，用于代码编辑）

