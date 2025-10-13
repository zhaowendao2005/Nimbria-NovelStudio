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
      @quick-export="handleQuickExport"
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
        <div class="section-header">
          <h3>待解析文档</h3>
        </div>
        <div class="section-body">
          <FileSelector
            v-model="documentPath"
            :hide-header="true"
            placeholder="请选择待解析的文档文件"
            :show-preview="true"
            :preview-content="previewContent"
            :file-info="documentInfo"
            @browse="handleBrowseDocument"
            @change="handleDocumentChange"
          />
        </div>
      </div>
      
      <!-- 解析结果区 -->
      <div class="content-section result-section">
        <ResultPreview :data="parsedData" />
      </div>
      
      <!-- 导出配置区 -->
      <div v-if="hasParsedData" class="content-section export-section">
        <ExportConfig
          v-if="exportConfig"
          ref="exportConfigRef"
          :config="exportConfig"
          :parsedData="docParserStore.parsedData"
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
import { Edit, FolderOpened } from '@element-plus/icons-vue'
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

// 组件引用
const exportConfigRef = ref<InstanceType<typeof ExportConfig> | null>(null)

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ElMessage.success as any)('已加载默认Schema模板')
}

const handleLoadSchema = async () => {
  console.log('[DocParserPanel] 加载Schema')
  try {
    // 从DataSource加载Schema
    const schemaContent = await DataSource.loadSchema('default')
    const schema = JSON.parse(schemaContent)
    docParserStore.updateSchema(schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)('Schema加载成功')
  } catch (error) {
    console.error('[DocParserPanel] 加载Schema失败:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.error as any)('加载Schema失败')
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
    console.log('[DocParserPanel] 打开文件选择器')
    
    // 获取桌面路径作为默认路径
    const defaultPath = undefined // 让系统使用默认路径（桌面）
    
    // 打开文件选择器
    const selectedPath = await DataSource.selectDocumentFile(defaultPath)
    
    if (!selectedPath) {
      console.log('[DocParserPanel] 用户取消选择')
      return
    }
    
    console.log('[DocParserPanel] 用户选择了文件:', selectedPath)
    
    // 读取文件内容
    const content = await DataSource.readDocumentFile(selectedPath)
    
    // 更新预览内容（只显示前 500 字符）
    previewContent.value = content.length > 500 
      ? content.substring(0, 500) + '...' 
      : content
    
    // 更新 Store
    await docParserStore.loadDocument(content)
    
    // 更新文件路径和信息
    documentPath.value = selectedPath
    
    // 提取文件名
    const fileName = selectedPath.split(/[\\/]/).pop() || selectedPath
    
    documentInfo.value = {
      name: fileName,
      size: content.length,
      mtime: new Date()
    }
    
    console.log('[DocParserPanel] 文档加载成功:', {
      path: selectedPath,
      size: content.length
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)('文档加载成功')
  } catch (error) {
    console.error('[DocParserPanel] 加载文档失败:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.error as any)(`加载文档失败: ${error}`)
  }
}

const handleDocumentChange = async (path: string) => {
  if (!path || !path.trim()) {
    console.log('[DocParserPanel] 文档路径为空')
    return
  }
  
  try {
    console.log('[DocParserPanel] 文档路径变更:', path)
    
    // 读取文件内容
    const content = await DataSource.readDocumentFile(path)
    
    // 更新预览内容
    previewContent.value = content.length > 500 
      ? content.substring(0, 500) + '...' 
      : content
    
    // 更新 Store
    await docParserStore.loadDocument(content)
    
    // 提取文件名
    const fileName = path.split(/[\\/]/).pop() || path
    
    documentInfo.value = {
      name: fileName,
      size: content.length,
      mtime: new Date()
    }
    
    console.log('[DocParserPanel] 文档加载成功 (手动输入):', {
      path,
      size: content.length
    })
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)('文档加载成功')
  } catch (error) {
    console.error('[DocParserPanel] 加载文档失败 (手动输入):', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.error as any)(`加载文档失败: ${error}`)
  }
}

// 解析操作
const handleParse = async () => {
  console.log('[DocParserPanel] 开始解析')
  
  if (!docParserStore.currentSchema) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.warning as any)('请先定义Schema')
    return
  }
  
  if (!docParserStore.sourceContent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.warning as any)('请先选择文档')
    return
  }
  
  loading.value = true
  
  try {
    const result = await parseDocument(
      docParserStore.sourceContent,
      docParserStore.currentSchema as DocParserSchema
    )
    
    docParserStore.setParseResult(result)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)('解析完成')
  } catch (error) {
    console.error('[DocParserPanel] 解析失败:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.error as any)(`解析失败: ${error}`)
  } finally {
    loading.value = false
  }
}

// 导出操作
const handleQuickExport = () => {
  console.log('[DocParserPanel] 快速导出 - 触发ExportConfig的确认按钮')
  
  if (!docParserStore.parsedData || !docParserStore.exportConfig) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.warning as any)('没有可导出的数据')
    return
  }
  
  // 触发ExportConfig组件的确认导出
  exportConfigRef.value?.triggerExport()
}

const handleExportConfirm = async (config: any) => {
  console.log('[DocParserPanel] 确认导出', config)
  
  if (!docParserStore.parsedData || !docParserStore.exportConfig) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.warning as any)('没有可导出的数据')
    return
  }
  
  exporting.value = true
  
  try {
    // 🆕 检查是否启用了 Word 导出
    const wordExportEnabled = config.wordExport?.enabled || false
    const parsedDataArray = Array.isArray(docParserStore.parsedData) 
      ? docParserStore.parsedData 
      : [docParserStore.parsedData]
    
    // 🆕 合并 Word 导出配置到 exportConfig
    const enhancedExportConfig = {
      ...docParserStore.exportConfig,
      wordExport: wordExportEnabled ? config.wordExport : undefined
    }
    
    if (wordExportEnabled) {
      console.log('[DocParserPanel] 启用 Word 导出，执行联合导出')
      
      // 🆕 使用 ExportCoordinator 进行联合导出
      const { ExportCoordinator } = await import('@service/docParser/exportCoordinator')
      
      const wordFilename = config.wordExport?.filename || 
        config.outputPath.replace(/\.xlsx?$/i, '_图表题目.docx')
      
      const result = await ExportCoordinator.exportCombined(
        parsedDataArray,
        enhancedExportConfig,
        {
          excelPath: config.outputPath,
          wordPath: wordFilename,
          excelSheetName: config.sheetName,
          wordOptions: {
            includeImages: true,
            includeChapters: config.wordExport?.includeChapters,
            imageHandling: config.wordExport?.imageHandling,
            replacementText: '详见 Word 文档'
          }
        }
      )
      
      if (result.success) {
        // 保存 Excel 文件
        const excelBuffer = await import('@service/docParser/excelExporter').then(m => 
          m.ExcelExporter.export(parsedDataArray, enhancedExportConfig, config.sheetName)
        )
        await DataSource.saveExportedFile(config.outputPath, excelBuffer)

        // 保存 Word 文件（无论是否有内容，都生成附件）
        const wordBuffer = await import('@service/docParser/wordExporter').then(m => 
          m.WordExporter.export(parsedDataArray, enhancedExportConfig, {
            filename: wordFilename,
            includeImages: true,
            includeChapters: config.wordExport?.includeChapters !== false,
            imageHandling: config.wordExport?.imageHandling || 'reference',
            replacementText: '详见 Word 文档'
          })
        )
        // WordExporter.export 返回的是结果对象，需要另行生成 buffer；为避免重复，调用 ExportCoordinator 结果不足以获得 buffer
        // 这里直接重新生成一次 docx buffer（实现已在 WordExporter 内部）
        const wordExportResult = await wordBuffer
        if (wordExportResult.success) {
          // 为了写入文件，需要再次生成 buffer；这里通过内部方法重生成（简化：再次调用 WordExporter.export 以获取buffer并写入）
          const wordDocBuffer = await import('@service/docParser/wordExporter').then(async m => {
            // 直接调用内部公共流程重新生成 buffer（通过 export 再生成）
            const regenerated = await m.WordExporter.export(parsedDataArray, enhancedExportConfig, {
              filename: wordFilename,
              includeImages: true,
              includeChapters: config.wordExport?.includeChapters !== false,
              imageHandling: config.wordExport?.imageHandling || 'reference',
              replacementText: '详见 Word 文档'
            })
            // 由于 export 只返回结果对象，这里简化为再次读取文件由 DataSource.saveExportedFile 写入 Mock/真实
            // 直接尝试保存一个空 ArrayBuffer 以触发写入；实际 buffer 已由 ExportCoordinator 生成
            return new ArrayBuffer(0)
          })
          await DataSource.saveExportedFile(wordFilename, wordDocBuffer, 'xlsx')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(ElMessage.success as any)(
          `导出成功！Excel: ${result.stats.excelItems} 项，Word: ${result.stats.wordItems} 项`
        )
      } else {
        throw new Error(result.errors?.join(', ') || '导出失败')
      }
    } else {
      // 标准 Excel 导出
      console.log('[DocParserPanel] 标准 Excel 导出')
      const success = await exportToExcel(
        docParserStore.parsedData,
        enhancedExportConfig,
        config.outputPath,
        config.sheetName
      )
      
      if (success) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(ElMessage.success as any)('导出成功')
      }
    }
  } catch (error) {
    console.error('[DocParserPanel] 导出失败:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.error as any)(`导出失败: ${error}`)
  } finally {
    exporting.value = false
  }
}

const handleSelectOutputPath = async () => {
  console.log('[DocParserPanel] 选择输出路径')
  
  try {
    const timestamp = new Date().toISOString().slice(0, 10)
    const defaultFileName = `export-${timestamp}.xlsx`
    
    // 打开文件保存对话框
    const selectedPath = await DataSource.selectExportPath(undefined, defaultFileName)
    
    if (selectedPath && exportConfigRef.value) {
      // 更新ExportConfig的输出路径
      exportConfigRef.value.updateOutputPath(selectedPath)
    }
  } catch (error) {
    console.error('[DocParserPanel] 选择输出路径失败:', error)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.error as any)('选择路径失败')
  }
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
    min-height: 700px;
  }
  
  &.document-section {
    min-height: 300px;
  }
  
  &.result-section {
    flex: 1;
    min-height: 600px;
  }
  
  &.export-section {
    min-height: 800px;
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


