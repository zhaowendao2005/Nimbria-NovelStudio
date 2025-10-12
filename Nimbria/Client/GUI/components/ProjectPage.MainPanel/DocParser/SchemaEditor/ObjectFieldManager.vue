<template>
  <div class="object-field-manager">
    <div class="manager-header">
      <span class="header-title">对象属性配置</span>
      <el-button 
        size="small" 
        type="primary"
        :icon="Plus"
        @click="addField"
      >
        添加字段
      </el-button>
    </div>
    
    <div class="field-list">
      <div 
        v-for="(field, index) in fields" 
        :key="field.id"
        class="field-item"
      >
        <div class="field-content">
          <!-- 字段名显示/编辑 -->
          <div class="field-name">
            <span 
              v-if="!field.editing" 
              class="field-name-text"
              @dblclick="startEdit(index)"
            >
              {{ field.name }}
            </span>
            <el-input 
              v-else 
              v-model="field.name" 
              size="small"
              class="field-name-input"
              @blur="finishEdit(index)"
              @keyup.enter="finishEdit(index)"
              @keyup.escape="cancelEdit(index)"
            />
          </div>
          
          <!-- 字段操作 -->
          <div class="field-actions">
            <el-button 
              size="small" 
              type="text"
              :icon="Edit"
              @click="startEdit(index)"
              title="编辑字段名"
            />
            <el-button 
              size="small" 
              type="text"
              :icon="Delete"
              @click="deleteField(index)"
              title="删除字段"
            />
          </div>
        </div>
      </div>
      
      <!-- 空状态提示 -->
      <div v-if="fields.length === 0" class="empty-state">
        <el-empty 
          description="暂无字段，点击上方按钮添加"
          :image-size="60"
        />
      </div>
    </div>
    
    <!-- 预览区域 -->
    <div class="preview-section">
      <div class="preview-header">
        <span class="preview-title">结构预览</span>
      </div>
      <div class="preview-content">
        <el-input
          v-model="previewJson"
          type="textarea"
          :rows="4"
          readonly
          class="preview-json"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 字段数据接口
interface ObjectField {
  id: string
  name: string
  editing?: boolean
  originalName?: string  // 用于取消编辑时恢复
}

// Props
interface Props {
  modelValue: string[]  // 字段名数组
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

// 响应式数据
const fields = ref<ObjectField[]>([])

// 计算属性
const fieldNames = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit('update:modelValue', value)
})

// 预览JSON
const previewJson = computed(() => {
  const obj: Record<string, string> = {}
  fields.value.forEach(field => {
    if (field.name.trim()) {
      obj[field.name] = ""
    }
  })
  return JSON.stringify(obj, null, 2)
})

// 初始化字段列表
const initializeFields = () => {
  fields.value = props.modelValue.map(name => ({
    id: `field_${Date.now()}_${Math.random()}`,
    name,
    editing: false
  }))
}

// 监听props变化
watch(() => props.modelValue, () => {
  initializeFields()
}, { immediate: true })

// 监听fields变化，更新modelValue
watch(fields, () => {
  const newFieldNames = fields.value
    .filter(field => !field.editing && field.name.trim())
    .map(field => field.name.trim())
  
  if (JSON.stringify(newFieldNames) !== JSON.stringify(fieldNames.value)) {
    fieldNames.value = newFieldNames
  }
}, { deep: true })

// 方法
const addField = () => {
  console.log('🔥 [ObjectFieldManager] 添加新字段')
  
  // 生成唯一字段名
  let newName = 'newField'
  let counter = 1
  const existingNames = fields.value.map(f => f.name)
  
  while (existingNames.includes(newName)) {
    newName = `newField${counter}`
    counter++
  }
  
  console.log('📝 [ObjectFieldManager] 生成的字段名:', newName)
  
  const newField: ObjectField = {
    id: `field_${Date.now()}_${Math.random()}`,
    name: newName,
    editing: true  // 新字段立即进入编辑状态
  }
  
  fields.value.push(newField)
  console.log('✅ [ObjectFieldManager] 字段已添加:', newField)
}

const startEdit = (index: number) => {
  console.log('✏️ [ObjectFieldManager] 开始编辑字段:', index)
  
  const field = fields.value[index]
  field.originalName = field.name  // 保存原始名称
  field.editing = true
  
  console.log('📝 [ObjectFieldManager] 编辑模式激活:', field.name)
}

const finishEdit = (index: number) => {
  console.log('💾 [ObjectFieldManager] 完成编辑字段:', index)
  
  const field = fields.value[index]
  const newName = field.name.trim()
  
  if (!newName) {
    ElMessage.warning('字段名不能为空')
    field.name = field.originalName || ''
    return
  }
  
  // 检查重名
  const existingNames = fields.value
    .filter((f, i) => i !== index && !f.editing)
    .map(f => f.name)
  
  if (existingNames.includes(newName)) {
    ElMessage.warning('字段名已存在')
    field.name = field.originalName || ''
    return
  }
  
  field.name = newName
  field.editing = false
  delete field.originalName
  
  console.log('✅ [ObjectFieldManager] 字段编辑完成:', newName)
}

const cancelEdit = (index: number) => {
  console.log('❌ [ObjectFieldManager] 取消编辑字段:', index)
  
  const field = fields.value[index]
  if (field.originalName !== undefined) {
    field.name = field.originalName
    delete field.originalName
  }
  field.editing = false
}

const deleteField = async (index: number) => {
  console.log('🗑️ [ObjectFieldManager] 请求删除字段:', index)
  
  const field = fields.value[index]
  
  try {
    await ElMessageBox.confirm(
      `确定要删除字段 "${field.name}" 吗？`,
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消'
      }
    )
    
    fields.value.splice(index, 1)
    console.log('✅ [ObjectFieldManager] 字段已删除:', field.name)
    ElMessage.success('字段删除成功')
    
  } catch {
    console.log('❌ [ObjectFieldManager] 取消删除字段:', field.name)
  }
}
</script>

<style scoped>
.object-field-manager {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  background: var(--el-bg-color);
  width: 100%;
  display: block;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color-page);
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.field-list {
  max-height: 200px;
  overflow-y: auto;
}

.field-item {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.field-item:last-child {
  border-bottom: none;
}

.field-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  transition: background-color 0.2s;
}

.field-content:hover {
  background: var(--el-bg-color-page);
}

.field-name {
  flex: 1;
  min-width: 0;
}

.field-name-text {
  display: inline-block;
  padding: 4px 8px;
  font-size: 14px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.field-name-text:hover {
  background: var(--el-border-color-extra-light);
}

.field-name-input {
  max-width: 150px;
}

.field-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.field-content:hover .field-actions {
  opacity: 1;
}

.empty-state {
  padding: 20px;
  text-align: center;
}

.preview-section {
  border-top: 1px solid var(--el-border-color-lighter);
}

.preview-header {
  padding: 8px 16px;
  background: var(--el-bg-color-page);
}

.preview-title {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.preview-content {
  padding: 8px 16px;
}

.preview-json {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
}

.preview-json :deep(.el-textarea__inner) {
  background: var(--el-bg-color-page);
  border: none;
  padding: 8px;
  resize: none;
}
</style>
