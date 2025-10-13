<template>
  <div class="multi-region-editor">
    <el-tabs v-model="activeTab" class="editor-tabs">
      <!-- Tab 1: 区域配置 -->
      <el-tab-pane label="区域配置" name="regions">
        <div class="regions-panel">
          <!-- 区域列表 -->
          <div class="region-list">
            <div 
              v-for="(region, index) in localSchema.regions" 
              :key="index"
              class="region-item"
              :class="{ active: currentRegionIndex === index }"
              @click="selectRegion(index)"
            >
              <div class="region-content">
                <div class="region-header">
                  <div class="region-title">
                    <el-icon class="region-icon"><Document /></el-icon>
                    <span class="region-name">{{ region.name }}</span>
                    <el-tag size="small" type="info">{{ region.description || '未命名' }}</el-tag>
                  </div>
                </div>
                
                <div class="region-info">
                  <div class="region-range">
                    <el-icon><Location /></el-icon>
                    <template v-if="region.range">
                      <span>行范围: {{ region.range.start }} - {{ region.range.end }}</span>
                    </template>
                    <template v-else-if="region.marker">
                      <span>标记: {{ region.marker.start }}</span>
                    </template>
                    <template v-else>
                      <span class="text-warning">未配置提取方式</span>
                    </template>
                  </div>
                  
                  <div class="region-schema-info">
                    <el-icon><Document /></el-icon>
                    <span v-if="region.schema">
                      类型: {{ region.schema.type }}
                      <template v-if="region.schema.properties">
                        · 字段: {{ Object.keys(region.schema.properties).length }}
                      </template>
                    </span>
                    <span v-else class="text-warning">未配置Schema</span>
                  </div>
                </div>
                
                <div class="region-actions">
                  <el-button-group size="small">
                    <el-button :icon="Edit" @click.stop="editRegion(index)">编辑</el-button>
                    <el-button :icon="Delete" @click.stop="confirmDeleteRegion(index)" type="danger">删除</el-button>
                  </el-button-group>
                </div>
              </div>
            </div>
            
            <!-- 空状态 -->
            <el-empty 
              v-if="!localSchema.regions || localSchema.regions.length === 0" 
              description="暂无区域配置"
              :image-size="120"
            />
          </div>
          
          <!-- 添加区域按钮 -->
          <el-button 
            :icon="Plus" 
            @click="addRegion" 
            class="add-region-btn"
            type="primary"
          >
            添加区域
          </el-button>
        </div>
      </el-tab-pane>
      
      <!-- Tab 2: 后处理器配置 -->
      <el-tab-pane label="数据关联" name="postProcessors">
        <PostProcessorPanel 
          v-model="localSchema.postProcessors"
          :regions="localSchema.regions || []"
        />
      </el-tab-pane>
    </el-tabs>
    
    <!-- 区域配置对话框 -->
    <RegionConfigDialog
      v-model:visible="regionDialogVisible"
      :region-data="currentEditingRegion"
      :region-index="currentEditingIndex"
      :mode="regionEditMode"
      @confirm="handleRegionConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Document, Edit, Delete, Plus, Location
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PostProcessorPanel from './PostProcessorPanel.vue'
import RegionConfigDialog from './RegionConfigDialog.vue'
import type { DocParserSchema, ParseRegion } from '@stores/projectPage/docParser/docParser.types'

interface Props {
  modelValue: DocParserSchema
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: DocParserSchema]
}>()

// 响应式数据
const activeTab = ref('regions')
const currentRegionIndex = ref(0)
const regionDialogVisible = ref(false)
const regionEditMode = ref<'add' | 'edit'>('add')
const currentEditingRegion = ref<ParseRegion | null>(null)
const currentEditingIndex = ref(-1)

// 计算属性
const localSchema = computed({
  get: () => props.modelValue,
  set: (value: DocParserSchema) => emit('update:modelValue', value)
})

// 方法
const selectRegion = (index: number) => {
  currentRegionIndex.value = index
}

const addRegion = () => {
  regionEditMode.value = 'add'
  currentEditingRegion.value = null
  currentEditingIndex.value = -1
  regionDialogVisible.value = true
}

const editRegion = (index: number) => {
  regionEditMode.value = 'edit'
  const region = localSchema.value.regions?.[index]
  if (region) {
    currentEditingRegion.value = region
    currentEditingIndex.value = index
    regionDialogVisible.value = true
  }
}

const confirmDeleteRegion = (index: number) => {
  const region = localSchema.value.regions?.[index]
  if (!region) return
  
  ElMessageBox.confirm(
    `确定要删除区域 "${region.name}" 吗？`,
    '确认删除',
    {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消'
    }
  ).then(() => {
    deleteRegion(index)
  }).catch(() => {
    // 用户取消
  })
}

const deleteRegion = (index: number) => {
  const updatedSchema = { ...localSchema.value }
  if (updatedSchema.regions) {
    updatedSchema.regions = updatedSchema.regions.filter((_, i) => i !== index)
    emit('update:modelValue', updatedSchema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)('区域删除成功')
  }
}

const handleRegionConfirm = (regionData: ParseRegion, index: number) => {
  const updatedSchema = { ...localSchema.value }
  
  if (!updatedSchema.regions) {
    updatedSchema.regions = []
  }
  
  if (index === -1) {
    // 添加新区域
    updatedSchema.regions.push(regionData)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)(`区域 "${regionData.name}" 添加成功`)
  } else {
    // 更新现有区域
    updatedSchema.regions[index] = regionData
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.success as any)(`区域 "${regionData.name}" 更新成功`)
  }
  
  emit('update:modelValue', updatedSchema)
  regionDialogVisible.value = false
}
</script>

<style scoped>
.multi-region-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.editor-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
}

.editor-tabs :deep(.el-tab-pane) {
  height: 100%;
  overflow: auto;
}

.regions-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  height: 100%;
}

.region-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  min-height: 200px;
}

.region-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  padding: 16px;
  background: var(--el-bg-color);
  cursor: pointer;
  transition: all 0.2s;
}

.region-item:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.region-item.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.region-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.region-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.region-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.region-icon {
  font-size: 18px;
  color: var(--el-color-primary);
}

.region-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.region-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-left: 26px;
}

.region-range,
.region-schema-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.region-range .el-icon,
.region-schema-info .el-icon {
  font-size: 14px;
}

.text-warning {
  color: var(--el-color-warning);
}

.region-actions {
  display: flex;
  justify-content: flex-end;
  padding-left: 26px;
}

.add-region-btn {
  width: 100%;
}

.code-preview-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px;
}

.code-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.code-toolbar .el-button {
  margin-left: 0;
}
</style>

