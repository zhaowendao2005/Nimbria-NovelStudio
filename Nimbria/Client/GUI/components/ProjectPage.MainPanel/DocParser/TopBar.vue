<template>
  <div class="docparser-topbar">
    <div class="topbar-left">
      <el-button 
        type="primary" 
        :icon="DocumentAdd"
        @click="handleNewSchema"
      >
        新建 Schema
      </el-button>
      <el-button 
        :icon="FolderOpened"
        @click="handleLoadSchema"
      >
        加载 Schema
      </el-button>
      <el-button 
        :icon="Document"
        :disabled="!canSelectDoc"
        @click="emit('select-document')"
      >
        选择文档
      </el-button>
    </div>
    
    <div class="topbar-center">
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="定义Schema" />
        <el-step title="选择文档" />
        <el-step title="解析数据" />
        <el-step title="导出结果" />
      </el-steps>
    </div>
    
    <div class="topbar-right">
      <el-button 
        type="success"
        :icon="CircleCheck"
        :disabled="!canParse"
        :loading="parsing"
        @click="emit('parse')"
      >
        开始解析
      </el-button>
      <el-button 
        type="warning"
        :icon="Download"
        :disabled="!canExport"
        :loading="exporting"
        @click="handleQuickExport"
      >
        快速导出
      </el-button>
    </div>
    
    <!-- 新建 Schema 对话框 -->
    <NewSchemaDialog
      v-model="showNewSchemaDialog"
      @confirm="handleSchemaCreated"
      @cancel="showNewSchemaDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { DocumentAdd, FolderOpened, Document, CircleCheck, Download } from '@element-plus/icons-vue'
import NewSchemaDialog from './dialogs/NewSchemaDialog.vue'
import { useDocParserStore } from '@stores/projectPage/docParser/docParser.store'
import DataSource from '@stores/projectPage/DataSource'

interface Props {
  hasSchema: boolean
  hasDocument: boolean
  hasParsedData: boolean
  parsing?: boolean
  exporting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  parsing: false,
  exporting: false
})

const emit = defineEmits<{
  'create-schema': []
  'load-schema': []
  'select-document': []
  'parse': []
  'quick-export': []
}>()

const $q = useQuasar()
const docParserStore = useDocParserStore()

// 对话框状态
const showNewSchemaDialog = ref(false)

// 当前步骤
const currentStep = computed(() => {
  if (props.hasParsedData) return 3
  if (props.hasDocument) return 2
  if (props.hasSchema) return 1
  return 0
})

// 按钮状态
const canSelectDoc = computed(() => props.hasSchema)
const canParse = computed(() => props.hasSchema && props.hasDocument)
const canExport = computed(() => props.hasParsedData)

// 新建 Schema
const handleNewSchema = () => {
  showNewSchemaDialog.value = true
}

// Schema 创建成功
const handleSchemaCreated = async (data: { schemaName: string; template: string }) => {
  try {
    const projectPath = docParserStore.projectPath || (window.nimbria as any)?.getCurrentProjectPath?.() || ''
    if (!projectPath) {
      $q.notify({
        type: 'negative',
        message: '无法获取项目路径'
      })
      return
    }
    
    const schemaPath = await DataSource.createSchema(projectPath, data.schemaName, data.template)
    
    // 加载创建的 Schema
    await docParserStore.loadSchemaFile(schemaPath)
    
    showNewSchemaDialog.value = false
    
    $q.notify({
      type: 'positive',
      message: `Schema "${data.schemaName}" 创建成功`
    })
  } catch (error) {
    console.error('创建 Schema 失败:', error)
    $q.notify({
      type: 'negative',
      message: `创建失败: ${error}`
    })
  }
}

// 加载 Schema
const handleLoadSchema = async () => {
  try {
    const projectPath = docParserStore.projectPath || (window.nimbria as any)?.getCurrentProjectPath?.() || ''
    const defaultPath = projectPath ? `${projectPath}/.docparser/schema` : undefined
    
    const selectedPath = await DataSource.selectSchemaFile(defaultPath)
    if (selectedPath) {
      await docParserStore.loadSchemaFile(selectedPath)
    }
  } catch (error) {
    console.error('加载 Schema 失败:', error)
    $q.notify({
      type: 'negative',
      message: `加载失败: ${error}`
    })
  }
}

// 快速导出 - 直接触发ExportConfig的导出按钮
const handleQuickExport = () => {
  emit('quick-export')
}
</script>

<style scoped lang="scss">
.docparser-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  margin: 0 8px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  gap: 20px;
  
}

.topbar-left,
.topbar-right {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.topbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 400px;
  max-width: 600px;
}

.el-steps {
  width: 100%;
}
</style>

