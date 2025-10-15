<template>
  <div class="model-selector">
    <el-dropdown trigger="click" @show="loadActiveModels" @command="handleDropdownCommand">
      <el-button text size="small">
        <el-icon><component :is="'ChatDotRound'" /></el-icon>
        {{ currentModelName || '选择模型' }}
        <el-icon class="arrow-icon"><component :is="'ArrowDown'" /></el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu class="model-dropdown-menu">
          <!-- 已选择的模型列表 -->
          <template v-if="selectedModels.length > 0">
            <div class="section-title">当前模型</div>
            <el-dropdown-item
              v-for="modelId in selectedModels"
              :key="modelId"
              :command="{ action: 'select', modelId }"
              :class="{ 'is-active': modelId === currentModel }"
              class="model-item"
            >
              <div class="model-content">
                <span class="model-name">{{ getModelName(modelId) }}</span>
                <el-button
                  text
                  circle
                  size="small"
                  @click.stop="handleRemoveModel(modelId)"
                  class="remove-btn"
                >
                  <el-icon><component :is="'Close'" /></el-icon>
                </el-button>
              </div>
            </el-dropdown-item>
            <el-dropdown-item divided disabled class="divider-item" />
          </template>
          
          <!-- 添加模型按钮 -->
          <el-dropdown-item :command="{ action: 'add' }" class="add-model-item">
            <el-icon><component :is="'Plus'" /></el-icon>
            添加模型
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
    
    <!-- 添加模型对话框 - 树形结构 -->
    <el-dialog
      v-model="showAddModelDialog"
      title="选择聊天模型"
      width="500px"
    >
      <div class="add-model-dialog">
        <div v-if="modelTree.length > 0" class="model-tree">
          <!-- 按提供商分组的树形结构 -->
          <div
            v-for="provider in modelTree"
            :key="provider.id"
            class="provider-group"
          >
            <div class="provider-header">
              <el-checkbox
                :model-value="isProviderAllSelected(provider)"
                :indeterminate="isProviderIndeterminate(provider)"
                @change="handleProviderCheckChange(provider, $event)"
              >
                <span class="provider-name">{{ provider.name }}</span>
                <el-tag size="small" type="info">{{ provider.models.length }} 个模型</el-tag>
              </el-checkbox>
            </div>
            
            <div class="provider-models">
              <el-checkbox
                v-for="model in provider.models"
                :key="model.id"
                :label="model.id"
                :model-value="tempSelectedModels.includes(model.id)"
                :disabled="!model.isActive"
                @change="handleModelCheckChange(model.id, $event)"
              >
                <div class="model-info">
                  <span class="model-name">{{ model.name }}</span>
                  <el-tag v-if="!model.isActive" size="small" type="warning">未激活</el-tag>
                  <el-tag v-if="model.isSelected" size="small" type="success">已选中</el-tag>
                </div>
              </el-checkbox>
            </div>
          </div>
        </div>
        
        <el-alert
          v-else
          type="warning"
          :closable="false"
          show-icon
        >
          <template #title>
            没有可用的模型，请先在设置中配置LLM模型
          </template>
        </el-alert>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <span class="selected-count">已选择 {{ tempSelectedModels.length }} 个模型</span>
          <div>
            <el-button @click="showAddModelDialog = false">取消</el-button>
            <el-button type="primary" @click="handleConfirmAddModels" :disabled="tempSelectedModels.length === 0">
              确定
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useLlmChatStore } from '@stores/llmChat/llmChatStore'
import { ElMessage } from 'element-plus'
import type { ModelOption } from './types'

const llmChatStore = useLlmChatStore()

const showAddModelDialog = ref(false)
const availableModels = ref<ModelOption[]>([])
const tempSelectedModels = ref<string[]>([])

// 树形结构数据
interface ProviderNode {
  id: string
  name: string
  models: ModelOption[]
}

const modelTree = computed<ProviderNode[]>(() => {
  const providerMap = new Map<string, ProviderNode>()
  
  for (const model of availableModels.value) {
    if (!providerMap.has(model.provider)) {
      providerMap.set(model.provider, {
        id: model.provider,
        name: model.provider,
        models: []
      })
    }
    providerMap.get(model.provider)!.models.push(model)
  }
  
  return Array.from(providerMap.values())
})

// 计算属性
const selectedModels = computed(() => llmChatStore.selectedModels)

// 当前对话使用的模型
const currentModel = computed({
  get: () => {
    const activeConv = llmChatStore.activeConversation
    return activeConv?.modelId || (selectedModels.value.length > 0 ? selectedModels.value[0] : '')
  },
  set: async (value) => {
    if (value && llmChatStore.activeConversationId) {
      await llmChatStore.switchModel(llmChatStore.activeConversationId, value)
    }
  }
})

const currentModelName = computed(() => {
  if (!currentModel.value) return ''
  const model = availableModels.value.find(m => m.id === currentModel.value)
  return model?.name || currentModel.value
})

// 方法
const getModelName = (modelId: string): string => {
  const model = availableModels.value.find(m => m.id === modelId)
  return model?.name || modelId
}

const loadActiveModels = async () => {
  try {
    const response = await window.nimbria.llm.getProviders()
    
    if (!response.success || !response.providers) {
      ElMessage.error('获取模型列表失败')
      return
    }
    
    const models: ModelOption[] = []
    
    // 遍历所有 Provider
    for (const provider of response.providers) {
      // 只处理状态为 'active' 的提供商
      if (provider.status !== 'active') continue
      
      // 遍历 supportedModels (按模型类型分组)
      for (const modelGroup of provider.supportedModels) {
        const modelType = modelGroup.type
        
        // 获取该类型下已选中的模型名称列表
        const selectedModelNames = provider.activeModels?.[modelType]?.selectedModels || []
        
        // 只遍历已选中的模型
        for (const modelName of selectedModelNames) {
          const model = modelGroup.models.find(m => m.name === modelName)
          if (!model) continue
          
          const modelId = `${provider.id}::${model.name}`
          models.push({
            id: modelId,
            name: model.name,
            displayName: (model as any).displayName,
            provider: provider.displayName || provider.name,
            type: modelType,
            isActive: true
          })
        }
      }
    }
    
    availableModels.value = models
    
    // 校验当前选中的模型
    await llmChatStore.validateModels()
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败')
  }
}

const handleDropdownCommand = (command: { action: string; modelId?: string }) => {
  if (command.action === 'select' && command.modelId) {
    handleModelChange(command.modelId)
  } else if (command.action === 'add') {
    showAddModelDialog.value = true
  }
}

const handleModelChange = async (modelId: string) => {
  if (llmChatStore.activeConversationId) {
    // 有活跃对话时，切换对话的模型
    await llmChatStore.switchModel(llmChatStore.activeConversationId, modelId)
    ElMessage.success(`已切换到 ${getModelName(modelId)}`)
  } else {
    // 无对话时，设置为默认模型（置顶选中的模型）
    const currentModels = [...selectedModels.value]
    const otherModels = currentModels.filter(id => id !== modelId)
    const newModels = [modelId, ...otherModels]
    llmChatStore.setSelectedModels(newModels)
    ElMessage.success(`已设置 ${getModelName(modelId)} 为默认模型`)
  }
}

const handleRemoveModel = (modelId: string) => {
  const newModels = selectedModels.value.filter(id => id !== modelId)
  llmChatStore.setSelectedModels(newModels)
  
  if (newModels.length === 0) {
    ElMessage.warning('至少保留一个模型')
  } else {
    ElMessage.success('已移除模型')
  }
}

// 树形结构交互逻辑
const isProviderAllSelected = (provider: ProviderNode): boolean => {
  const activeModels = provider.models.filter(m => m.isActive)
  if (activeModels.length === 0) return false
  return activeModels.every(m => tempSelectedModels.value.includes(m.id))
}

const isProviderIndeterminate = (provider: ProviderNode): boolean => {
  const activeModels = provider.models.filter(m => m.isActive)
  if (activeModels.length === 0) return false
  const selectedCount = activeModels.filter(m => tempSelectedModels.value.includes(m.id)).length
  return selectedCount > 0 && selectedCount < activeModels.length
}

const handleProviderCheckChange = (provider: ProviderNode, checked: boolean) => {
  const activeModelIds = provider.models.filter(m => m.isActive).map(m => m.id)
  
  if (checked) {
    // 全选该提供商的所有活跃模型
    tempSelectedModels.value = Array.from(new Set([...tempSelectedModels.value, ...activeModelIds]))
  } else {
    // 取消选择该提供商的所有模型
    tempSelectedModels.value = tempSelectedModels.value.filter(id => !activeModelIds.includes(id))
  }
}

const handleModelCheckChange = (modelId: string, checked: boolean) => {
  if (checked) {
    if (!tempSelectedModels.value.includes(modelId)) {
      tempSelectedModels.value.push(modelId)
    }
  } else {
    const index = tempSelectedModels.value.indexOf(modelId)
    if (index > -1) {
      tempSelectedModels.value.splice(index, 1)
    }
  }
}

const handleConfirmAddModels = () => {
  if (tempSelectedModels.value.length === 0) {
    ElMessage.warning('请至少选择一个模型')
    return
  }
  
  // 合并选中的模型（去重）
  const newModels = Array.from(new Set([...selectedModels.value, ...tempSelectedModels.value]))
  llmChatStore.setSelectedModels(newModels)
  
  showAddModelDialog.value = false
  ElMessage.success(`已添加 ${tempSelectedModels.value.length} 个模型`)
}

// 初始化
onMounted(async () => {
  await loadActiveModels()
  
  // 如果没有选中的模型，自动选择第一个活跃的模型
  if (selectedModels.value.length === 0) {
    const activeModels = availableModels.value.filter(m => m.isActive)
    if (activeModels.length > 0) {
      llmChatStore.setSelectedModels([activeModels[0].id])
    }
  }
})
</script>

<style scoped lang="scss">
.model-selector {
  .arrow-icon {
    margin-left: 4px;
    font-size: 12px;
  }
}

.model-dropdown-menu {
  min-width: 200px;
  max-width: 280px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 8px 16px 4px;
  margin: 0;
}

.model-item {
  &.is-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
  
  .model-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    
    .model-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      line-height: 1.4;
    }
    
    .remove-btn {
      flex-shrink: 0;
      margin-left: 8px;
      opacity: 0.6;
      
      &:hover {
        opacity: 1;
        color: var(--el-color-danger);
      }
    }
  }
}

.divider-item {
  height: 1px;
  margin: 4px 0;
  padding: 0;
  background: var(--el-border-color);
}

.add-model-item {
  color: var(--el-color-primary);
  font-weight: 500;
  
  .el-icon {
    margin-right: 6px;
  }
}

.add-model-dialog {
  max-height: 500px;
  overflow-y: auto;
}

.model-tree {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.provider-group {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  overflow: hidden;
  
  .provider-header {
    background: var(--el-fill-color-light);
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color);
    
    .el-checkbox {
      width: 100%;
      
      .provider-name {
        font-weight: 600;
        font-size: 14px;
        margin-right: 8px;
      }
    }
  }
  
  .provider-models {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    .el-checkbox {
      padding: 8px 12px;
      margin: 0 !important; // 移除默认缩进
      border-radius: 4px;
      transition: background-color 0.2s;
      
      &:hover {
        background: var(--el-fill-color-light);
      }
      
      // 移除 Element Plus 默认的左侧 padding
      :deep(.el-checkbox__label) {
        padding-left: 6px !important;
        font-size: 12px;
        line-height: 20px;
      }
      
      :deep(.el-checkbox__input) {
        margin-right: 6px;
      }
    }
  }
}

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0; // 允许子元素缩小
  
  .model-name {
    font-size: 13px;
    color: var(--el-text-color-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex-shrink: 1;
  }
  
  .el-tag {
    flex-shrink: 0; // 标签不缩小
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .selected-count {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
</style>

