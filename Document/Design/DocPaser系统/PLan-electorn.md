好的 Boss！我来给你设计一个详细的实现计划。让我先整理一下需求，然后给出分阶段的实现方案。

## 📋 DocParser Electron 后端集成计划

### 🎯 需求总览

#### 1. **新建 Schema**
- ✅ 弹出对话框选择预设模板（目前仅 Excel 模式）
- ✅ 输入 Schema 名称
- ✅ 在 `项目目录/.docparser/schema/{名称}.schema.json` 创建文件

#### 2. **加载 Schema**
- ✅ 打开文件选择器（原生 Electron Dialog）
- ✅ 默认路径：`项目目录/.docparser/schema/`
- ✅ 筛选：仅显示 `.schema.json` 文件

#### 3. **选择待解析文档**
- ✅ 打开文件选择器
- ✅ 默认路径：用户桌面
- ✅ 支持多种文本格式（.txt, .md, .log, .csv 等）

#### 4. **JSON Schema 编辑**
- ✅ 直接编辑实际文件（Monaco Editor）
- ✅ 使用 Markdown 的自动保存机制（防抖保存）
- ✅ 实时验证 JSON 格式
- ✅ 格式错误时显示错误提示
- ✅ 可视化预览实时渲染

#### 5. **待解析文档路径**
- ✅ 支持浏览按钮选择（同"选择文档"）
- ✅ 支持手动输入路径
- ✅ 路径显示在输入框中

#### 6. **开始解析**
- ✅ 读取当前 Schema
- ✅ 读取待解析文档内容
- ✅ 执行解析逻辑
- ✅ 在 JSON 视图中渲染结果

#### 7. **导出功能**
- ✅ 弹出导出配置对话框
- ✅ 选择导出格式（目前仅 Excel）
- ✅ 选择导出路径（文件保存对话框）
- ✅ 执行导出

---

## 🏗️ 技术架构设计

### 文件结构规划

```
Nimbria/
├── src-electron/ipc/
│   └── docParser.ipc.ts          # 新增：DocParser IPC 通道
├── Client/
│   ├── GUI/components/ProjectPage.MainPanel/DocParser/
│   │   ├── TopBar.vue            # 修改：添加新建/加载 Schema 逻辑
│   │   ├── FileSelector.vue       # 修改：集成 Electron Dialog
│   │   ├── SchemaEditor/
│   │   │   └── JsonSchemaCodeEditor.vue  # 修改：实现自动保存
│   │   ├── dialogs/
│   │   │   ├── NewSchemaDialog.vue      # 新增：新建 Schema 对话框
│   │   │   └── ExportDialog.vue         # 新增：导出配置对话框
│   └── stores/projectPage/
│       ├── DataSource.ts         # 修改：移除 Mock，实现真实 IPC 调用
│       └── docParser/
│           └── docParser.store.ts # 修改：集成自动保存逻辑
```

---

## 📝 分阶段实现计划

### **Phase 1: Electron 后端 IPC 通道** ⭐ 基础设施

#### 1.1 创建 DocParser IPC 通道
```typescript
// src-electron/ipc/docParser.ipc.ts

export const docParserIpcHandlers = {
  // Schema 管理
  'docParser:createSchema': async (params: { projectPath, schemaName, template }) => {}
  'docParser:loadSchema': async (params: { schemaPath }) => {}
  'docParser:saveSchema': async (params: { schemaPath, content }) => {}
  'docParser:listSchemas': async (params: { projectPath }) => {}
  
  // 文件选择器
  'docParser:selectSchemaFile': async (params: { defaultPath }) => {}
  'docParser:selectDocumentFile': async (params: { defaultPath }) => {}
  'docParser:selectExportPath': async (params: { defaultPath, fileName }) => {}
  
  // 文档操作
  'docParser:readDocument': async (params: { filePath }) => {}
  'docParser:saveExport': async (params: { filePath, data, format }) => {}
}
```

#### 1.2 创建 Preload API
```typescript
// src-electron/electron-preload.ts (扩展)

contextBridge.exposeInMainWorld('nimbria', {
  // ...现有 API
  docParser: {
    createSchema: (params) => ipcRenderer.invoke('docParser:createSchema', params),
    loadSchema: (params) => ipcRenderer.invoke('docParser:loadSchema', params),
    saveSchema: (params) => ipcRenderer.invoke('docParser:saveSchema', params),
    // ...其他方法
  }
})
```

---

### **Phase 2: 前端对话框组件** 🎨 UI 层

#### 2.1 新建 Schema 对话框
```vue
<!-- NewSchemaDialog.vue -->
<template>
  <el-dialog title="新建 Schema" v-model="visible">
    <el-form>
      <el-form-item label="Schema 名称">
        <el-input v-model="schemaName" placeholder="my-schema" />
      </el-form-item>
      <el-form-item label="预设模板">
        <el-select v-model="template">
          <el-option label="Excel 解析模式" value="excel" />
          <!-- 未来扩展更多模板 -->
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm">创建</el-button>
    </template>
  </el-dialog>
</template>
```

#### 2.2 导出配置对话框
```vue
<!-- ExportDialog.vue -->
<template>
  <el-dialog title="导出配置" v-model="visible">
    <el-form>
      <el-form-item label="导出格式">
        <el-select v-model="format">
          <el-option label="Excel (*.xlsx)" value="xlsx" />
          <!-- 未来：CSV, JSON 等 -->
        </el-select>
      </el-form-item>
      <el-form-item label="导出路径">
        <el-input v-model="exportPath" readonly>
          <template #append>
            <el-button @click="selectPath">浏览</el-button>
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm">导出</el-button>
    </template>
  </el-dialog>
</template>
```

---

### **Phase 3: DataSource 实现** 🔌 数据层

#### 3.1 实现真实的 IPC 调用
```typescript
// Client/stores/projectPage/DataSource.ts

export const DataSource = {
  // 新建 Schema
  async createSchema(projectPath: string, schemaName: string, template: string): Promise<string> {
    return window.nimbria.docParser.createSchema({ projectPath, schemaName, template })
  },
  
  // 加载 Schema（文件选择器）
  async selectAndLoadSchema(projectPath: string): Promise<{ path: string, content: string } | null> {
    const defaultPath = path.join(projectPath, '.docparser/schema')
    const result = await window.nimbria.docParser.selectSchemaFile({ defaultPath })
    if (result.canceled || !result.filePaths[0]) return null
    
    const content = await window.nimbria.docParser.loadSchema({ schemaPath: result.filePaths[0] })
    return { path: result.filePaths[0], content }
  },
  
  // 保存 Schema
  async saveSchema(schemaPath: string, content: string): Promise<boolean> {
    return window.nimbria.docParser.saveSchema({ schemaPath, content })
  },
  
  // 选择待解析文档
  async selectDocument(): Promise<string | null> {
    const desktopPath = await window.nimbria.path.getDesktopPath()
    const result = await window.nimbria.docParser.selectDocumentFile({ defaultPath: desktopPath })
    return result.canceled ? null : result.filePaths[0]
  },
  
  // 读取文档内容
  async readDocument(filePath: string): Promise<string> {
    return window.nimbria.docParser.readDocument({ filePath })
  },
  
  // 选择导出路径
  async selectExportPath(defaultFileName: string): Promise<string | null> {
    const result = await window.nimbria.docParser.selectExportPath({ 
      defaultPath: await window.nimbria.path.getDesktopPath(),
      fileName: defaultFileName
    })
    return result.canceled ? null : result.filePath
  },
  
  // 保存导出文件
  async saveExport(filePath: string, data: ArrayBuffer, format: 'xlsx' | 'csv'): Promise<boolean> {
    return window.nimbria.docParser.saveExport({ filePath, data, format })
  }
}
```

---

### **Phase 4: Schema 自动保存机制** 💾 核心功能

#### 4.1 在 Store 中实现防抖保存
```typescript
// Client/stores/projectPage/docParser/docParser.store.ts

import { debounce } from 'lodash-es'

export const useDocParserStore = defineStore('docParser', () => {
  const currentSchemaPath = ref<string | null>(null)
  const currentSchemaContent = ref<string>('')
  const isDirty = ref(false)
  
  // 防抖保存（3秒）
  const debouncedSave = debounce(async () => {
    if (!currentSchemaPath.value || !isDirty.value) return
    
    try {
      await DataSource.saveSchema(currentSchemaPath.value, currentSchemaContent.value)
      isDirty.value = false
      console.log('[DocParser] Schema 自动保存成功')
    } catch (error) {
      console.error('[DocParser] Schema 自动保存失败:', error)
    }
  }, 3000)
  
  // 更新 Schema 内容（触发自动保存）
  const updateSchemaContent = (content: string) => {
    currentSchemaContent.value = content
    isDirty.value = true
    debouncedSave()
  }
  
  return {
    currentSchemaPath,
    currentSchemaContent,
    isDirty,
    updateSchemaContent
  }
})
```

#### 4.2 Monaco Editor 集成自动保存
```vue
<!-- JsonSchemaCodeEditor.vue -->
<script setup>
const store = useDocParserStore()

const handleContentChange = (newContent: string) => {
  // 先验证 JSON 格式
  try {
    JSON.parse(newContent)
    store.updateSchemaContent(newContent)  // 触发自动保存
  } catch (error) {
    // 格式错误，不保存，显示错误提示
    console.error('JSON 格式错误:', error)
  }
}
</script>
```

---

### **Phase 5: UI 集成与交互** 🎨 界面层

#### 5.1 TopBar 按钮逻辑
```vue
<!-- TopBar.vue -->
<template>
  <div class="top-bar">
    <el-button @click="handleNewSchema">新建 Schema</el-button>
    <el-button @click="handleLoadSchema">加载 Schema</el-button>
    <el-button @click="handleParse" :disabled="!canParse">开始解析</el-button>
    <el-button @click="handleExport" :disabled="!canExport">导出</el-button>
  </div>
  
  <NewSchemaDialog v-model="showNewSchemaDialog" @confirm="onSchemaCreated" />
  <ExportDialog v-model="showExportDialog" @confirm="onExportConfirmed" />
</template>

<script setup>
const handleNewSchema = () => {
  showNewSchemaDialog.value = true
}

const handleLoadSchema = async () => {
  const result = await DataSource.selectAndLoadSchema(projectPath.value)
  if (result) {
    store.loadSchema(result.path, result.content)
  }
}

const handleParse = async () => {
  await store.parseDocument()
}

const handleExport = () => {
  showExportDialog.value = true
}
</script>
```

#### 5.2 FileSelector 路径输入框
```vue
<!-- FileSelector.vue -->
<template>
  <el-input 
    v-model="documentPath" 
    placeholder="请选择待解析文档"
  >
    <template #append>
      <el-button @click="browseFile">浏览</el-button>
    </template>
  </el-input>
</template>

<script setup>
const documentPath = ref('')

const browseFile = async () => {
  const path = await DataSource.selectDocument()
  if (path) {
    documentPath.value = path
  }
}
</script>
```

---

## 🔄 实施顺序建议

1. **先做 Phase 1**：搭建 Electron 后端基础设施（IPC 通道）
2. **再做 Phase 3**：实现 DataSource，确保前后端通信正常
3. **然后 Phase 2**：创建对话框组件
4. **接着 Phase 4**：实现自动保存机制
5. **最后 Phase 5**：UI 集成与联调

---

## ⚠️ 需要注意的点

1. **文件路径处理**：Windows 和 macOS 的路径分隔符不同，需要使用 `path.join()`
2. **错误处理**：所有 IPC 调用都需要 try-catch
3. **权限问题**：确保有文件读写权限
4. **Schema 验证**：保存前验证 JSON 格式
5. **用户体验**：
   - 加载中状态提示
   - 保存成功/失败通知
   - 禁用状态管理（按钮 disabled）

---

