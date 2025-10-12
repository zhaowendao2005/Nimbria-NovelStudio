<template>
  <el-dialog 
    v-model="visible" 
    title="JSON Schema编辑器"
    width="90%"
    top="5vh"
    class="schema-editor-dialog"
    :close-on-click-modal="false"
    @close="handleDialogClose"
  >
    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <el-button 
          :icon="Upload"
          @click="handleJsonImport"
          size="small"
        >
          从JSON导入
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-button 
          :icon="Share"
          @click="handleShare"
          size="small"
        >
          分享
        </el-button>
      </div>
    </div>

    <!-- 主要编辑区域 -->
    <div class="editor-content">
      <!-- 左侧：可视化编辑器 -->
      <div class="visual-editor-section">
        <div class="section-header">
          <span class="section-title">可视化编辑</span>
          <div class="section-actions">
            <el-button 
              size="small" 
              :icon="Plus"
              @click="handleAddRootField"
            >
              添加字段
            </el-button>
          </div>
        </div>
        <div class="editor-container">
          <el-tree
            :data="treeData"
            :props="treeProps"
            node-key="id"
            :expand-on-click-node="false"
            default-expand-all
            class="schema-tree"
          >
            <template #default="{ data }">
              <div class="tree-node-content">
                <TreeSchemaNode 
                  :node="data"
                  :data="data"
                  @field-name-change="handleFieldNameChange"
                  @field-type-change="handleFieldTypeChange"
                  @field-required-toggle="handleFieldRequiredToggle"
                  @add-child-field="handleAddChildField"
                  @delete-field="handleDeleteField"
                  @edit-field="handleEditField"
                />
                <div class="node-actions">
                  <el-dropdown trigger="click" @command="handleNodeAction">
                    <el-button 
                      :icon="MoreFilled"
                      size="small"
                      type="text"
                      circle
                    />
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item 
                          :command="{ action: 'edit', data }"
                          :icon="Edit"
                        >
                          编辑
                        </el-dropdown-item>
                        <el-dropdown-item 
                          v-if="data.type === 'object' || data.type === 'array'"
                          :command="{ action: 'addChild', data }"
                          :icon="Plus"
                        >
                          添加子字段
                        </el-dropdown-item>
                        <el-dropdown-item 
                          :command="{ action: 'delete', data }"
                          :icon="Delete"
                          divided
                        >
                          删除
                        </el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                </div>
              </div>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 右侧：代码编辑器 -->
      <div class="code-editor-section">
        <div class="section-header">
          <span class="section-title">JSON Schema代码</span>
          <div class="section-actions">
            <el-button 
              size="small" 
              :icon="RefreshRight"
              @click="handleFormatCode"
            >
              格式化
            </el-button>
            <el-button 
              size="small" 
              :icon="CopyDocument"
              @click="handleCopyCode"
            >
              复制
            </el-button>
          </div>
        </div>
        <div class="editor-container">
          <JsonSchemaCodeEditor 
            v-model="schemaJson"
            :read-only="false"
            @change="handleCodeChange"
          />
        </div>
      </div>
    </div>

    <!-- 字段配置对话框 -->
    <FieldConfigDialog 
      v-model:visible="fieldDialogVisible"
      :context="fieldEditContext"
      :initial-data="fieldFormData"
      @confirm="handleFieldConfirm"
      @cancel="handleFieldCancel"
    />

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="saving">
          确认
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue'
import { 
  Upload, Share, Plus, MoreFilled, Edit, Delete, 
  RefreshRight, CopyDocument 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import TreeSchemaNode from './TreeSchemaNode.vue'
import JsonSchemaCodeEditor from './JsonSchemaCodeEditor.vue'
import FieldConfigDialog from './FieldConfigDialog.vue'
import { treeConverter, schemaUtils, schemaGenerator, templateFactory } from '@stores/projectPage/docParser/docParser.schemaUtils'
import type { 
  JsonSchema, 
  JsonSchemaField, 
  JsonSchemaType
} from '@stores/projectPage/docParser/docParser.types'
import type { TreeNodeData } from '@stores/projectPage/docParser/docParser.schemaUtils'

// Props
interface Props {
  visible: boolean
  initialSchema: JsonSchema
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [schema: JsonSchema]
  cancel: []
}>()

// 响应式数据
const saving = ref(false)
const workingSchema = ref<JsonSchema>({ ...props.initialSchema })

// 本地类型（避免全局类型未导出导致的阻塞）
interface FieldEditForm {
  name: string
  type: JsonSchemaType
  description?: string
  required?: boolean
  enumValues?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
}

interface FieldEditContext {
  mode: 'add' | 'edit'
  parentPath: string
  fieldPath: string
  originalFieldName: string
  arrayIndex?: number
  originalFieldPath?: string
}

// 字段编辑相关
const fieldDialogVisible = ref(false)
const fieldEditContext = ref<FieldEditContext | null>(null)
const fieldFormData = reactive<FieldEditForm>({
  name: '',
  type: 'string',
  description: '',
  required: false
})

// Tree配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 计算属性
const visible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value)
})

// 可变的树数据状态
const treeData = ref<TreeNodeData[]>([])

// 监听Schema变化，更新树数据
watch(() => workingSchema.value, (newSchema) => {
  treeData.value = treeConverter.jsonSchemaToTreeData(newSchema)
}, { immediate: true, deep: true })

const schemaJson = computed({
  get: () => schemaUtils.formatSchemaToJson(workingSchema.value),
  set: (value: string) => {
    const parsed = schemaUtils.parseSchemaFromJson(value)
    if (parsed) {
      workingSchema.value = parsed
    }
  }
})

// 方法
const resetWorkingSchema = () => {
  workingSchema.value = { ...props.initialSchema }
}

const handleDialogClose = () => {
  emit('cancel')
}

const handleCancel = () => {
  emit('cancel')
  visible.value = false
}

const handleConfirm = () => {
  saving.value = true
  try {
    emit('confirm', workingSchema.value)
    visible.value = false
  } finally {
    saving.value = false
  }
}

// 字段操作
const handleAddRootField = () => {
  console.log('🔥 [SchemaEditorDialog] handleAddRootField 开始执行')
  console.log('📄 [SchemaEditorDialog] 当前workingSchema:', JSON.stringify(workingSchema.value, null, 2))
  
  const uniqueFieldName = generateUniqueFieldName('')
  console.log('🔑 [SchemaEditorDialog] 生成的唯一字段名:', uniqueFieldName)
  
  openFieldDialog('add', '', uniqueFieldName)
  console.log('✅ [SchemaEditorDialog] openFieldDialog调用完成，模式:add, 父路径:"", 字段名:', uniqueFieldName)
}

const generateUniqueFieldName = (parentPath: string): string => {
  // 获取父级字段的properties
  let parentField: any = workingSchema.value
  
  if (parentPath) {
    const pathParts = parentPath.split('.')
    for (const part of pathParts) {
      if (part.endsWith('[]')) {
        // 处理数组类型
        const arrayField = part.slice(0, -2)
        parentField = parentField.properties?.[arrayField]?.items
      } else {
        parentField = parentField.properties?.[part]
      }
    }
  }
  
  const existingFields = parentField?.properties ? Object.keys(parentField.properties) : []
  
  // 生成唯一字段名
  let fieldName = 'newField'
  let counter = 1
  while (existingFields.includes(fieldName)) {
    fieldName = `newField${counter}`
    counter++
  }
  
  return fieldName
}

const generateUniqueChildFieldName = (parentNode: TreeNodeData): string => {
  console.log('🔍 [SchemaEditorDialog] 为父节点生成唯一子字段名:', parentNode.fieldName)
  
  if (parentNode.type === 'array') {
    // 数组子项使用 item{index} 命名
    const currentIndex = parentNode.children?.length || 0
    const childName = `item${currentIndex}`
    console.log('📋 [SchemaEditorDialog] 数组子项命名:', childName)
    return childName
  } else {
    // 对象子项使用 newField{index} 命名
    const existingNames = parentNode.children?.map(child => child.fieldName) || []
    let fieldName = 'newField'
    let counter = 1
    while (existingNames.includes(fieldName)) {
      fieldName = `newField${counter}`
      counter++
    }
    console.log('📋 [SchemaEditorDialog] 对象子项命名:', fieldName)
    return fieldName
  }
}

const openFieldDialog = (
  mode: 'add' | 'edit', 
  parentPath: string, 
  fieldName: string, 
  initialData?: any
) => {
  console.log('🔥 [SchemaEditorDialog] openFieldDialog 开始执行')
  console.log('📝 [SchemaEditorDialog] 参数 - mode:', mode)
  console.log('📝 [SchemaEditorDialog] 参数 - parentPath:', parentPath)
  console.log('📝 [SchemaEditorDialog] 参数 - fieldName:', fieldName)
  console.log('📝 [SchemaEditorDialog] 参数 - initialData:', initialData)
  
  fieldEditContext.value = {
    mode,
    parentPath,
    fieldPath: parentPath ? `${parentPath}.${fieldName}` : fieldName,
    originalFieldName: fieldName
  }
  
  console.log('🏗️ [SchemaEditorDialog] 创建的fieldEditContext:', JSON.stringify(fieldEditContext.value, null, 2))
  
  if (initialData) {
    Object.assign(fieldFormData, initialData)
    console.log('📄 [SchemaEditorDialog] 使用提供的initialData更新fieldFormData')
  } else {
    Object.assign(fieldFormData, {
      name: fieldName,
      type: 'string',
      description: '',
      required: false
    })
    console.log('📄 [SchemaEditorDialog] 使用默认数据更新fieldFormData')
  }
  
  console.log('📝 [SchemaEditorDialog] 最终的fieldFormData:', JSON.stringify(fieldFormData, null, 2))
  
  fieldDialogVisible.value = true
  console.log('✅ [SchemaEditorDialog] 字段对话框已设置为可见')
}

const handleFieldConfirm = (fieldData: any, context: any) => {
  console.log('🔥 [SchemaEditorDialog] handleFieldConfirm 接收到事件')
  console.log('📝 [SchemaEditorDialog] 接收到的fieldData:', JSON.stringify(fieldData, null, 2))
  console.log('📝 [SchemaEditorDialog] 接收到的context:', JSON.stringify(context, null, 2))
  console.log('📝 [SchemaEditorDialog] 当前fieldFormData:', JSON.stringify(fieldFormData, null, 2))
  
  const fieldName = fieldData.fieldName || fieldFormData.name
  console.log('🔑 [SchemaEditorDialog] 确定使用的字段名:', fieldName)
  
  if (context?.mode === 'add') {
    console.log('➕ [SchemaEditorDialog] 执行添加字段模式')
    console.log('📍 [SchemaEditorDialog] 父路径:', context.parentPath)
    
    // 根级或对象类型父级：写入 Schema；数组父级：仅维护可视化树
    if (!context.parentPath) {
      if (!workingSchema.value.properties) {
        workingSchema.value.properties = {}
        console.log('🏗️ [SchemaEditorDialog] 初始化properties对象')
      }
      const newField: any = {
        type: fieldData.type,
        description: fieldData.description,
        required: fieldData.required
      }
      if (fieldData.type === 'array') {
        newField.items = []
      } else {
        // 为所有类型补齐 items 占位（统一格式）
        newField.items = fieldData.items ?? templateFactory.getTemplateItems(fieldData.type)
      }
      // 🆕 保存扩展字段
      if (fieldData['x-parse']) {
        newField['x-parse'] = fieldData['x-parse']
      }
      if (fieldData['x-export']) {
        newField['x-export'] = fieldData['x-export']
      }
      workingSchema.value.properties[fieldName] = newField as JsonSchemaField
    } else {
      const parentField = schemaUtils.getFieldByPath(workingSchema.value, context.parentPath)
      const parentType = (parentField as any)?.type
      if (parentType === 'object') {
        const nestedField: any = {
          type: fieldData.type,
          description: fieldData.description,
          required: fieldData.required
        }
        if (fieldData.type === 'array') {
          nestedField.items = []
        } else {
          nestedField.items = fieldData.items ?? templateFactory.getTemplateItems(fieldData.type)
        }
        // 🆕 保存扩展字段
        if (fieldData['x-parse']) {
          nestedField['x-parse'] = fieldData['x-parse']
        }
        if (fieldData['x-export']) {
          nestedField['x-export'] = fieldData['x-export']
        }
    workingSchema.value = schemaUtils.addFieldToPath(
      workingSchema.value,
      context.parentPath,
          fieldName,
          nestedField as JsonSchemaField
        )
      } else if (parentType === 'array') {
        // 数组子项：需要写入 Schema 的 items 数组，并回灌 Tree
        console.log('📋 [SchemaEditorDialog] 处理数组子项写入Schema')
        const parentArrayField: any = parentField
        if (!Array.isArray(parentArrayField.items)) {
          parentArrayField.items = []
        }
        const childSchemaField: any = {
          type: fieldData.type,
          items: fieldData.items ?? templateFactory.getTemplateItems(fieldData.type),
          description: fieldData.description,
          required: fieldData.required
        }
        // 🆕 保存扩展字段
        if (fieldData['x-parse']) {
          childSchemaField['x-parse'] = fieldData['x-parse']
        }
        if (fieldData['x-export']) {
          childSchemaField['x-export'] = fieldData['x-export']
        }
        parentArrayField.items.push(childSchemaField)
        console.log('🧩 [SchemaEditorDialog] 已写入Schema.items，长度:', parentArrayField.items.length)
        // 回灌Tree
        treeData.value = treeConverter.jsonSchemaToTreeData(workingSchema.value)
      }
    }
    
    console.log('✅ [SchemaEditorDialog] 字段已添加到workingSchema:', fieldName)
    console.log('📄 [SchemaEditorDialog] 更新后的workingSchema:', JSON.stringify(workingSchema.value, null, 2))
    
    ElMessage.success(`字段 "${fieldName}" 添加成功`)
  } else if (context?.mode === 'edit') {
    console.log('✏️ [SchemaEditorDialog] 执行编辑字段模式')
    console.log('📍 [SchemaEditorDialog] 原始字段路径:', context.fieldPath)
    console.log('📍 [SchemaEditorDialog] 原始字段名:', context.originalFieldName)
    console.log('📍 [SchemaEditorDialog] 新字段名:', fieldName)
    console.log('📍 [SchemaEditorDialog] 父路径:', context.parentPath)
    
    // 判断父节点类型
    let parentType = 'root'
    if (context.parentPath) {
      const parentField = schemaUtils.getFieldByPath(workingSchema.value, context.parentPath)
      parentType = (parentField as any)?.type || 'object'
    }
    console.log('🎯 [SchemaEditorDialog] 识别的父节点类型:', parentType)
    
    if (parentType === 'array') {
      // 数组子项：只更新Tree，不改Schema（Schema保持items: []）
      console.log('📋 [SchemaEditorDialog] 处理数组子项编辑')
      
      // 找到对应的树节点并更新
      const updateNodeInTree = (nodes: TreeNodeData[]): TreeNodeData[] => {
        return nodes.map(n => {
          if (n.fieldPath === context.fieldPath) {
            // 更新节点信息
            const updatedNode = {
              ...n,
              fieldName: fieldName,
              fieldPath: context.parentPath ? `${context.parentPath}.${fieldName}` : fieldName,
              type: fieldData.type,
              description: fieldData.description,
              isRequired: fieldData.required
            }
            console.log('🔄 [SchemaEditorDialog] 数组子项节点更新:', JSON.stringify(updatedNode, null, 2))
            return updatedNode
          } else if (n.children && n.children.length > 0) {
            return { ...n, children: updateNodeInTree(n.children) }
          }
          return n
        })
      }
      
      treeData.value = updateNodeInTree(treeData.value)
      console.log('✅ [SchemaEditorDialog] 数组子项Tree更新完成')
      
    } else {
      // root/object：更新Schema，处理字段改名
      console.log('🏗️ [SchemaEditorDialog] 处理root/object字段编辑')
      
      // 如果字段名发生变化，需要删除旧字段，添加新字段
      if (fieldName !== context.originalFieldName) {
        console.log('🔄 [SchemaEditorDialog] 字段名发生变化，执行重命名')
        
        // 获取目标properties对象
        let targetProperties: any
        if (!context.parentPath) {
          // root级别
          targetProperties = workingSchema.value.properties
        } else {
          // 嵌套对象
          const parentField = schemaUtils.getFieldByPath(workingSchema.value, context.parentPath)
          targetProperties = (parentField as any)?.properties
        }
        
        if (targetProperties && targetProperties[context.originalFieldName]) {
          // 复制旧字段数据
          const oldFieldData = targetProperties[context.originalFieldName]
          
          // 创建新字段数据
          const newField: any = {
            type: fieldData.type,
            description: fieldData.description,
            required: fieldData.required,
            ...oldFieldData // 保留其他属性如children等
          }
          
          // 更新items（统一字段）
          if (fieldData.type === 'array') {
            newField.items = oldFieldData.items || []
          } else {
            newField.items = fieldData.items ?? templateFactory.getTemplateItems(fieldData.type)
          }
          
          // 🆕 更新扩展字段
          if (fieldData['x-parse']) {
            newField['x-parse'] = fieldData['x-parse']
          } else {
            delete newField['x-parse']
          }
          if (fieldData['x-export']) {
            newField['x-export'] = fieldData['x-export']
          } else {
            delete newField['x-export']
          }
          
          // 删除旧字段，添加新字段
          delete targetProperties[context.originalFieldName]
          targetProperties[fieldName] = newField
          
          console.log('🔄 [SchemaEditorDialog] Schema字段重命名完成:', context.originalFieldName, '->', fieldName)
        }
        
        // 更新Tree（路径级联更新）
        treeData.value = treeConverter.renameNodeAndUpdatePath(treeData.value, context.fieldPath, fieldName)
        console.log('🌳 [SchemaEditorDialog] Tree路径级联更新完成')
        
  } else {
        // 字段名未变化，只更新属性
        console.log('📝 [SchemaEditorDialog] 字段名未变化，仅更新属性')
        
        const updatedField: any = {
          type: fieldData.type,
          description: fieldData.description,
          required: fieldData.required,
          items: fieldData.items ?? templateFactory.getTemplateItems(fieldData.type)
        }
        // 🆕 更新扩展字段
        if (fieldData['x-parse']) {
          updatedField['x-parse'] = fieldData['x-parse']
        }
        if (fieldData['x-export']) {
          updatedField['x-export'] = fieldData['x-export']
        }
    workingSchema.value = schemaUtils.setFieldByPath(
      workingSchema.value,
      context.fieldPath,
          updatedField
        )
        
        // 同步更新Tree
        treeData.value = treeConverter.jsonSchemaToTreeData(workingSchema.value)
      }
    }
    
    console.log('✅ [SchemaEditorDialog] 字段编辑完成')
    console.log('📄 [SchemaEditorDialog] 更新后的workingSchema:', JSON.stringify(workingSchema.value, null, 2))
    
    ElMessage.success(`字段编辑成功: ${context.originalFieldName} -> ${fieldName}`)
  }
  
  fieldDialogVisible.value = false
  console.log('🏁 [SchemaEditorDialog] handleFieldConfirm 执行结束')
}

const handleFieldCancel = () => {
  fieldDialogVisible.value = false
}

// 代码编辑
const handleCodeChange = (newCode: string) => {
  const parsed = schemaUtils.parseSchemaFromJson(newCode)
  if (parsed) {
    workingSchema.value = parsed
  }
}

const handleFormatCode = () => {
  ElMessage.success('代码已格式化')
}

const handleCopyCode = async () => {
  try {
    await navigator.clipboard.writeText(schemaJson.value)
    ElMessage.success('代码已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// LLM生成
const openLlmGenerator = () => {
  llmDialogVisible.value = true
}

const handleLlmConfirm = (generatedSchema: JsonSchema) => {
  workingSchema.value = generatedSchema
  llmDialogVisible.value = false
  ElMessage.success('Schema生成成功')
}

// 其他功能
const handleJsonImport = async () => {
  try {
    const text = await navigator.clipboard.readText()
    try {
      const jsonData = JSON.parse(text)
      const generatedSchema = schemaGenerator.generateSchemaFromJson(jsonData, {
        includeDescriptions: true,
        includeExamples: false,
        strictMode: false
      })
      
      workingSchema.value = generatedSchema
      ElMessage.success('JSON导入成功')
    } catch (parseError) {
      ElMessage.error('剪贴板内容不是有效的JSON格式')
    }
  } catch (clipboardError) {
    ElMessage.error('读取剪贴板失败，请手动粘贴JSON数据')
  }
}

const handleShare = async () => {
  try {
    await navigator.clipboard.writeText(schemaJson.value)
    ElMessage.success('Schema已复制到剪贴板，可以分享给其他人')
  } catch (error) {
    ElMessage.error('分享失败')
  }
}

// 新的事件处理函数
const handleFieldNameChange = (node: TreeNodeData, newName: string) => {
  console.log('🔥 [SchemaEditorDialog] handleFieldNameChange 开始执行')
  console.log('📝 [SchemaEditorDialog] 节点信息:', JSON.stringify(node, null, 2))
  console.log('📝 [SchemaEditorDialog] 新字段名:', newName)
  console.log('📄 [SchemaEditorDialog] 重命名前的workingSchema:', JSON.stringify(workingSchema.value, null, 2))
  
  if (!schemaUtils.isValidFieldName(newName)) {
    console.error('❌ [SchemaEditorDialog] 字段名格式不正确:', newName)
    ElMessage.error('字段名格式不正确')
    return
  }
  
  console.log('✅ [SchemaEditorDialog] 字段名格式验证通过')
  console.log('🔄 [SchemaEditorDialog] 调用treeConverter.renameNodeAndUpdatePath')
  
  // 使用工具函数重命名并更新路径
  treeData.value = treeConverter.renameNodeAndUpdatePath(treeData.value, node.id, newName)
  console.log('🌳 [SchemaEditorDialog] 重命名后的treeData:', JSON.stringify(treeData.value, null, 2))
  
  // 将树数据转换回Schema
  workingSchema.value = treeConverter.treeDataToSchema(treeData.value)
  console.log('📄 [SchemaEditorDialog] 重命名后的workingSchema:', JSON.stringify(workingSchema.value, null, 2))
  
  ElMessage.success(`字段重命名成功: ${node.fieldName} -> ${newName}`)
  console.log('🏁 [SchemaEditorDialog] handleFieldNameChange 执行结束')
}

const handleFieldTypeChange = (node: TreeNodeData, newType: JsonSchemaType) => {
  // 找到节点并更新类型
  const updateNodeType = (nodes: TreeNodeData[]): TreeNodeData[] => {
    return nodes.map(n => {
      if (n.id === node.id) {
        const updatedNode = treeConverter.changeNodeType(n, newType)
        return updatedNode
      } else if (n.children) {
        return { ...n, children: updateNodeType(n.children) }
      }
      return n
    })
  }
  
  treeData.value = updateNodeType(treeData.value)
  workingSchema.value = treeConverter.treeDataToSchema(treeData.value)
  
  ElMessage.success('字段类型已更新')
}

const handleFieldRequiredToggle = (node: TreeNodeData) => {
  // 切换必填状态
  const toggleNodeRequired = (nodes: TreeNodeData[]): TreeNodeData[] => {
    return nodes.map(n => {
      if (n.id === node.id) {
        return { ...n, isRequired: !n.isRequired }
      } else if (n.children) {
        return { ...n, children: toggleNodeRequired(n.children) }
      }
      return n
    })
  }
  
  treeData.value = toggleNodeRequired(treeData.value)
  workingSchema.value = treeConverter.treeDataToSchema(treeData.value)
  
  ElMessage.success(node.isRequired ? '已设为非必填' : '已设为必填')
}

const handleAddChildField = (parentNode: TreeNodeData, childType: JsonSchemaType, fieldName?: string) => {
  console.log('🔥 [SchemaEditorDialog] handleAddChildField 开始执行')
  console.log('📝 [SchemaEditorDialog] 父节点信息:', JSON.stringify(parentNode, null, 2))
  console.log('📝 [SchemaEditorDialog] 子节点类型:', childType)
  console.log('📝 [SchemaEditorDialog] 指定字段名:', fieldName)
  console.log('📄 [SchemaEditorDialog] 添加前的treeData:', JSON.stringify(treeData.value, null, 2))

  // 统一走表单流程：对象父级和数组父级都开表单
  const name = fieldName || generateUniqueChildFieldName(parentNode)
  console.log('🔑 [SchemaEditorDialog] 生成的子字段名:', name)
  
  openFieldDialog('add', parentNode.fieldPath, name, {
    name,
    type: childType || 'object', // 数组子项默认为object类型
    description: '',
    required: false
  })
  console.log('✅ [SchemaEditorDialog] 已打开字段配置对话框用于添加子字段')
  console.log('🏁 [SchemaEditorDialog] handleAddChildField 执行结束')
}

const handleDeleteField = (node: TreeNodeData) => {
  ElMessageBox.confirm('确定要删除这个字段吗？', '确认删除', {
    type: 'warning'
  }).then(() => {
    // 递归删除节点
    const removeNode = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes.filter(n => {
        if (n.id === node.id) {
          return false  // 删除这个节点
        }
        if (n.children) {
          n.children = removeNode(n.children)
        }
        return true
      })
    }
    
    treeData.value = removeNode(treeData.value)
    workingSchema.value = treeConverter.treeDataToSchema(treeData.value)
    
    ElMessage.success('字段删除成功')
  }).catch(() => {
    // 用户取消删除
  })
}

// 下拉菜单动作处理
const handleNodeAction = (command: { action: string, data: TreeNodeData }) => {
  console.log('🔥 [SchemaEditorDialog] handleNodeAction 开始执行')
  console.log('📝 [SchemaEditorDialog] 接收到的命令:', JSON.stringify(command, null, 2))
  
  const { action, data } = command
  
  switch (action) {
    case 'edit':
      console.log('✏️ [SchemaEditorDialog] 执行编辑动作')
      handleEditField(data)
      break
      
    case 'addChild':
      console.log('➕ [SchemaEditorDialog] 执行添加子字段动作')
      handleAddChildField(data, 'object') // 默认添加object类型，用户可在表单中修改
      break
      
    case 'delete':
      console.log('🗑️ [SchemaEditorDialog] 执行删除动作')
      handleDeleteField(data)
      break
      
    default:
      console.warn('⚠️ [SchemaEditorDialog] 未知的动作类型:', action)
      ElMessage.warning(`未知操作: ${action}`)
      break
  }
  
  console.log('🏁 [SchemaEditorDialog] handleNodeAction 执行结束')
}

const handleEditField = (node: TreeNodeData) => {
  console.log('✏️ [SchemaEditorDialog] handleEditField 开始执行')
  const parentPath = node.fieldPath.includes('.')
    ? node.fieldPath.split('.').slice(0, -1).join('.')
    : ''
  const initialData = {
    name: node.fieldName,
    type: node.type,
    description: node.description || '',
    required: node.isRequired
  }
  openFieldDialog('edit', parentPath, node.fieldName, initialData)
}

// 监听器
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    resetWorkingSchema()
  }
})

watch(() => props.initialSchema, (newSchema) => {
  if (props.visible) {
    workingSchema.value = { ...newSchema }
  }
}, { deep: true })
</script>

<style scoped>
.schema-editor-dialog {
  --el-dialog-padding-primary: 0;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 8px;
}

.editor-content {
  display: flex;
  height: 70vh;
  min-height: 500px;
}

.visual-editor-section,
.code-editor-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.visual-editor-section {
  border-right: 1px solid var(--el-border-color-light);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.section-actions {
  display: flex;
  gap: 8px;
}

.editor-container {
  flex: 1;
  overflow: auto;
}

.schema-tree {
  padding: 8px;
  background: transparent;
}

.tree-node-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;
}

.node-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.tree-node-content:hover .node-actions {
  opacity: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-page);
}

.schema-tree :deep(.el-tree-node__content) {
  height: auto;
  min-height: 32px;
  padding: 4px 0;
}
</style>