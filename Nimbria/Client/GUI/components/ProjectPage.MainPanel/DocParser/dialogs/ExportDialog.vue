<template>
  <q-dialog v-model="dialogVisible" persistent>
    <q-card style="min-width: 550px">
      <q-card-section class="dialog-header">
        <div class="text-h6">导出配置</div>
        <q-btn icon="close" flat round dense @click="handleCancel" />
      </q-card-section>

      <q-separator />

      <q-card-section class="dialog-body">
        <q-form ref="formRef" @submit.prevent="handleConfirm">
          <!-- 导出格式 -->
          <q-select
            v-model="exportFormat"
            :options="formatOptions"
            label="导出格式"
            emit-value
            map-options
            outlined
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="description" />
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

          <!-- 导出路径 -->
          <q-input
            v-model="exportPath"
            label="导出路径"
            placeholder="选择导出位置..."
            :rules="[
              val => !!val || '请选择导出路径'
            ]"
            readonly
            outlined
            class="q-mb-md"
          >
            <template #prepend>
              <q-icon name="folder" />
            </template>
            <template #append>
              <q-btn
                icon="folder_open"
                flat
                round
                dense
                color="primary"
                @click="handleBrowsePath"
                :disable="loading"
              >
                <q-tooltip>浏览</q-tooltip>
              </q-btn>
            </template>
          </q-input>

          <!-- 导出选项 -->
          <div class="export-options q-mb-md">
            <div class="text-subtitle2 q-mb-sm">导出选项</div>
            
            <q-checkbox
              v-model="includeHeaders"
              label="包含表头"
              class="q-mb-xs"
            />
            
            <q-checkbox
              v-if="exportFormat === 'xlsx'"
              v-model="freezeFirstRow"
              label="冻结首行"
              class="q-mb-xs"
            />
            
            <q-checkbox
              v-if="exportFormat === 'xlsx'"
              v-model="autoColumnWidth"
              label="自动调整列宽"
              class="q-mb-xs"
            />
          </div>

          <!-- 预览信息 -->
          <q-banner
            v-if="dataInfo"
            class="bg-grey-2 text-grey-8"
            rounded
          >
            <template #avatar>
              <q-icon name="info" color="blue" />
            </template>
            <div class="text-body2">
              <div>将导出 <strong>{{ dataInfo.itemCount }}</strong> 条数据</div>
              <div>共 <strong>{{ dataInfo.fieldCount }}</strong> 个字段</div>
              <div v-if="dataInfo.estimatedSize">
                预估文件大小: <strong>{{ dataInfo.estimatedSize }}</strong>
              </div>
            </div>
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
          label="导出" 
          color="primary" 
          icon-right="save_alt"
          @click="handleConfirm"
          :loading="loading"
          :disable="!exportPath"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { QForm } from 'quasar'
import DataSource from '@stores/projectPage/DataSource'

interface Props {
  modelValue: boolean
  dataInfo?: {
    itemCount: number
    fieldCount: number
    estimatedSize?: string
  }
  defaultFileName?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: {
    exportPath: string
    format: 'xlsx' | 'csv'
    options: {
      includeHeaders: boolean
      freezeFirstRow?: boolean
      autoColumnWidth?: boolean
    }
  }): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  defaultFileName: 'export.xlsx'
})
const emit = defineEmits<Emits>()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单引用
const formRef = ref<QForm>()

// 表单数据
const exportFormat = ref<'xlsx' | 'csv'>('xlsx')
const exportPath = ref('')
const includeHeaders = ref(true)
const freezeFirstRow = ref(true)
const autoColumnWidth = ref(true)
const loading = ref(false)

// 格式选项
const formatOptions = [
  {
    label: 'Excel 文件 (*.xlsx)',
    value: 'xlsx',
    icon: 'table_chart',
    color: 'green',
    description: '推荐：支持样式、冻结行、自动列宽等高级功能'
  },
  {
    label: 'CSV 文件 (*.csv)',
    value: 'csv',
    icon: 'text_snippet',
    color: 'blue',
    description: '纯文本格式，兼容性好，但不支持样式'
  }
]

// 重置表单
const resetForm = () => {
  exportFormat.value = 'xlsx'
  exportPath.value = ''
  includeHeaders.value = true
  freezeFirstRow.value = true
  autoColumnWidth.value = true
  loading.value = false
  formRef.value?.resetValidation()
}

// 监听对话框打开，重置表单
watch(dialogVisible, (visible) => {
  if (visible) {
    resetForm()
  }
})

// 浏览导出路径
const handleBrowsePath = async () => {
  try {
    loading.value = true
    
    // 根据格式生成默认文件名
    const ext = exportFormat.value
    const defaultFileName = props.defaultFileName.replace(/\.(xlsx|csv)$/, '') + `.${ext}`
    
    // 调用文件选择器
    const selectedPath = await DataSource.selectExportPath(undefined, defaultFileName)
    
    if (selectedPath) {
      exportPath.value = selectedPath
    }
  } catch (error) {
    console.error('选择导出路径失败:', error)
  } finally {
    loading.value = false
  }
}

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
      exportPath: exportPath.value,
      format: exportFormat.value,
      options: {
        includeHeaders: includeHeaders.value,
        freezeFirstRow: exportFormat.value === 'xlsx' ? freezeFirstRow.value : undefined,
        autoColumnWidth: exportFormat.value === 'xlsx' ? autoColumnWidth.value : undefined
      }
    })
    // 不在这里关闭对话框，由父组件在成功后关闭
  } catch (error) {
    console.error('导出配置失败:', error)
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

.export-options {
  padding: 12px;
  border: 1px solid var(--q-color-grey-4);
  border-radius: 4px;
  background: var(--q-color-grey-1);
}
</style>

