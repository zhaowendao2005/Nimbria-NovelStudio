<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'add' ? '添加区域' : '编辑区域'"
    width="800px"
    class="region-config-dialog"
    @close="handleDialogClose"
  >
    <el-form 
      ref="formRef"
      :model="form" 
      :rules="formRules"
      label-width="100px"
      class="region-form"
    >
      <!-- 区域基本信息 -->
      <el-form-item label="区域名称" prop="name" required>
        <el-input 
          v-model="form.name" 
          placeholder="例如: questions, answers"
        />
        <span class="form-tip">用于标识此区域的唯一名称（英文）</span>
      </el-form-item>
      
      <el-form-item label="说明">
        <el-input 
          v-model="form.description" 
          placeholder="例如: 题目内容区域"
        />
        <span class="form-tip">对此区域的简短描述</span>
      </el-form-item>
      
      <el-divider content-position="left">提取范围</el-divider>
      
      <!-- 提取方式选择 -->
      <el-form-item label="提取方式" required>
        <el-radio-group v-model="extractMethod" @change="handleExtractMethodChange">
          <el-radio value="range">
            <el-icon><Document /></el-icon>
            按行范围
          </el-radio>
          <el-radio value="marker">
            <el-icon><Collection /></el-icon>
            按标记识别
          </el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 行范围配置 -->
      <template v-if="extractMethod === 'range'">
        <el-form-item label="起始行号" prop="rangeStart">
          <el-input-number 
            v-model="form.range.start" 
            :min="1" 
            :max="999999"
            placeholder="1"
            style="width: 100%;"
          />
          <span class="form-tip">文档中此区域的起始行号（从1开始）</span>
        </el-form-item>
        
        <el-form-item label="结束行号" prop="rangeEnd">
          <el-input-number 
            v-model="form.range.end" 
            :min="1" 
            :max="999999"
            placeholder="51158"
            style="width: 100%;"
          />
          <span class="form-tip">文档中此区域的结束行号</span>
        </el-form-item>
        
        <el-form-item>
          <el-alert 
            :title="`将提取第 ${form.range.start || 1} 行到第 ${form.range.end || '?'} 行，共 ${(form.range.end || 0) - (form.range.start || 0) + 1} 行`"
            type="info" 
            :closable="false"
            show-icon
          />
        </el-form-item>
      </template>
      
      <!-- 标记识别配置 -->
      <template v-else-if="extractMethod === 'marker'">
        <el-form-item label="起始标记" prop="markerStart">
          <el-input 
            v-model="form.marker.start" 
            placeholder="例如: # 附录 参考答案"
          />
          <span class="form-tip">文档中用于标识区域开始的文本内容</span>
        </el-form-item>
        
        <el-form-item label="结束标记">
          <el-input 
            v-model="form.marker.end" 
            placeholder="留空表示提取到文档末尾"
          />
          <span class="form-tip">可选，留空则提取到文档结尾</span>
        </el-form-item>
        
        <el-form-item>
          <el-alert 
            :title="markerHint"
            type="info" 
            :closable="false"
            show-icon
          />
        </el-form-item>
      </template>
      
      <el-divider content-position="left">解析规则</el-divider>
      
      <!-- Schema配置 -->
      <el-form-item label="Schema配置" required>
        <div class="schema-config-section">
          <div v-if="form.schema" class="schema-preview">
            <div class="schema-info">
              <el-tag type="primary">类型: {{ form.schema.type }}</el-tag>
              <el-tag v-if="form.schema.properties" type="info">
                字段数: {{ Object.keys(form.schema.properties).length }}
              </el-tag>
              <el-tag v-if="form.schema.title">{{ form.schema.title }}</el-tag>
            </div>
            <div class="schema-actions">
              <el-button 
                :icon="Edit" 
                size="small"
                @click="openSchemaEditor"
              >
                编辑 Schema
              </el-button>
              <el-button 
                :icon="Delete" 
                size="small"
                type="danger"
                @click="clearSchema"
              >
                清空
              </el-button>
            </div>
          </div>
          <el-button 
            v-else
            :icon="Plus" 
            @click="openSchemaEditor"
            type="primary"
          >
            配置此区域的 Schema
          </el-button>
        </div>
        <span class="form-tip">定义如何解析此区域的内容</span>
      </el-form-item>
      
      <!-- 高级选项 -->
      <el-collapse class="advanced-options">
        <el-collapse-item title="高级选项" name="advanced">
          <el-form-item label="输出字段名">
            <el-input 
              v-model="form.outputAs" 
              placeholder="默认与区域名称相同"
            />
            <span class="form-tip">在最终结果中使用的字段名（可选）</span>
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          确认
        </el-button>
      </div>
    </template>
    
    <!-- 嵌套的Schema编辑器 -->
    <SchemaEditorDialog
      v-if="schemaEditorVisible"
      :visible="schemaEditorVisible"
      :initial-schema="form.schema || getDefaultSchema()"
      @update:visible="schemaEditorVisible = $event"
      @cancel="schemaEditorVisible = false"
      @confirm="handleSchemaUpdate"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { 
  Edit, Delete, Plus, Document, Collection 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import SchemaEditorDialog from './SchemaEditorDialog.vue'
import type { ParseRegion, DocParserSchema } from '@stores/projectPage/docParser/docParser.types'

interface Props {
  visible: boolean
  regionData: ParseRegion | null
  regionIndex: number
  mode: 'add' | 'edit'
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [regionData: ParseRegion, index: number]
  cancel: []
}>()

// 响应式数据
const formRef = ref<FormInstance>()
const loading = ref(false)
const extractMethod = ref<'range' | 'marker'>('range')
const schemaEditorVisible = ref(false)

const form = reactive<{
  name: string
  description: string
  outputAs: string
  range: {
    start: number
    end: number
  }
  marker: {
    start: string
    end: string
  }
  schema: DocParserSchema | null
}>({
  name: '',
  description: '',
  outputAs: '',
  range: {
    start: 1,
    end: 51158
  },
  marker: {
    start: '',
    end: ''
  },
  schema: null
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入区域名称', trigger: 'blur' },
    { 
      pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, 
      message: '区域名称只能包含字母、数字和下划线，且必须以字母或下划线开头', 
      trigger: 'blur' 
    }
  ],
  rangeStart: [
    { 
      validator: (rule, value, callback) => {
        if (extractMethod.value === 'range' && (!form.range.start || form.range.start < 1)) {
          callback(new Error('起始行号必须大于0'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  rangeEnd: [
    { 
      validator: (rule, value, callback) => {
        if (extractMethod.value === 'range') {
          if (!form.range.end || form.range.end < 1) {
            callback(new Error('结束行号必须大于0'))
          } else if (form.range.end < form.range.start) {
            callback(new Error('结束行号必须大于等于起始行号'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ],
  markerStart: [
    { 
      validator: (rule, value, callback) => {
        if (extractMethod.value === 'marker' && !form.marker.start.trim()) {
          callback(new Error('请输入起始标记'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

const markerHint = computed(() => {
  const start = form.marker.start || '?'
  const end = form.marker.end
  if (end) {
    return `将从 "${start}" 开始提取，到 "${end}" 结束`
  } else {
    return `将从 "${start}" 开始提取到文档末尾`
  }
})

// 方法
const resetForm = () => {
  form.name = ''
  form.description = ''
  form.outputAs = ''
  form.range.start = 1
  form.range.end = 51158
  form.marker.start = ''
  form.marker.end = ''
  form.schema = null
  extractMethod.value = 'range'
}

const loadFormData = (data: ParseRegion) => {
  form.name = data.name
  form.description = data.description || ''
  form.outputAs = data.outputAs || ''
  
  if (data.range) {
    extractMethod.value = 'range'
    form.range.start = data.range.start
    form.range.end = data.range.end
  } else if (data.marker) {
    extractMethod.value = 'marker'
    form.marker.start = data.marker.start
    form.marker.end = data.marker.end || ''
  }
  
  form.schema = data.schema ? JSON.parse(JSON.stringify(data.schema)) : null
}

const getDefaultSchema = (): DocParserSchema => {
  return {
    type: 'array',
    title: '新建Schema',
    items: {
      type: 'object',
      properties: {}
    }
  }
}

const handleExtractMethodChange = () => {
  // 切换提取方式时重置对应字段
  if (extractMethod.value === 'range') {
    form.marker.start = ''
    form.marker.end = ''
  } else {
    form.range.start = 1
    form.range.end = 51158
  }
}

const openSchemaEditor = () => {
  schemaEditorVisible.value = true
}

const clearSchema = () => {
  ElMessageBox.confirm('确定要清空Schema配置吗？', '确认清空', {
    type: 'warning'
  }).then(() => {
    form.schema = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)('Schema已清空')
  }).catch(() => {
    // 用户取消
  })
}

const handleSchemaUpdate = (newSchema: DocParserSchema) => {
  form.schema = JSON.parse(JSON.stringify(newSchema))
  schemaEditorVisible.value = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ElMessage.success as any)('Schema配置已更新')
}

const handleDialogClose = () => {
  emit('cancel')
}

const handleCancel = () => {
  visible.value = false
}

const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    if (!form.schema) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(ElMessage.error as any)('请配置此区域的Schema')
      return
    }
    
    loading.value = true
    
    // 构建区域数据
    const regionData: ParseRegion = {
      name: form.name,
      schema: JSON.parse(JSON.stringify(form.schema))
    }
    
    // 添加可选字段（仅当有值时）
    if (form.description) {
      regionData.description = form.description
    }
    if (form.outputAs) {
      regionData.outputAs = form.outputAs
    }
    
    // 添加提取方式
    if (extractMethod.value === 'range') {
      regionData.range = {
        start: form.range.start,
        end: form.range.end
      }
    } else {
      regionData.marker = {
        start: form.marker.start
      }
      if (form.marker.end) {
        regionData.marker.end = form.marker.end
      }
    }
    
    emit('confirm', regionData, props.regionIndex)
    
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    if (props.regionData) {
      loadFormData(props.regionData)
    } else {
      resetForm()
    }
  }
})

watch(() => props.regionData, (newData) => {
  if (newData && props.visible) {
    loadFormData(newData)
  }
}, { deep: true })
</script>

<style scoped>
.region-config-dialog {
  --el-dialog-padding-primary: 20px;
}

.region-form {
  padding: 0;
}

.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.schema-config-section {
  width: 100%;
}

.schema-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  background: var(--el-bg-color-page);
}

.schema-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.schema-actions {
  display: flex;
  gap: 8px;
}

.advanced-options {
  margin-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 16px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.region-form :deep(.el-radio) {
  display: flex;
  align-items: center;
  margin-right: 20px;
}

.region-form :deep(.el-radio__label) {
  display: flex;
  align-items: center;
  gap: 4px;
}

.region-form :deep(.el-input-number) {
  width: 100%;
}
</style>

