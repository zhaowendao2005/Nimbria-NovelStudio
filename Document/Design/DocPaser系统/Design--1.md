## 一、调整后的长页面布局

```vue
<!-- DocParser.vue -->
<template>
  <div class="docparser-container">
    <!-- 顶部工具栏（预留） -->
    <div class="docparser-topbar">
      <!-- Boss 后续再决定放什么 -->
      <div class="topbar-placeholder">
        <span class="title">DocParser</span>
      </div>
    </div>

    <!-- 主内容区（长页面滚动） -->
    <div class="docparser-content">
      
      <!-- Section 1: Schema 编辑器（包含正则配置） -->
      <q-card class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="schema" size="24px" />
            <span>Schema 与解析规则定义</span>
            <q-space />
            <q-btn-group flat dense>
              <q-btn icon="folder_open" dense flat @click="handleLoadSchema">
                <q-tooltip>加载 Schema</q-tooltip>
              </q-btn>
              <q-btn icon="save" dense flat @click="handleSaveSchema">
                <q-tooltip>保存 Schema</q-tooltip>
              </q-btn>
            </q-btn-group>
          </div>
        </q-card-section>
        
        <q-card-section class="schema-editor-section">
          <!-- 使用搬运的 JsonSchemaEditor -->
          <JsonSchemaEditor 
            v-model="currentSchema"
            @update:modelValue="handleSchemaChange"
          />
        </q-card-section>
      </q-card>

      <!-- Section 2: 文档选择与解析 -->
      <q-card class="section-card">
        <q-card-section>
          <div class="section-title">
            <q-icon name="description" size="24px" />
            <span>文档处理</span>
            <q-space />
            <q-btn-group flat dense>
              <q-btn icon="folder_open" label="选择文档" @click="handleSelectDocument" />
              <q-btn icon="play_arrow" label="开始解析" color="primary" 
                     :disable="!sourceContent || !currentSchema"
                     @click="handleParse" />
            </q-btn-group>
          </div>
        </q-card-section>
        
        <q-card-section v-if="sourceContent">
          <div class="document-info">
            <q-chip icon="description" color="primary" text-color="white">
              {{ selectedFileName }}
            </q-chip>
            <span class="text-caption">{{ sourceContent.length }} 字符</span>
          </div>
        </q-card-section>
      </q-card>

      <!-- Section 3: 解析结果（双栏：Tree + JSON） -->
      <q-card class="section-card" v-if="parsedData">
        <q-card-section>
          <div class="section-title">
            <q-icon name="account_tree" size="24px" />
            <span>解析结果</span>
            <q-space />
            <q-btn-toggle
              v-model="previewMode"
              :options="[
                { label: '树形视图', value: 'tree' },
                { label: 'JSON 视图', value: 'json' },
                { label: '双栏对比', value: 'split' }
              ]"
              dense
              flat
            />
          </div>
        </q-card-section>
        
        <q-card-section class="parse-result-section">
          <!-- 双栏布局 -->
          <div class="result-split-view" v-if="previewMode === 'split'">
            <!-- 左侧：Element Plus Tree -->
            <div class="tree-panel">
              <div class="panel-header">
                <span>结构化视图</span>
              </div>
              <div class="tree-container">
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
                      <span class="node-meta" v-if="data.meta">{{ data.meta }}</span>
                    </span>
                  </template>
                </el-tree>
              </div>
            </div>

            <!-- 右侧：JSON Preview -->
            <div class="json-panel">
              <div class="panel-header">
                <span>JSON 数据</span>
                <q-btn 
                  icon="content_copy" 
                  size="sm" 
                  flat 
                  dense 
                  @click="handleCopyJson"
                >
                  <q-tooltip>复制 JSON</q-tooltip>
                </q-btn>
              </div>
              <div class="json-container">
                <pre class="json-code">{{ formattedJson }}</pre>
              </div>
            </div>
          </div>

          <!-- 单栏视图 -->
          <div v-else-if="previewMode === 'tree'" class="single-view">
            <el-tree
              :data="treeData"
              :props="treeProps"
              default-expand-all
              :expand-on-click-node="false"
            >
              <template #default="{ node, data }">
                <span class="tree-node">
                  <q-icon :name="getNodeIcon(data.type)" size="16px" />
                  <span>{{ node.label }}</span>
                </span>
              </template>
            </el-tree>
          </div>

          <div v-else class="single-view">
            <pre class="json-code">{{ formattedJson }}</pre>
          </div>
        </q-card-section>
      </q-card>

      <!-- Section 4: Excel 导出预览 -->
      <q-card class="section-card" v-if="parsedData">
        <q-card-section>
          <div class="section-title">
            <q-icon name="grid_on" size="24px" />
            <span>Excel 导出预览</span>
            <q-space />
            <q-btn icon="file_download" label="导出 Excel" color="positive" 
                   @click="handleExportExcel" />
          </div>
        </q-card-section>
        
        <q-card-section>
          <ExcelPreview 
            :parsed-data="parsedData"
            :export-config="exportConfig"
          />
        </q-card-section>
      </q-card>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElTree } from 'element-plus'
import type { TreeNode } from 'element-plus/es/components/tree/src/tree.type'

// Store
const docParserStore = useDocParserStore()

// 状态
const currentSchema = ref<EnhancedJsonSchema | null>(null)
const sourceContent = ref<string>('')
const selectedFileName = ref<string>('')
const parsedData = ref<any>(null)
const previewMode = ref<'tree' | 'json' | 'split'>('split')

// Tree 配置
const treeProps = {
  label: 'label',
  children: 'children'
}

// 计算属性
const treeData = computed(() => {
  if (!parsedData.value) return []
  return convertToTreeData(parsedData.value)
})

const formattedJson = computed(() => {
  if (!parsedData.value) return ''
  return JSON.stringify(parsedData.value, null, 2)
})

const exportConfig = computed(() => {
  return extractExportConfigFromSchema(currentSchema.value)
})

// 方法
function convertToTreeData(data: any, parentPath = ''): any[] {
  // 递归转换 JSON 数据为 Element Plus Tree 格式
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
          meta: Array.isArray(value) ? `${value.length} 项` : '',
          children: convertToTreeData(value, nodePath)
        }
      } else {
        return {
          id: nodePath,
          label: key,
          type: 'value',
          meta: String(value).substring(0, 50) + (String(value).length > 50 ? '...' : ''),
          children: []
        }
      }
    })
  }
  return []
}

function getNodeIcon(type: string) {
  const iconMap = {
    'array': 'data_array',
    'array-item': 'remove',
    'object': 'data_object',
    'value': 'label'
  }
  return iconMap[type] || 'label'
}

async function handleSelectDocument() {
  // 打开文件选择对话框
  const result = await window.nimbria.file.selectFile({
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] }
    ]
  })
  
  if (result) {
    sourceContent.value = await window.nimbria.file.readFile(result.path)
    selectedFileName.value = result.name
  }
}

async function handleParse() {
  if (!currentSchema.value || !sourceContent.value) return
  
  // 提取 Schema 中的正则规则
  const regexPatterns = extractRegexPatternsFromSchema(currentSchema.value)
  
  // 执行解析
  parsedData.value = await docParserStore.parseDocument(
    sourceContent.value,
    currentSchema.value,
    regexPatterns
  )
  
  console.log('✅ 解析完成:', parsedData.value)
}

function handleCopyJson() {
  navigator.clipboard.writeText(formattedJson.value)
  // 显示通知
}
</script>

<style lang="scss" scoped>
.docparser-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.docparser-topbar {
  flex-shrink: 0;
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--obsidian-bg-secondary);
  border-bottom: 1px solid var(--obsidian-border);
  
  .title {
    font-size: 16px;
    font-weight: 600;
    color: var(--obsidian-text-primary);
  }
}

.docparser-content {
  flex: 1;
  min-height: 0; // 🔑 关键
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-card {
  flex-shrink: 0;
  
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
  }
}

// 🆕 双栏布局
.result-split-view {
  display: flex;
  gap: 16px;
  height: 600px; // 固定高度
  
  .tree-panel,
  .json-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    border: 1px solid var(--obsidian-border);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .panel-header {
    flex-shrink: 0;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    background: var(--obsidian-bg-secondary);
    border-bottom: 1px solid var(--obsidian-border);
    font-weight: 600;
  }
  
  .tree-container,
  .json-container {
    flex: 1;
    min-height: 0; // 🔑
    overflow-y: auto;
    padding: 12px;
  }
}

// Tree 节点样式
.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .node-label {
    font-weight: 500;
  }
  
  .node-meta {
    font-size: 12px;
    color: var(--obsidian-text-secondary);
    margin-left: 8px;
  }
}

// JSON 代码样式
.json-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  margin: 0;
  color: var(--obsidian-text-primary);
  background: transparent;
}

.single-view {
  min-height: 400px;
  max-height: 800px;
  overflow-y: auto;
}
</style>
```

---

## 二、JSON Schema 扩展（包含正则配置）

### 2.1 扩展字段设计

```typescript
// types.ts
interface EnhancedJsonSchema extends JSONSchema7 {
  // 🆕 解析规则（正则）
  'x-parse'?: ParseMetadata
  
  // 🆕 导出配置
  'x-export'?: ExportMetadata
  
  properties?: {
    [key: string]: EnhancedJsonSchema
  }
  items?: EnhancedJsonSchema
}

interface ParseMetadata {
  // 正则表达式（字符串形式）
  regex?: string
  
  // 正则 flags
  flags?: string  // 如 'gi', 'gm'
  
  // 匹配模式
  mode?: 'match' | 'split' | 'test' | 'extract'
  
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

interface ExportMetadata {
  type: 'column' | 'section-header' | 'merged-row' | 'ignore'
  columnName?: string
  order?: number
  width?: number
  mergeCols?: number  // 合并列数
  format?: {
    bold?: boolean
    fontSize?: number
    alignment?: 'left' | 'center' | 'right'
  }
}
```

### 2.2 实际应用示例

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
          "chapterNumber": {
            "type": "string",
            "description": "章节编号",
            "x-parse": {
              "regex": "^(第[一二三四五六七八九十百]+章)",
              "mode": "extract",
              "captureGroup": 1,
              "conditions": {
                "lineStart": true
              },
              "examples": ["第一章", "第二十三章"]
            },
            "x-export": {
              "type": "ignore"
            }
          },
          "chapterTitle": {
            "type": "string",
            "description": "章节标题",
            "x-parse": {
              "regex": "^第[一二三四五六七八九十百]+章\\s+(.+)$",
              "mode": "extract",
              "captureGroup": 1,
              "examples": ["生命的分子基础"]
            },
            "x-export": {
              "type": "section-header",
              "mergeCols": 3,
              "format": {
                "bold": true,
                "fontSize": 14,
                "alignment": "center"
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
                  "description": "题号",
                  "x-parse": {
                    "regex": "^(\\d+)、",
                    "mode": "extract",
                    "captureGroup": 1,
                    "conditions": {
                      "lineStart": true
                    },
                    "examples": ["1", "23"]
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
                  "description": "题目内容",
                  "x-parse": {
                    "regex": "^\\d+、(.+?)(?=\\n答[：:])",
                    "flags": "s",
                    "mode": "extract",
                    "captureGroup": 1,
                    "examples": ["解释为什么水分子之间..."]
                  },
                  "x-export": {
                    "type": "column",
                    "columnName": "题目内容",
                    "order": 2,
                    "width": 50,
                    "format": {
                      "alignment": "left"
                    }
                  }
                },
                "answer": {
                  "type": "string",
                  "description": "答案内容",
                  "x-parse": {
                    "regex": "答[：:]\\s*(.+?)(?=\\n\\d+、|\\n第[一二三四五六七八九十百]+章|$)",
                    "flags": "s",
                    "mode": "extract",
                    "captureGroup": 1,
                    "examples": ["水分子中氧原子..."]
                  },
                  "x-export": {
                    "type": "column",
                    "columnName": "答案",
                    "order": 3,
                    "width": 60,
                    "format": {
                      "alignment": "left"
                    }
                  }
                }
              },
              "required": ["questionNumber", "questionContent", "answer"]
            }
          }
        },
        "required": ["chapterNumber", "chapterTitle", "questions"]
      }
    }
  }
}
```

---

## 三、解析器实现（从 Schema 提取正则）

```typescript
// docParser.service.ts

interface ParseRule {
  path: string[]           // JSON 路径，如 ['chapters', 'chapterTitle']
  regex: RegExp
  mode: 'match' | 'split' | 'extract'
  captureGroup?: number
  conditions?: ParseMetadata['conditions']
}

/**
 * 从 Schema 中提取所有解析规则
 */
export function extractParseRules(schema: EnhancedJsonSchema): ParseRule[] {
  const rules: ParseRule[] = []
  
  function traverse(node: EnhancedJsonSchema, path: string[]) {
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
    
    // 递归遍历
    if (node.properties) {
      Object.entries(node.properties).forEach(([key, subNode]) => {
        traverse(subNode as EnhancedJsonSchema, [...path, key])
      })
    }
    
    if (node.items) {
      traverse(node.items as EnhancedJsonSchema, [...path, '[]'])
    }
  }
  
  traverse(schema, [])
  return rules
}

/**
 * 基于规则解析文档
 */
export function parseDocument(
  content: string,
  schema: EnhancedJsonSchema
): any {
  const rules = extractParseRules(schema)
  const lines = content.split('\n')
  
  // 按照 Schema 结构构建结果
  const result: any = {}
  const chapters: any[] = []
  
  let currentChapter: any = null
  let currentQuestion: any = null
  let collectingAnswer = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // 匹配章节
    const chapterNumberRule = rules.find(r => r.path.join('.') === 'chapters.[].chapterNumber')
    const chapterTitleRule = rules.find(r => r.path.join('.') === 'chapters.[].chapterTitle')
    
    if (chapterNumberRule && chapterNumberRule.regex.test(line)) {
      // 保存上一个章节
      if (currentChapter && currentQuestion) {
        currentChapter.questions.push(currentQuestion)
        currentQuestion = null
      }
      if (currentChapter) {
        chapters.push(currentChapter)
      }
      
      // 创建新章节
      const chapterMatch = line.match(chapterNumberRule.regex)
      const titleMatch = line.match(chapterTitleRule!.regex)
      
      currentChapter = {
        chapterNumber: chapterMatch ? chapterMatch[chapterNumberRule.captureGroup!] : '',
        chapterTitle: titleMatch ? titleMatch[chapterTitleRule!.captureGroup!] : '',
        questions: []
      }
      
      collectingAnswer = false
      continue
    }
    
    // 匹配题号
    const questionNumberRule = rules.find(r => r.path.join('.') === 'chapters.[].questions.[].questionNumber')
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

## 四、Excel 导出器（基于 x-export 配置）

```typescript
// exporter.service.ts
import * as XLSX from 'xlsx'

interface ExportConfig {
  columns: Array<{
    field: string[]      // 字段路径
    name: string
    order: number
    width: number
    format?: any
  }>
  sectionHeaders: Array<{
    field: string[]
    mergeCols: number
    format?: any
  }>
}

/**
 * 从 Schema 提取导出配置
 */
export function extractExportConfig(schema: EnhancedJsonSchema): ExportConfig {
  const config: ExportConfig = {
    columns: [],
    sectionHeaders: []
  }
  
  function traverse(node: EnhancedJsonSchema, path: string[]) {
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
        traverse(subNode as EnhancedJsonSchema, [...path, key])
      })
    }
    
    if (node.items) {
      traverse(node.items as EnhancedJsonSchema, [...path, '[]'])
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
  parsedData: any,
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
    const chapterTitle = `${chapter.chapterNumber} ${chapter.chapterTitle}`
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
  await window.nimbria.file.writeFile(outputPath, buffer)
  
  console.log('✅ Excel 导出完成:', outputPath)
}
```

---

## 五、总结

Boss，这个调整后的方案：

✅ **Topbar 预留**：暂时只放标题，后续可加按钮  
✅ **正则集成到 Schema**：使用 `x-parse` 扩展字段  
✅ **双栏预览**：左侧 Element Plus Tree，右侧 JSON  
✅ **灵活切换**：支持树形/JSON/双栏三种视图模式  
✅ **导出简化**：直接从 `x-export` 字段读取配置，自动生成 Excel

