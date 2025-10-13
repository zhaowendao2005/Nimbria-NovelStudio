<template>
  <div class="post-processor-panel">
    <div class="panel-header">
      <div class="header-title">
        <el-icon><Connection /></el-icon>
        <span>数据关联配置</span>
      </div>
      <el-button 
        :icon="Plus" 
        size="small"
        type="primary"
        @click="addProcessor"
      >
        添加后处理器
      </el-button>
    </div>
    
    <div class="processor-list">
      <!-- 处理器列表 -->
      <div 
        v-for="(processor, index) in localProcessors" 
        :key="index"
        class="processor-item"
      >
        <div class="processor-header">
          <div class="processor-title">
            <el-icon><Connection /></el-icon>
            <span>关联器 {{ index + 1 }}</span>
            <el-tag size="small" type="primary">{{ getProcessorTypeLabel(processor.type) }}</el-tag>
          </div>
          <el-button 
            :icon="Delete" 
            size="small"
            type="danger"
            text
            @click="confirmDeleteProcessor(index)"
          >
            删除
          </el-button>
        </div>
        
        <el-form label-width="100px" class="processor-form">
          <!-- 处理类型 -->
          <el-form-item label="处理类型">
            <el-select 
              v-model="processor.type"
              style="width: 100%;"
              @change="handleProcessorTypeChange(index)"
            >
              <el-option 
                label="合并查找 - 将两个区域的数据关联" 
                value="merge-lookup" 
              />
              <el-option 
                label="交叉引用 - 在区域间建立引用" 
                value="cross-reference" 
              />
              <el-option 
                label="数据转换 - 自定义转换逻辑" 
                value="transform" 
              />
            </el-select>
          </el-form-item>
          
          <!-- merge-lookup 专用配置 -->
          <template v-if="processor.type === 'merge-lookup'">
            <el-form-item label="源数据区域">
              <el-select 
                v-model="processor.source"
                placeholder="选择源数据区域"
                style="width: 100%;"
              >
                <el-option 
                  v-for="region in regions" 
                  :key="region.name"
                  :label="`${region.name}${region.description ? ` - ${region.description}` : ''}`"
                  :value="region.name"
                />
              </el-select>
              <span class="form-tip">需要关联答案的数据源（如题目列表）</span>
            </el-form-item>
            
            <el-form-item label="查找表区域">
              <el-select 
                v-model="processor.lookup"
                placeholder="选择查找表区域"
                style="width: 100%;"
              >
                <el-option 
                  v-for="region in regions" 
                  :key="region.name"
                  :label="`${region.name}${region.description ? ` - ${region.description}` : ''}`"
                  :value="region.name"
                />
              </el-select>
              <span class="form-tip">提供关联数据的查找表（如答案列表）</span>
            </el-form-item>
            
            <el-form-item label="匹配字段">
              <el-select 
                v-model="processor.matchFields" 
                multiple
                placeholder="选择用于匹配的字段"
                style="width: 100%;"
              >
                <el-option label="chapter - 章节" value="chapter" />
                <el-option label="questionType - 题型" value="questionType" />
                <el-option label="questionNumber - 题号" value="questionNumber" />
                <el-option label="section - 章节" value="section" />
                <el-option label="id - ID" value="id" />
                <el-option label="name - 名称" value="name" />
              </el-select>
              <span class="form-tip">用于匹配两个区域数据的字段（如章节+题型+题号）</span>
            </el-form-item>
            
            <el-form-item label="匹配策略">
              <el-select 
                v-model="processor.strategy"
                style="width: 100%;"
              >
                <el-option 
                  label="精确匹配 - 所有匹配字段必须完全相同" 
                  value="exact" 
                />
                <el-option 
                  label="模糊匹配 - 允许字段有轻微差异" 
                  value="fuzzy" 
                />
                <el-option 
                  label="位置匹配 - 按顺序对应（不考虑字段内容）" 
                  value="position" 
                />
              </el-select>
              <span class="form-tip">如何判断两条数据是否匹配</span>
            </el-form-item>
            
            <el-form-item label="置信度">
              <el-slider 
                v-model="confidencePercent"
                :min="0" 
                :max="100"
                :show-tooltip="true"
                @change="handleConfidenceChange(index, $event)"
              />
              <span class="form-tip">匹配成功的最低置信度要求（{{ confidencePercent }}%）</span>
            </el-form-item>
          </template>
          
          <!-- cross-reference 专用配置 -->
          <template v-else-if="processor.type === 'cross-reference'">
            <el-form-item label="源字段">
              <el-input 
                v-model="processor.sourceField"
                placeholder="例如: questions.id"
              />
              <span class="form-tip">源数据中的字段路径</span>
            </el-form-item>
            
            <el-form-item label="目标字段">
              <el-input 
                v-model="processor.targetField"
                placeholder="例如: answers.questionId"
              />
              <span class="form-tip">目标数据中的字段路径</span>
            </el-form-item>
          </template>
          
          <!-- transform 专用配置 -->
          <template v-else-if="processor.type === 'transform'">
            <el-form-item label="转换函数">
              <el-input 
                v-model="processor.transformFn"
                placeholder="例如: parseQuestionNumber"
              />
              <span class="form-tip">自定义转换函数名称</span>
            </el-form-item>
          </template>
          
          <!-- 说明 -->
          <el-form-item label="说明">
            <el-input 
              v-model="processor.description"
              type="textarea"
              :rows="2"
              placeholder="对此后处理器的简短说明（可选）"
            />
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 空状态 -->
      <el-empty 
        v-if="!localProcessors || localProcessors.length === 0" 
        description="暂无后处理器配置"
        :image-size="120"
      >
        <template #default>
          <el-button :icon="Plus" type="primary" @click="addProcessor">
            添加第一个后处理器
          </el-button>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Connection, Plus, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { PostProcessorConfig, ParseRegion } from '@stores/projectPage/docParser/docParser.types'

interface Props {
  modelValue?: PostProcessorConfig[]
  regions: ParseRegion[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: PostProcessorConfig[]]
}>()

// 响应式数据
const confidencePercent = ref(95)

// 计算属性
const localProcessors = computed({
  get: () => props.modelValue || [],
  set: (value: PostProcessorConfig[]) => emit('update:modelValue', value)
})

// 方法
const getProcessorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'merge-lookup': '合并查找',
    'cross-reference': '交叉引用',
    'transform': '数据转换'
  }
  return labels[type] || type
}

const addProcessor = () => {
  const newProcessor: PostProcessorConfig = {
    type: 'merge-lookup',
    description: '',
    source: '',
    lookup: '',
    matchFields: [],
    strategy: 'exact',
    confidence: 0.95
  }
  
  const updated = [...localProcessors.value, newProcessor]
  emit('update:modelValue', updated)
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ElMessage.success as any)('后处理器已添加')
}

const handleProcessorTypeChange = (index: number) => {
  // 切换类型时重置相关字段
  const processor = localProcessors.value[index]
  
  if (processor.type === 'merge-lookup') {
    processor.source = ''
    processor.lookup = ''
    processor.matchFields = []
    processor.strategy = 'exact'
    processor.confidence = 0.95
  } else if (processor.type === 'cross-reference') {
    processor.sourceField = ''
    processor.targetField = ''
  } else if (processor.type === 'transform') {
    processor.transformFn = ''
  }
  
  const updated = [...localProcessors.value]
  updated[index] = processor
  emit('update:modelValue', updated)
}

const handleConfidenceChange = (index: number, value: number) => {
  const processor = localProcessors.value[index]
  processor.confidence = value / 100
  
  const updated = [...localProcessors.value]
  updated[index] = processor
  emit('update:modelValue', updated)
}

const confirmDeleteProcessor = (index: number) => {
  ElMessageBox.confirm(
    '确定要删除这个后处理器吗？',
    '确认删除',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    }
  ).then(() => {
    deleteProcessor(index)
  }).catch(() => {
    // 用户取消
  })
}

const deleteProcessor = (index: number) => {
  const updated = localProcessors.value.filter((_, i) => i !== index)
  emit('update:modelValue', updated)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ElMessage.success as any)('后处理器已删除')
}
</script>

<style scoped>
.post-processor-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.header-title .el-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.processor-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.processor-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  background: var(--el-bg-color);
}

.processor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.processor-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.processor-title .el-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

.processor-title > span {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.processor-form {
  margin-top: 12px;
}

.processor-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.processor-form :deep(.el-form-item__label) {
  font-weight: 500;
}

.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}
</style>

