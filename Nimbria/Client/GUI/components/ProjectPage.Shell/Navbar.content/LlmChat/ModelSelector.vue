<template>
  <div class="model-selector">
    <el-popover
      placement="top-start"
      :width="240"
      trigger="click"
      @show="loadActiveModels"
    >
      <template #reference>
        <el-button text size="small">
          <el-icon><component :is="'ChatDotRound'" /></el-icon>
          {{ currentModelName || '选择模型' }}
          <el-icon class="arrow-icon"><component :is="'ArrowDown'" /></el-icon>
        </el-button>
      </template>
      
      <div class="model-selector-content">
        <!-- 已选择的模型列表 -->
        <div v-if="selectedModels.length > 0" class="selected-models">
          <div class="section-title">当前模型</div>
          <el-radio-group v-model="currentModel" @change="handleModelChange">
            <div
              v-for="modelId in selectedModels"
              :key="modelId"
              class="model-item"
            >
              <el-radio :label="modelId">
                {{ getModelName(modelId) }}
              </el-radio>
              <el-button
                text
                circle
                size="small"
                @click.stop="handleRemoveModel(modelId)"
              >
                <el-icon><component :is="'Close'" /></el-icon>
              </el-button>
            </div>
          </el-radio-group>
        </div>
        
        <!-- 添加模型按钮 -->
        <el-button
          class="add-model-button"
          text
          @click="showAddModelDialog = true"
        >
          <el-icon><component :is="'Plus'" /></el-icon>
          添加模型
        </el-button>
      </div>
    </el-popover>
    
    <!-- 添加模型对话框 -->
    <el-dialog
      v-model="showAddModelDialog"
      title="选择聊天模型"
      width="400px"
    >
      <div class="add-model-dialog">
        <el-checkbox-group v-model="tempSelectedModels">
          <div
            v-for="model in availableModels"
            :key="model.id"
            class="model-checkbox-item"
          >
            <el-checkbox :label="model.id" :disabled="!model.isActive">
              <div class="model-info">
                <span class="model-name">{{ model.name }}</span>
                <el-tag v-if="!model.isActive" size="small" type="info">未激活</el-tag>
                <span class="model-provider">{{ model.provider }}</span>
              </div>
            </el-checkbox>
          </div>
        </el-checkbox-group>
        
        <el-alert
          v-if="availableModels.filter(m => m.isActive).length === 0"
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
        <el-button @click="showAddModelDialog = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAddModels">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChatStore } from '@stores/chat/chatStore'
import { ElMessage } from 'element-plus'
import type { ModelOption } from './types'

const chatStore = useChatStore()

const showAddModelDialog = ref(false)
const availableModels = ref<ModelOption[]>([])
const tempSelectedModels = ref<string[]>([])

// 计算属性
const selectedModels = computed(() => chatStore.selectedModels)
const currentModel = computed({
  get: () => chatStore.defaultModel,
  set: (value) => {
    if (value) {
      chatStore.setDefaultModel(value)
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

const loadActiveModels = () => {
  // TODO: 从设置中加载活跃的LLM模型
  // 这里使用模拟数据
  const mockModels: ModelOption[] = [
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'OpenAI',
      isActive: true,
      isSelected: false
    },
    {
      id: 'claude-3.5-sonnet',
      name: 'Claude-3.5 Sonnet',
      provider: 'Anthropic',
      isActive: true,
      isSelected: false
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'OpenAI',
      isActive: true,
      isSelected: false
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'Google',
      isActive: false,
      isSelected: false
    }
  ]
  
  availableModels.value = mockModels
  
  // 校验当前选中的模型
  const activeModelIds = mockModels.filter(m => m.isActive).map(m => m.id)
  chatStore.validateModels(activeModelIds)
}

const handleModelChange = (modelId: string) => {
  chatStore.setDefaultModel(modelId)
  ElMessage.success(`已切换到 ${getModelName(modelId)}`)
}

const handleRemoveModel = (modelId: string) => {
  const newModels = selectedModels.value.filter(id => id !== modelId)
  chatStore.setSelectedModels(newModels)
  
  if (newModels.length === 0) {
    ElMessage.warning('至少保留一个模型')
  } else {
    ElMessage.success('已移除模型')
  }
}

const handleConfirmAddModels = () => {
  if (tempSelectedModels.value.length === 0) {
    ElMessage.warning('请至少选择一个模型')
    return
  }
  
  // 合并选中的模型（去重）
  const newModels = Array.from(new Set([...selectedModels.value, ...tempSelectedModels.value]))
  chatStore.setSelectedModels(newModels)
  
  showAddModelDialog.value = false
  ElMessage.success(`已添加 ${tempSelectedModels.value.length} 个模型`)
}

// 初始化
onMounted(() => {
  loadActiveModels()
  
  // 如果没有选中的模型，自动选择第一个活跃的模型
  if (selectedModels.value.length === 0) {
    const activeModels = availableModels.value.filter(m => m.isActive)
    if (activeModels.length > 0) {
      chatStore.setSelectedModels([activeModels[0].id])
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

.model-selector-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.selected-models {
  .el-radio-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
}

.model-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background: var(--el-fill-color-light);
  }
  
  .el-radio {
    flex: 1;
  }
}

.add-model-button {
  width: 100%;
  justify-content: center;
  border-top: 1px solid var(--el-border-color);
  padding-top: 12px;
}

.add-model-dialog {
  max-height: 400px;
  overflow-y: auto;
  
  .el-checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
  }
}

.model-checkbox-item {
  padding: 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  
  .el-checkbox {
    width: 100%;
  }
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.model-provider {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

