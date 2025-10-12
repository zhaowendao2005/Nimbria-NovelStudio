<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="dialog-header">
        <div class="text-h6">新建 Schema</div>
        <q-btn icon="close" flat round dense @click="handleCancel" />
      </q-card-section>

      <q-separator />

      <q-card-section class="dialog-body">
        <q-form ref="formRef" @submit.prevent="handleConfirm">
          <!-- Schema 名称 -->
          <q-input
            v-model="schemaName"
            label="Schema 名称"
            placeholder="my-schema"
            :rules="[
              val => !!val || 'Schema 名称不能为空',
              val => /^[a-zA-Z0-9_-]+$/.test(val) || 'Schema 名称只能包含字母、数字、下划线和短横线',
              val => val.length >= 3 || 'Schema 名称至少 3 个字符',
              val => val.length <= 50 || 'Schema 名称最多 50 个字符'
            ]"
            lazy-rules
            outlined
            clearable
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="article" />
            </template>
            <template #hint>
              文件将保存为: .docparser/schema/{{ schemaName || 'name' }}.schema.json
            </template>
          </q-input>

          <!-- 预设模板 -->
          <q-select
            v-model="selectedTemplate"
            :options="templateOptions"
            label="预设模板"
            emit-value
            map-options
            outlined
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="dashboard_customize" />
            </template>
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <q-icon :name="scope.opt.icon" :color="scope.opt.color" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.description }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>

          <!-- 模板说明 -->
          <q-banner
            v-if="currentTemplateDescription"
            class="bg-blue-1 text-blue-9 q-mb-md"
            rounded
          >
            <template #avatar>
              <q-icon name="info" color="blue" />
            </template>
            <div class="text-body2">{{ currentTemplateDescription }}</div>
          </q-banner>
        </q-form>
      </q-card-section>

      <q-separator />

      <q-card-actions align="right" class="dialog-footer">
        <q-btn 
          label="取消" 
          flat 
          color="grey-7" 
          @click="handleCancel"
          :disable="loading"
        />
        <q-btn 
          label="创建" 
          color="primary" 
          @click="handleConfirm"
          :loading="loading"
          :disable="!schemaName"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { QForm } from 'quasar'

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: { schemaName: string; template: string }): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单引用
const formRef = ref<QForm>()

// 表单数据
const schemaName = ref('')
const selectedTemplate = ref('excel')
const loading = ref(false)

// 模板选项
const templateOptions = [
  {
    label: 'Excel 解析模式',
    value: 'excel',
    icon: 'table_chart',
    color: 'green',
    description: '用于解析包含题目、选项、答案等结构化文本，适合导出为 Excel 表格'
  }
  // 未来可以扩展更多模板
  // {
  //   label: 'Markdown 解析模式',
  //   value: 'markdown',
  //   icon: 'notes',
  //   color: 'blue',
  //   description: '解析 Markdown 文档的标题、段落等结构'
  // },
  // {
  //   label: '日志解析模式',
  //   value: 'log',
  //   icon: 'bug_report',
  //   color: 'orange',
  //   description: '解析日志文件，提取时间戳、级别、消息等信息'
  // }
]

// 当前模板描述
const currentTemplateDescription = computed(() => {
  const template = templateOptions.find(t => t.value === selectedTemplate.value)
  return template?.description || ''
})

// 重置表单
const resetForm = () => {
  schemaName.value = ''
  selectedTemplate.value = 'excel'
  loading.value = false
  formRef.value?.resetValidation()
}

// 监听对话框打开，重置表单
watch(dialogVisible, (visible) => {
  if (visible) {
    resetForm()
  }
})

// 处理取消
const handleCancel = () => {
  if (!loading.value) {
    dialogVisible.value = false
    emit('cancel')
  }
}

// 处理确认
const handleConfirm = async () => {
  // 验证表单
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    emit('confirm', {
      schemaName: schemaName.value.trim(),
      template: selectedTemplate.value
    })
    // 不在这里关闭对话框，由父组件在成功后关闭
  } catch (error) {
    console.error('创建 Schema 失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.dialog-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.dialog-footer {
  padding: 12px 20px;
}
</style>

