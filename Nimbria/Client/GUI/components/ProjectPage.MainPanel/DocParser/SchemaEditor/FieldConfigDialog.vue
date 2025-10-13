<template>
  <el-dialog 
    v-model="visible"
    :title="isEditing ? '编辑字段' : '添加字段'"
    width="700px"
    class="field-config-dialog"
    @close="handleDialogClose"
  >
    <el-tabs v-model="activeTab" class="field-tabs">
      <!-- Tab 1: 基本信息 -->
      <el-tab-pane label="基本信息" name="basic">
        <el-form 
          ref="formRef"
          :model="localForm" 
          :rules="formRules"
          label-width="100px"
          class="field-form"
        >
          <!-- 字段名称 -->
          <el-form-item label="字段名称" prop="name" required>
            <el-input
              v-model="localForm.name"
              placeholder="请输入字段名称（英文）"
              class="form-input"
            />
          </el-form-item>

          <!-- 字段类型 -->
          <el-form-item label="字段类型" prop="type" required>
            <el-select
              v-model="localForm.type"
              placeholder="请选择字段类型"
              @change="handleTypeChange"
              class="form-input"
            >
              <el-option
                v-for="option in typeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <!-- 字段描述 -->
          <el-form-item label="描述">
            <el-input
              v-model="localForm.description"
              type="textarea"
              :rows="2"
              placeholder="请输入字段描述"
              class="form-input"
            />
          </el-form-item>

          <!-- 必填字段 -->
          <el-form-item label="必填字段">
            <el-switch v-model="localForm.required" />
          </el-form-item>

          <!-- 数组/对象类型说明 -->
          <el-form-item v-if="localForm.type === 'array' || localForm.type === 'object'">
            <el-alert 
              :title="localForm.type === 'array' ? '数组将创建为空容器，可在树形编辑器中添加子元素' : '对象将创建为空容器，可在树形编辑器中添加属性'" 
              type="info" 
              :closable="false"
              show-icon
            />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- Tab 2: 解析规则 -->
      <el-tab-pane label="解析规则" name="parse">
        <el-form 
          :model="localForm" 
          label-width="100px"
          class="field-form"
        >
          <!-- 启用解析 -->
          <el-form-item label="启用解析">
            <el-switch v-model="enableParse" />
            <span class="form-tip">为此字段配置正则表达式解析规则</span>
          </el-form-item>

          <template v-if="enableParse">
            <!-- 正则表达式 -->
            <el-form-item label="正则表达式" required>
              <el-input
                v-model="xParse.pattern"
                placeholder="例如：^(\d+)[.、]"
                class="form-input"
              />
              <span class="form-tip">提取数据的正则表达式</span>
            </el-form-item>

            <!-- 解析模式 -->
            <el-form-item label="解析模式" required>
              <el-select v-model="xParse.mode" class="form-input">
                <el-option label="extract - 提取匹配内容" value="extract" />
                <el-option label="split - 分割文档" value="split" />
                <el-option label="validate - 验证格式" value="validate" />
              </el-select>
            </el-form-item>

            <!-- 正则标志 -->
            <el-form-item label="正则标志">
              <el-checkbox-group v-model="selectedFlags" class="flags-group">
                <el-checkbox label="g">全局匹配 (global)</el-checkbox>
                <el-checkbox label="m">多行模式 (multiline)</el-checkbox>
                <el-checkbox label="i">忽略大小写 (ignoreCase)</el-checkbox>
                <el-checkbox label="s">. 匹配换行 (dotAll)</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <!-- 捕获组 -->
            <el-form-item label="捕获组">
              <el-input
                v-model="captureGroupsStr"
                placeholder="例如：1 或 1,2,3"
                class="form-input"
              />
              <span class="form-tip">提取第几个括号内的内容，多个用逗号分隔</span>
            </el-form-item>

            <!-- 测试文本 -->
            <el-form-item label="测试文本">
              <el-input
                v-model="examplesStr"
                type="textarea"
                :rows="3"
                placeholder="输入示例文本用于测试正则（可选）"
                class="form-input"
              />
            </el-form-item>
          </template>
        </el-form>
      </el-tab-pane>

      <!-- Tab 3: 导出配置 -->
      <el-tab-pane label="导出配置" name="export">
        <el-form 
          :model="localForm" 
          label-width="100px"
          class="field-form"
        >
          <!-- 启用导出 -->
          <el-form-item label="启用导出">
            <el-switch v-model="enableExport" />
            <span class="form-tip">配置此字段在Excel中的导出方式</span>
          </el-form-item>

          <template v-if="enableExport">
            <!-- 导出类型 -->
            <el-form-item label="导出类型" required>
              <el-select v-model="xExport.type" class="form-input">
                <el-option label="column - 普通列" value="column" />
                <el-option label="section-header - 多行合并" value="section-header" />
                <el-option label="ignore - 不导出" value="ignore" />
              </el-select>
            </el-form-item>

            <!-- 列配置（仅 column 类型） -->
            <template v-if="xExport.type === 'column'">
              <el-form-item label="列名" required>
                <el-input
                  v-model="xExport.columnName"
                  placeholder="例如：题号、题目内容"
                  class="form-input"
                />
              </el-form-item>

              <el-form-item label="列顺序">
                <el-input-number
                  v-model="xExport.columnOrder"
                  :min="1"
                  placeholder="列顺序"
                  class="form-input"
                />
                <span class="form-tip">在Excel中的列位置（1,2,3...）</span>
              </el-form-item>

              <el-form-item label="列宽度">
                <el-input-number
                  v-model="xExport.columnWidth"
                  :min="5"
                  :max="100"
                  placeholder="列宽"
                  class="form-input"
                />
                <span class="form-tip">Excel列宽（字符数）</span>
              </el-form-item>

              <!-- 格式化选项 -->
              <el-form-item label="格式化">
                <div class="format-options">
                  <el-checkbox v-model="xExport.format!.bold">加粗</el-checkbox>
                  
                  <div class="format-row">
                    <span>字号：</span>
                    <el-input-number
                      v-model="xExport.format!.fontSize"
                      :min="8"
                      :max="24"
                      size="small"
                      style="width: 100px;"
                    />
                  </div>
                  
                  <div class="format-row">
                    <span>对齐：</span>
                    <el-select v-model="xExport.format!.alignment" size="small" style="width: 120px;">
                      <el-option label="左对齐" value="left" />
                      <el-option label="居中" value="center" />
                      <el-option label="右对齐" value="right" />
                    </el-select>
                  </div>
                </div>
              </el-form-item>
            </template>

            <!-- 多行合并配置（仅 section-header 类型） -->
            <template v-if="xExport.type === 'section-header'">
              <el-form-item label="跨越列数">
                <el-input-number
                  v-model="xExport.mergeCols"
                  :min="1"
                  :max="50"
                  placeholder="跨越列数"
                  class="form-input"
                />
                <span class="form-tip">此字段在Excel中跨越的列数（1-50）</span>
              </el-form-item>
            </template>

            <!-- 🆕 Word 导出配置 -->
            <template v-if="xExport.type === 'column'">
              <el-divider content-position="left">Word 导出选项</el-divider>
              
              <el-form-item label="启用 Word 检测">
                <el-switch v-model="enableWordExport" />
                <span class="form-tip">检测此字段中的图片和表格并导出到 Word</span>
              </el-form-item>

              <template v-if="enableWordExport">
                <el-form-item label="检测内容">
                  <el-checkbox-group v-model="wordExportOptions" class="word-options-group">
                    <el-checkbox label="images">检测图片</el-checkbox>
                    <el-checkbox label="tables">检测表格</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>

                <el-form-item label="Excel 中保留">
                  <el-switch v-model="wordRetainInExcel" />
                  <span class="form-tip">导出到 Word 后是否在 Excel 中保留原内容</span>
                </el-form-item>

                <el-form-item v-if="!wordRetainInExcel" label="替代文本">
                  <el-input
                    v-model="wordReplacementText"
                    placeholder="详见 Word 文档"
                    class="form-input"
                  />
                  <span class="form-tip">在 Excel 中显示的替代文本</span>
                </el-form-item>
              </template>
            </template>
          </template>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { schemaUtils } from '@stores/projectPage/docParser/docParser.schemaUtils'
import type { 
  JsonSchemaField, 
  JsonSchemaType,
  ParseMetadata,
  ExportMetadata
} from '@stores/projectPage/docParser/docParser.types'
import type { TreeNodeData } from '@stores/projectPage/docParser/docParser.schemaUtils'

// 本地类型定义
interface FieldEditForm {
  fieldName: string
  type: JsonSchemaType
  description: string
  isRequired: boolean
}

interface FieldEditContext {
  mode: 'add' | 'edit'
  parentNode?: TreeNodeData
  currentNode?: TreeNodeData
}

// Props
interface Props {
  visible: boolean
  context: FieldEditContext | null
  initialData: FieldEditForm
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [fieldData: JsonSchemaField, context: FieldEditContext]
  cancel: []
}>()

// 响应式数据
const formRef = ref<FormInstance>()
const loading = ref(false)
const activeTab = ref('basic')

// 表单数据
const localForm = reactive({
  name: '',
  type: 'string' as JsonSchemaType,
  description: '',
  required: false
})

// 解析规则
const enableParse = ref(false)
const xParse = reactive<ParseMetadata>({
  pattern: '',
  mode: 'extract',
  flags: '',
  captureGroups: [],
  examples: []
})
const selectedFlags = ref<string[]>([])
const captureGroupsStr = ref('')
const examplesStr = ref('')

// 导出配置
const enableExport = ref(false)
const xExport = reactive<ExportMetadata>({
  type: 'column',
  columnName: '',
  columnOrder: 1,
  columnWidth: 15,
  mergeCols: 1,
  format: {
    bold: false,
    fontSize: 12,
    alignment: 'left'
  }
})

// 🆕 Word 导出配置
const enableWordExport = ref(false)
const wordExportOptions = ref<string[]>(['images', 'tables'])
const wordRetainInExcel = ref(true)
const wordReplacementText = ref('详见 Word 文档')

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const isEditing = computed(() => props.context?.mode === 'edit')

const typeOptions = computed(() => schemaUtils.getAvailableTypes())

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入字段名称', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value && !schemaUtils.isValidFieldName(value)) {
          callback(new Error('字段名只能包含字母、数字和下划线，且必须以字母或下划线开头'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  type: [
    { required: true, message: '请选择字段类型', trigger: 'change' }
  ]
}

// 方法
const resetForm = () => {
  Object.assign(localForm, {
    name: '',
    type: 'string',
    description: '',
    required: false
  })
  
  enableParse.value = false
  Object.assign(xParse, {
    pattern: '',
    mode: 'extract',
    flags: '',
    captureGroups: [],
    examples: []
  })
  selectedFlags.value = []
  captureGroupsStr.value = ''
  examplesStr.value = ''
  
  enableExport.value = false
  Object.assign(xExport, {
    type: 'column',
    columnName: '',
    columnOrder: 1,
    columnWidth: 15,
    mergeCols: 1,
    format: {
      bold: false,
      fontSize: 12,
      alignment: 'left'
    }
  })
  
  // 🆕 重置 Word 导出配置
  enableWordExport.value = false
  wordExportOptions.value = ['images', 'tables']
  wordRetainInExcel.value = true
  wordReplacementText.value = '详见 Word 文档'
  
  activeTab.value = 'basic'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadFormData = (data: any) => {
  console.log('📥 [FieldConfigDialog] 加载表单数据:', JSON.stringify(data, null, 2))
  
  // 基本信息
  Object.assign(localForm, {
    name: data.name || data.fieldName || '',
    type: data.type || 'string',
    description: data.description || '',
    required: data.required || data.isRequired || false
  })
  
  // 解析规则
  if (data['x-parse']) {
    enableParse.value = true
    Object.assign(xParse, data['x-parse'])
    
    // flags 转为数组
    if (data['x-parse'].flags) {
      selectedFlags.value = data['x-parse'].flags.split('')
    }
    
    // captureGroups 转为字符串
    if (data['x-parse'].captureGroups && Array.isArray(data['x-parse'].captureGroups)) {
      captureGroupsStr.value = data['x-parse'].captureGroups.join(',')
    }
    
    // examples 转为字符串
    if (data['x-parse'].examples && Array.isArray(data['x-parse'].examples)) {
      examplesStr.value = data['x-parse'].examples.join('\n')
    }
  } else {
    enableParse.value = false
  }
  
  // 导出配置
  if (data['x-export']) {
    enableExport.value = true
    Object.assign(xExport, {
      type: data['x-export'].type || 'column',
      columnName: data['x-export'].columnName || '',
      columnOrder: data['x-export'].columnOrder || 1,
      columnWidth: data['x-export'].columnWidth || 15,
      mergeCols: data['x-export'].mergeCols || 1,
      format: {
        bold: data['x-export'].format?.bold || false,
        fontSize: data['x-export'].format?.fontSize || 12,
        alignment: data['x-export'].format?.alignment || 'left'
      }
    })
    
    // 🆕 加载 Word 导出配置
    const wordExport = data['x-export'].wordExport
    if (wordExport) {
      enableWordExport.value = wordExport.enabled || false
      wordExportOptions.value = []
      if (wordExport.detectImages !== false) wordExportOptions.value.push('images')
      if (wordExport.detectTables !== false) wordExportOptions.value.push('tables')
      wordRetainInExcel.value = wordExport.retainInExcel !== false
      wordReplacementText.value = wordExport.replacementText || '详见 Word 文档'
    } else {
      enableWordExport.value = false
    }
  } else {
    enableExport.value = false
    enableWordExport.value = false
  }
}

const handleTypeChange = (newType: JsonSchemaType) => {
  console.log('🔄 [FieldConfigDialog] 类型切换:', newType)
}

const handleDialogClose = () => {
  emit('cancel')
}

const handleCancel = () => {
  visible.value = false
}

const handleConfirm = async () => {
  console.log('🔥 [FieldConfigDialog] handleConfirm 开始执行')
  console.log('📝 [FieldConfigDialog] 当前表单数据:', JSON.stringify(localForm, null, 2))
  console.log('📝 [FieldConfigDialog] 上下文信息:', props.context)
  
  if (!formRef.value) {
    console.error('❌ [FieldConfigDialog] formRef.value 为空')
    return
  }
  
  try {
    console.log('⏳ [FieldConfigDialog] 开始表单验证')
    await formRef.value.validate()
    console.log('✅ [FieldConfigDialog] 表单验证通过')
    
    if (!props.context) {
      console.error('❌ [FieldConfigDialog] 缺少字段上下文信息')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ElMessage.error as any)('缺少字段上下文信息')
      return
    }

    loading.value = true
    console.log('📋 [FieldConfigDialog] 设置loading状态为true')

    // 生成模板占位
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function getTemplateItems(type: JsonSchemaType): any {
      switch (type) {
        case 'string': return ""
        case 'number':
        case 'integer': return 0
        case 'boolean': return false
        case 'object': return {}
        case 'array': return []
        default: return ""
      }
    }

    // 构建字段数据
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldData: any = {
      fieldName: localForm.name,
      type: localForm.type,
      items: getTemplateItems(localForm.type)
    }

    // 添加基本字段
    if (localForm.description) {
      fieldData.description = localForm.description
      console.log('📄 [FieldConfigDialog] 添加描述:', localForm.description)
    }
    if (localForm.required) {
      fieldData.required = true
      console.log('⭐ [FieldConfigDialog] 设置为必填字段')
    }

    // 🆕 添加解析规则 x-parse
    if (enableParse.value && xParse.pattern) {
      // 组装 flags
      const flags = selectedFlags.value.join('')
      
      // 解析 captureGroups
      const captureGroups = captureGroupsStr.value
        .split(',')
        .map(s => s.trim())
        .filter(s => s)
        .map(s => parseInt(s))
        .filter(n => !isNaN(n))
      
      // 解析 examples
      const examples = examplesStr.value
        .split('\n')
        .map(s => s.trim())
        .filter(s => s)
      
      fieldData['x-parse'] = {
        pattern: xParse.pattern,
        mode: xParse.mode,
        ...(flags && { flags }),
        ...(captureGroups.length > 0 && { captureGroups }),
        ...(examples.length > 0 && { examples })
      }
      
      console.log('🔍 [FieldConfigDialog] 添加解析规则:', fieldData['x-parse'])
    }

    // 🆕 添加导出配置 x-export
    if (enableExport.value) {
      if (xExport.type === 'column') {
        fieldData['x-export'] = {
          type: 'column',
          columnName: xExport.columnName || localForm.name,
          columnOrder: xExport.columnOrder || 1,
          columnWidth: xExport.columnWidth || 15,
          format: {
            bold: xExport.format?.bold || false,
            fontSize: xExport.format?.fontSize || 12,
            alignment: xExport.format?.alignment || 'left'
          }
        }
        
        // 🆕 添加 Word 导出配置
        if (enableWordExport.value) {
          fieldData['x-export'].wordExport = {
            enabled: true,
            detectImages: wordExportOptions.value.includes('images'),
            detectTables: wordExportOptions.value.includes('tables'),
            retainInExcel: wordRetainInExcel.value,
            replacementText: wordReplacementText.value
          }
        }
      } else if (xExport.type === 'section-header') {
        fieldData['x-export'] = {
          type: 'section-header',
          mergeCols: xExport.mergeCols || 1
        }
      } else if (xExport.type === 'ignore') {
        fieldData['x-export'] = {
          type: 'ignore'
        }
      }
      
      console.log('📤 [FieldConfigDialog] 添加导出配置:', fieldData['x-export'])
    }

    console.log('🎯 [FieldConfigDialog] 最终字段数据:', JSON.stringify(fieldData, null, 2))

    // 发送确认事件
    console.log('🚀 [FieldConfigDialog] 发送confirm事件')
    emit('confirm', fieldData, props.context)
    
    console.log('✅ [FieldConfigDialog] 设置对话框为不可见')
    visible.value = false
    
  } catch (error) {
    console.error('❌ [FieldConfigDialog] 表单验证失败:', error)
  } finally {
    loading.value = false
    console.log('🏁 [FieldConfigDialog] handleConfirm 执行结束，loading设为false')
  }
}

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.initialData) {
      loadFormData(props.initialData)
    } else {
      resetForm()
    }
  }
})

watch(() => props.initialData, (newData) => {
  if (newData && props.visible) {
    loadFormData(newData)
  }
}, { deep: true })
</script>

<style scoped>
.field-config-dialog {
  --el-dialog-padding-primary: 20px;
}

.field-tabs {
  min-height: 400px;
}

.field-form {
  padding: 20px 0;
}

.form-input {
  width: 100%;
}

.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.flags-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.format-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.format-row > span {
  min-width: 50px;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.field-form :deep(.el-form-item__label) {
  font-weight: 500;
}

.field-form :deep(.el-textarea__inner) {
  resize: vertical;
}

.field-form :deep(.el-checkbox) {
  height: auto;
  white-space: normal;
}

.field-form :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.4;
}

/* 🆕 Word 导出选项样式 */
.word-options-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>