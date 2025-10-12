<template>
  <div class="docparser-panel">
    <!-- 顶部工具栏 -->
    <TopBar
      :has-schema="hasSchema"
      :has-document="hasDocument"
      :has-parsed-data="hasParsedData"
      :parsing="loading"
      :exporting="exporting"
      @create-schema="handleCreateSchema"
      @load-schema="handleLoadSchema"
      @select-document="handleSelectDocument"
      @parse="handleParse"
      @export="handleExport"
    />
    
    <!-- 主内容区 -->
    <div class="panel-content">
      <!-- Schema编辑区 -->
      <div class="content-section schema-section">
        <div class="section-header">
          <h3>JSON Schema 定义</h3>
          <el-button 
            v-if="hasSchema"
            size="small" 
            text
            :icon="Edit"
            @click="showSchemaEditor = true"
          >
            编辑
          </el-button>
        </div>
        <div class="section-body">
          <JsonSchemaSection
            v-if="hasSchema"
            v-model="currentSchema"
            @update:modelValue="handleSchemaUpdate"
          />
          <el-empty v-else description="请创建或加载Schema" />
        </div>
      </div>
      
      <!-- 文档选择区 -->
      <div class="content-section document-section">
        <FileSelector
          v-model="documentPath"
          title="待解析文档"
          placeholder="请选择待解析的文档文件"
          :show-preview="true"
          :preview-content="previewContent"
          :file-info="documentInfo"
          @browse="handleBrowseDocument"
          @change="handleDocumentChange"
        />
      </div>
      
      <!-- 解析结果区 -->
      <div class="content-section result-section">
        <ResultPreview :data="parsedData" />
      </div>
      
      <!-- 导出配置区 -->
      <div v-if="hasParsedData" class="content-section export-section">
        <ExportConfig
          v-if="exportConfig"
          :config="exportConfig"
          @confirm="handleExportConfirm"
          @cancel="showExportConfig = false"
          @select-output="handleSelectOutputPath"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Edit } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { 
  useDocParserStore, 
  parseDocument, 
  exportToExcel,
  type DocParserSchema,
  type JsonSchema
} from '@stores/projectPage/docParser'
import { docParserMockData } from '@stores/projectPage/docParser/docParser.mock'
import DataSource from '@stores/projectPage/DataSource'
import TopBar from './TopBar.vue'
import FileSelector from './FileSelector.vue'
import ResultPreview from './ResultPreview.vue'
import ExportConfig from './ExportConfig.vue'
import { JsonSchemaSection } from './SchemaEditor'

const docParserStore = useDocParserStore()

// 状态
const showSchemaEditor = ref(false)
const showExportConfig = ref(false)
const loading = ref(false)
const exporting = ref(false)
const documentPath = ref('')
const previewContent = ref('')
const documentInfo = ref<any>(null)

// 计算属性
const hasSchema = computed(() => docParserStore.currentSchema !== null)
const hasDocument = computed(() => docParserStore.sourceContent.length > 0)
const hasParsedData = computed(() => docParserStore.parsedData !== null)
const currentSchema = computed({
  get: () => docParserStore.currentSchema as JsonSchema || { type: 'object', properties: {} },
  set: (value: JsonSchema) => docParserStore.updateSchema(value)
})
const parsedData = computed(() => docParserStore.parsedData)
const exportConfig = computed(() => docParserStore.exportConfig)

// 初始化
onMounted(() => {
  console.log('[DocParserPanel] 组件已挂载')
  // 可以在这里加载上次的配置
})

// Schema操作
const handleCreateSchema = () => {
  console.log('[DocParserPanel] 创建新Schema')
  // 使用默认模板
  const defaultSchema = docParserMockData.defaultSchema
  docParserStore.updateSchema(defaultSchema as JsonSchema)
  ElMessage.success('已加载默认Schema模板')
}

const handleLoadSchema = async () => {
  console.log('[DocParserPanel] 加载Schema')
  try {
    // 从DataSource加载Schema
    const schemaContent = await DataSource.loadSchema('default')
    const schema = JSON.parse(schemaContent)
    docParserStore.updateSchema(schema)
    ElMessage.success('Schema加载成功')
  } catch (error) {
    console.error('[DocParserPanel] 加载Schema失败:', error)
    ElMessage.error('加载Schema失败')
  }
}

const handleSchemaUpdate = (schema: JsonSchema) => {
  console.log('[DocParserPanel] Schema已更新')
  docParserStore.updateSchema(schema)
}

// 文档操作
const handleSelectDocument = () => {
  console.log('[DocParserPanel] 选择文档')
  handleBrowseDocument()
}

const handleBrowseDocument = async () => {
  try {
    // Mock环境：直接使用示例文档
    const content = await DataSource.readDocumentFile('sample.txt')
    previewContent.value = content.substring(0, 500) + '...'
    docParserStore.loadDocument(content)
    documentPath.value = 'sample.txt'
    documentInfo.value = {
      name: 'sample.txt',
      size: content.length,
      mtime: new Date()
    }
    ElMessage.success('文档加载成功')
  } catch (error) {
    console.error('[DocParserPanel] 加载文档失败:', error)
    ElMessage.error('加载文档失败')
  }
}

const handleDocumentChange = (path: string) => {
  console.log('[DocParserPanel] 文档路径变更:', path)
}

// 解析操作
const handleParse = async () => {
  console.log('[DocParserPanel] 开始解析')
  
  if (!docParserStore.currentSchema) {
    ElMessage.warning('请先定义Schema')
    return
  }
  
  if (!docParserStore.sourceContent) {
    ElMessage.warning('请先选择文档')
    return
  }
  
  loading.value = true
  
  try {
    const result = await parseDocument(
      docParserStore.sourceContent,
      docParserStore.currentSchema as DocParserSchema
    )
    
    docParserStore.setParseResult(result)
    
    ElMessage.success('解析完成')
  } catch (error) {
    console.error('[DocParserPanel] 解析失败:', error)
    ElMessage.error(`解析失败: ${error}`)
  } finally {
    loading.value = false
  }
}

// 导出操作
const handleExport = () => {
  console.log('[DocParserPanel] 准备导出')
  
  if (!docParserStore.parsedData || !docParserStore.exportConfig) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  // 直接导出（简化流程）
  handleExportConfirm({
    sheetName: 'Sheet1',
    format: 'xlsx',
    outputPath: './output.xlsx',
    includeHeaders: true,
    freezeHeader: true,
    includeSectionHeaders: false
  })
}

const handleExportConfirm = async (config: any) => {
  console.log('[DocParserPanel] 确认导出', config)
  
  if (!docParserStore.parsedData || !docParserStore.exportConfig) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  exporting.value = true
  
  try {
    const success = await exportToExcel(
      docParserStore.parsedData,
      docParserStore.exportConfig,
      config.outputPath,
      config.sheetName
    )
    
    if (success) {
      ElMessage.success('导出成功')
    }
  } catch (error) {
    console.error('[DocParserPanel] 导出失败:', error)
    ElMessage.error(`导出失败: ${error}`)
  } finally {
    exporting.value = false
  }
}

const handleSelectOutputPath = () => {
  console.log('[DocParserPanel] 选择输出路径')
  // TODO: 实现文件保存对话框
  ElMessage.info('请在配置中输入输出路径')
}
</script>

<style scoped lang="scss">
.docparser-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color-page);
}

.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow: auto;
  min-height: 0;
}

.content-section {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  
  &.schema-section {
    min-height: 300px;
  }
  
  &.document-section {
    min-height: 200px;
  }
  
  &.result-section {
    flex: 1;
    min-height: 400px;
  }
  
  &.export-section {
    min-height: 300px;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color-page);
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
}

.section-body {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
</style>

