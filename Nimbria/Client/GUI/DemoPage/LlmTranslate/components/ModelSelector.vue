<template>
  <div class="model-selector">
    <el-select
      :model-value="modelValue"
      @update:model-value="handleModelChange"
      placeholder="请选择模型"
      filterable
      class="model-select"
    >
      <el-option-group
        v-for="group in groupedModels"
        :key="group.providerId"
        :label="group.providerName"
      >
        <el-option
          v-for="model in group.models"
          :key="model.modelId"
          :label="model.modelName"
          :value="model.modelId"
        >
          <div class="model-option">
            <span class="model-name">{{ model.modelName }}</span>
          </div>
        </el-option>
      </el-option-group>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import type { ModelOption, ModelGroup } from '../types/model'

interface Props {
  modelValue?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 提供商列表
const providers = ref<any[]>([])

// 加载提供商和模型列表
const loadProviders = async () => {
  try {
    // 调用 Nimbria API 获取所有提供商配置
    const result = await (window as any).nimbria.llm.getProviders()
    
    if (result.success) {
      providers.value = result.providers || []
      console.log('✅ [ModelSelector] 加载了', providers.value.length, '个提供商')
    } else {
      throw new Error(result.error || '获取提供商失败')
    }
  } catch (error) {
    console.error('❌ [ModelSelector] 加载提供商失败:', error)
    ElMessage.error('加载模型列表失败')
  }
}

// 按提供商分组的模型列表
const groupedModels = computed<ModelGroup[]>(() => {
  const groups: ModelGroup[] = []
  
  for (const provider of providers.value) {
    // 检查是否有 supportedModels
    if (!provider.supportedModels || provider.supportedModels.length === 0) {
      continue
    }
    
    const models: ModelOption[] = []
    
    // 遍历所有模型类型组（LLM, TEXT_EMBEDDING 等）
    for (const modelGroup of provider.supportedModels) {
      // 只提取 LLM 类型的模型用于翻译
      if (modelGroup.type !== 'LLM') {
        continue
      }
      
      // 遍历该类型下的所有模型
      for (const model of modelGroup.models) {
        // 检查模型是否已激活
        const isModelActive = provider.activeModels?.LLM?.selectedModels?.includes(model.name) ?? false
        const isProviderActive = provider.status === 'active'
        
        // 只添加已激活的模型
        if (isModelActive && isProviderActive) {
          models.push({
            modelId: `${provider.id}.${model.name}`,
            modelName: model.name, // 使用模型原始名称
            providerId: provider.id,
            providerName: provider.displayName || provider.name,
            isActive: true // 已经过滤了，所以一定是激活的
          })
        }
      }
    }
    
    // 只有当提供商有可用的 LLM 模型时才添加到列表
    if (models.length > 0) {
      groups.push({
        providerId: provider.id,
        providerName: provider.displayName || provider.name,
        models
      })
    }
  }
  
  return groups
})

// 处理模型选择变更
const handleModelChange = (value: string) => {
  console.log('🔄 [ModelSelector] 选择模型:', value)
  emit('update:modelValue', value)
}

// 获取模型完整信息
const getModelInfo = (modelId: string): ModelOption | null => {
  for (const group of groupedModels.value) {
    const model = group.models.find(m => m.modelId === modelId)
    if (model) {
      return model
    }
  }
  return null
}

// 组件挂载时加载提供商列表
onMounted(() => {
  loadProviders()
})

// 暴露方法供父组件调用
defineExpose({
  getModelInfo,
  reload: loadProviders
})
</script>

<style scoped lang="scss">
.model-selector {
  width: 100%;

  .model-select {
    width: 100%;
  }

  .model-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .model-name {
      flex: 1;
      font-size: 13px;
      color: #333;
    }
  }
}

// Element Plus 分组样式覆盖
:deep(.el-select-group__title) {
  font-size: 12px;
  font-weight: bold;
  color: #409eff;
  padding-left: 12px;
}
</style>

