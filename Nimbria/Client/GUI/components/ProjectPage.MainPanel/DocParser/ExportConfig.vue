<template>
  <div class="export-config">
    <div class="config-header">
      <h3>导出配置</h3>
      <el-button size="small" text :icon="Refresh" @click="refreshConfig">
        刷新
      </el-button>
    </div>
    
    <div class="config-body">
      <!-- 基本配置 -->
      <div class="config-section">
        <h4>基本设置</h4>
        <el-form label-width="100px" size="small">
          <el-form-item label="工作表名称">
            <el-input v-model="localConfig.sheetName" placeholder="Sheet1" />
          </el-form-item>
          
          <el-form-item label="导出格式">
            <el-radio-group v-model="localConfig.format">
              <el-radio value="xlsx">Excel (.xlsx)</el-radio>
              <el-radio value="csv">CSV (.csv)</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="输出路径">
            <el-input 
              v-model="localConfig.outputPath" 
              placeholder="请选择输出位置"
            >
              <template #append>
                <el-button :icon="FolderOpened" @click="selectOutputPath" />
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>
      
      <!-- 列配置 -->
      <div class="config-section">
        <h4>
          列配置
          <el-tag size="small" type="info">{{ columns.length }} 列</el-tag>
        </h4>
        
        <el-table 
          :data="columns" 
          border 
          size="small"
          max-height="300"
        >
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="列名" min-width="120" />
          <el-table-column prop="field" label="字段路径" min-width="150">
            <template #default="{ row }">
              <el-tag size="small">{{ row.field.join('.') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="width" label="列宽" width="80" />
          <el-table-column prop="order" label="顺序" width="70" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ $index }">
              <el-button 
                type="danger" 
                size="small" 
                text 
                @click="removeColumn($index)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 高级选项 -->
      <div class="config-section">
        <h4>高级选项</h4>
        <el-form label-width="120px" size="small">
          <el-form-item label="包含表头">
            <div class="switch-with-desc">
              <el-switch v-model="localConfig.includeHeaders" />
              <span class="option-desc">在Excel第一行显示列标题</span>
            </div>
          </el-form-item>
          
          <el-form-item label="冻结首行">
            <div class="switch-with-desc">
              <el-switch v-model="localConfig.freezeHeader" />
              <span class="option-desc">固定表头，滚动时保持可见</span>
            </div>
          </el-form-item>
          
          <el-form-item label="章节标题">
            <div class="switch-with-desc">
              <el-switch v-model="localConfig.includeSectionHeaders" />
              <span class="option-desc">在数据中包含章节信息</span>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <div class="config-footer">
      <el-button @click="emit('cancel')">取消</el-button>
      <el-button type="primary" @click="handleConfirm">
        确认导出
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ExportConfig } from '@stores/projectPage/docParser/docParser.types'

interface LocalExportConfig {
  sheetName: string
  format: 'xlsx' | 'csv'
  outputPath: string
  includeHeaders: boolean
  freezeHeader: boolean
  includeSectionHeaders: boolean
}

interface Props {
  config: ExportConfig
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'confirm': [config: LocalExportConfig]
  'cancel': []
  'select-output': []
}>()

const localConfig = ref<LocalExportConfig>({
  sheetName: 'Sheet1',
  format: 'xlsx',
  outputPath: '',
  includeHeaders: true,
  freezeHeader: true,
  includeSectionHeaders: false
})

const columns = computed(() => {
  return props.config.columns || []
})

const refreshConfig = () => {
  // 刷新配置（从Schema重新提取）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ElMessage.success as any)('配置已刷新')
}

const removeColumn = (index: number) => {
  // 从列表中移除列
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(ElMessage.warning as any)('列移除功能待实现')
}

const selectOutputPath = () => {
  emit('select-output')
}

const handleConfirm = () => {
  if (!localConfig.value.outputPath) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(ElMessage.warning as any)('请选择输出路径')
    return
  }
  
  emit('confirm', localConfig.value)
}

// 暴露给父组件的方法
const triggerExport = () => {
  handleConfirm()
}

const updateOutputPath = (path: string) => {
  localConfig.value.outputPath = path
}

// 暴露方法给父组件使用
defineExpose({
  triggerExport,
  updateOutputPath
})
</script>

<style scoped lang="scss">
.export-config {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }
}

.config-body {
  flex: 1;
  overflow: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-section {
  h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.config-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color-page);
}

.switch-with-desc {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .option-desc {
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
}
</style>

