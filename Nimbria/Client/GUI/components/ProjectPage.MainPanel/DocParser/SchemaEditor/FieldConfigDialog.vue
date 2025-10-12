<template>
  <el-dialog 
    v-model="visible"
    :title="isEditing ? '编辑字段' : '添加字段'"
    width="600px"
    class="field-config-dialog"
    @close="handleDialogClose"
  >
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
          placeholder="请输入字段名称"
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

      <!-- 字符串类型特有配置 -->
      <template v-if="localForm.type === 'string'">
        <el-form-item label="最小长度">
          <el-input-number
            v-model="localForm.minLength"
            :min="0"
            placeholder="最小长度"
            class="form-input"
          />
        </el-form-item>
        
        <el-form-item label="最大长度">
          <el-input-number
            v-model="localForm.maxLength"
            :min="localForm.minLength || 0"
            placeholder="最大长度"
            class="form-input"
          />
        </el-form-item>

        <el-form-item label="枚举值">
          <el-input
            v-model="localForm.enumValues"
            type="textarea"
            :rows="2"
            placeholder="每行一个值，例如：&#10;值1&#10;值2&#10;值3"
            class="form-input"
          />
        </el-form-item>
      </template>

      <!-- 数字类型特有配置 -->
      <template v-if="localForm.type === 'number' || localForm.type === 'integer'">
        <el-form-item label="最小值">
          <el-input-number
            v-model="localForm.minimum"
            placeholder="最小值"
            class="form-input"
          />
        </el-form-item>
        
        <el-form-item label="最大值">
          <el-input-number
            v-model="localForm.maximum"
            :min="localForm.minimum"
            placeholder="最大值"
            class="form-input"
          />
        </el-form-item>
      </template>

      <!-- 对象类型特有配置 -->
      <template v-if="localForm.type === 'object'">
        <el-form-item label="对象属性" class="object-fields-item">
          <ObjectFieldManager 
            v-model="objectFields"
            @update:modelValue="handleObjectFieldsChange"
          />
        </el-form-item>
      </template>

      <!-- 数组类型说明 -->
      <template v-if="localForm.type === 'array'">
        <el-form-item label="数组说明">
          <el-alert 
            title="数组将创建为空的容器，您可以在可视化编辑器中添加任意类型的子元素" 
            type="info" 
            :closable="false"
            show-icon
          />
        </el-form-item>
      </template>
    </el-form>

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
import { ElMessage, ElInputNumber, type FormInstance, type FormRules } from 'element-plus'
import { schemaUtils } from '@stores/projectPage/docParser/docParser.schemaUtils'
import ObjectFieldManager from './ObjectFieldManager.vue'
import type { 
  JsonSchemaField, 
  JsonSchemaType
} from '@stores/projectPage/docParser/docParser.types'
import type { TreeNodeData } from '@stores/projectPage/docParser/docParser.schemaUtils'

// 本地类型定义
interface FieldEditForm {
  fieldName: string
  type: JsonSchemaType
  description: string
  isRequired: boolean
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  pattern?: string
  enum?: any[]
  objectFieldNames?: string[]
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

// 表单数据
const localForm = reactive<FieldEditForm>({
  name: '',
  type: 'string',
  description: '',
  required: false,
  minLength: undefined,
  maxLength: undefined,
  enumValues: '',
  minimum: undefined,
  maximum: undefined
})

// 对象字段管理
const objectFields = ref<string[]>([])

// 处理对象字段变化
const handleObjectFieldsChange = (fields: string[]) => {
  console.log('🔄 [FieldConfigDialog] 对象字段发生变化:', fields)
  objectFields.value = fields
}

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
    required: false,
    minLength: undefined,
    maxLength: undefined,
    enumValues: '',
    minimum: undefined,
    maximum: undefined
  })
}

const loadFormData = (data: FieldEditForm) => {
  console.log('📥 [FieldConfigDialog] 加载表单数据:', JSON.stringify(data, null, 2))
  
  Object.assign(localForm, {
    ...data
  })
  
  // 如果是对象类型且有现有数据，尝试从中提取字段名
  if (data.type === 'object' && (data as any).items && typeof (data as any).items === 'object') {
    const existingFields = Object.keys((data as any).items)
    objectFields.value = existingFields
    console.log('🔄 [FieldConfigDialog] 从现有数据提取对象字段:', existingFields)
  } else {
    objectFields.value = []
  }
}

const handleTypeChange = (newType: JsonSchemaType) => {
  console.log('🔄 [FieldConfigDialog] 类型切换:', newType)
  
  // 清除其他类型的特定配置
  localForm.minLength = undefined
  localForm.maxLength = undefined
  localForm.enumValues = ''
  localForm.minimum = undefined
  localForm.maximum = undefined
  
  // 清空对象字段
  if (newType !== 'object') {
    objectFields.value = []
    console.log('🧹 [FieldConfigDialog] 非对象类型，清空对象字段')
  }
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
      ElMessage.error('缺少字段上下文信息')
      return
    }

    loading.value = true
    console.log('📋 [FieldConfigDialog] 设置loading状态为true')

    // 统一模板占位生成函数（所有类型都用items）
    function getTemplateItems(type: JsonSchemaType): any {
      const items = (() => {
        switch (type) {
          case 'string': return ""
          case 'number':
          case 'integer': return 0
          case 'boolean': return false
          case 'object': return {}
          case 'array': return []
          default: return ""
        }
      })()
      console.log(`🏗️ [FieldConfigDialog] 生成模板占位 ${type} -> ${JSON.stringify(items)}`)
      return items
    }

    // 构建统一模板格式字段数据（所有类型都用items）
    const fieldData: any = {
      fieldName: localForm.name,  // ⭐ 关键：包含字段名！
      type: localForm.type,
      items: localForm.type === 'object' ? generateObjectItems() : getTemplateItems(localForm.type)  // 对象使用键值对
    }

    // 生成对象的items键值对
    function generateObjectItems(): Record<string, string> {
      const items: Record<string, string> = {}
      objectFields.value.forEach(fieldName => {
        items[fieldName] = ""  // 所有值都是空字符串
      })
      console.log('🏗️ [FieldConfigDialog] 生成的对象items:', JSON.stringify(items, null, 2))
      return items
    }
    
    console.log('🏗️ [FieldConfigDialog] 基础字段数据构建:', JSON.stringify(fieldData, null, 2))
    console.log('🔑 [FieldConfigDialog] 关键字段名已包含:', localForm.name)

    // 添加可选字段
    if (localForm.description) {
      fieldData.description = localForm.description
      console.log('📄 [FieldConfigDialog] 添加描述:', localForm.description)
    }
    if (localForm.required) {
      fieldData.required = true
      console.log('⭐ [FieldConfigDialog] 设置为必填字段')
    }

    // 添加类型特定约束
    if (localForm.type === 'string') {
      console.log('🔤 [FieldConfigDialog] 处理字符串类型约束')
      if (localForm.minLength !== undefined) {
        fieldData.minLength = localForm.minLength
        console.log(`📏 [FieldConfigDialog] 设置最小长度: ${localForm.minLength}`)
      }
      if (localForm.maxLength !== undefined) {
        fieldData.maxLength = localForm.maxLength
        console.log(`📏 [FieldConfigDialog] 设置最大长度: ${localForm.maxLength}`)
      }
      
      // 处理枚举值
      if (localForm.enumValues) {
        const enumArray = localForm.enumValues
          .split('\n')
          .map(v => v.trim())
          .filter(v => v.length > 0)
        if (enumArray.length > 0) {
          fieldData.enum = enumArray
          console.log(`📜 [FieldConfigDialog] 设置枚举值:`, enumArray)
        }
      }
    } else if (localForm.type === 'number' || localForm.type === 'integer') {
      console.log('🔢 [FieldConfigDialog] 处理数值类型约束')
      if (localForm.minimum !== undefined) {
        fieldData.minimum = localForm.minimum
        console.log(`📉 [FieldConfigDialog] 设置最小值: ${localForm.minimum}`)
      }
      if (localForm.maximum !== undefined) {
        fieldData.maximum = localForm.maximum
        console.log(`📈 [FieldConfigDialog] 设置最大值: ${localForm.maximum}`)
      }
    }

    console.log('🎯 [FieldConfigDialog] 最终字段数据:', JSON.stringify(fieldData, null, 2))
    console.log('🎯 [FieldConfigDialog] 上下文数据:', JSON.stringify(props.context, null, 2))
    console.log('🎯 [FieldConfigDialog] 表单字段名:', localForm.name)

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

.field-form {
  margin-top: 20px;
}

.form-input {
  width: 100%;
}

.object-fields-item {
  margin-bottom: 20px;
}

.object-fields-item :deep(.el-form-item__content) {
  width: 100%;
  flex: 1;
}

.object-fields-item :deep(.el-form-item__content > *) {
  width: 100%;
  display: block;
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
</style>