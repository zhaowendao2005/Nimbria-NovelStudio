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
      
      <!-- 🆕 Word 导出配置 -->
      <div class="config-section">
        <h4>
          Word 导出设置
          <el-tag 
            :type="localConfig.wordExport?.enabled ? 'success' : 'info'" 
            size="small"
          >
            {{ localConfig.wordExport?.enabled ? '已启用' : '未启用' }}
          </el-tag>
        </h4>
        
        <el-form label-width="120px" size="small">
          <el-form-item label="启用 Word 导出">
            <el-switch v-model="wordExportEnabled" />
            <span class="form-tip">检测图片和表格，自动导出到 Word 文档</span>
          </el-form-item>
          
          <template v-if="wordExportEnabled">
            <el-form-item label="Word 文档名称">
              <el-input 
                v-model="wordFilename" 
                placeholder="自动生成"
              />
              <span class="form-tip">留空则根据 Excel 文件名自动生成</span>
            </el-form-item>
            
            <el-form-item label="包含章节标题">
              <el-switch v-model="wordIncludeChapters" />
            </el-form-item>
            
            <el-form-item label="图片处理方式">
              <el-radio-group v-model="wordImageHandling">
                <el-radio value="keep">保留图片</el-radio>
                <el-radio value="reference">引用链接</el-radio>
                <el-radio value="remove">移除图片</el-radio>
              </el-radio-group>
            </el-form-item>
          </template>
        </el-form>
        
        <!-- Word 导出统计 -->
        <div v-if="wordExportEnabled && exportPreview" class="word-export-stats">
          <h5>导出预览</h5>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">总题目数</span>
              <span class="stat-value">{{ exportPreview?.totalItems }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Word 导出</span>
              <span class="stat-value highlight">{{ exportPreview?.wordItems }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Excel 保留</span>
              <span class="stat-value">{{ exportPreview?.excelItems }}</span>
            </div>
          </div>
          
          <!-- 预览项目 -->
          <div v-if="exportPreview?.previewItems.length > 0" class="preview-items">
            <h6>需要 Word 导出的题目预览：</h6>
            <div class="preview-list">
              <div 
                v-for="item in exportPreview?.previewItems.filter(i => i.needsWordExport)" 
                :key="item.id"
                class="preview-item"
              >
                <el-tag size="small" type="warning">{{ item.id }}</el-tag>
                <span class="preview-reason">
                  {{ item.wordExportReason?.join(', ') || '检测到图片或表格' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 列配置 -->
      <div class="config-section">
        <h4>
          列配置
          <el-tag size="small" type="info">
            {{ columns.filter(c => c.type === 'column').length }} 列
          </el-tag>
          <el-tag 
            v-if="columns.filter(c => c.type === 'section-header').length > 0" 
            size="small" 
            type="warning"
          >
            {{ columns.filter(c => c.type === 'section-header').length }} 章节标题
          </el-tag>
        </h4>
        
        <el-table 
          :data="columns" 
          border 
          size="small"
          max-height="300"
        >
          <el-table-column type="index" label="#" width="50" />
          <el-table-column prop="name" label="列名" min-width="120">
            <template #default="{ row }">
              <span>{{ row.name }}</span>
              <el-tag 
                v-if="row.type === 'section-header'" 
                size="small" 
                type="warning"
                style="margin-left: 8px"
              >
                合并{{ row.mergeCols }}列
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="field" label="字段路径" min-width="150">
            <template #default="{ row }">
              <el-tag size="small">{{ row.field.join('.') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100">
            <template #default="{ row }">
              <el-tag 
                :type="row.type === 'column' ? 'primary' : 'warning'"
                size="small"
              >
                {{ row.type === 'column' ? '普通列' : '章节标题' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="width" label="列宽" width="80">
            <template #default="{ row }">
              {{ row.type === 'column' ? row.width : '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="order" label="顺序" width="70">
            <template #default="{ row }">
              {{ row.type === 'column' ? row.order : '-' }}
            </template>
          </el-table-column>
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
import { ref, computed, watch, watchEffect } from 'vue'
import { Refresh, FolderOpened } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ExportConfig, ParsedData, WordExportOptions } from '@stores/projectPage/docParser/docParser.types'
import { ExportCoordinator } from '@service/docParser/exportCoordinator'

interface LocalExportConfig {
  sheetName: string
  format: 'xlsx' | 'csv'
  outputPath: string
  includeHeaders: boolean
  freezeHeader: boolean
  includeSectionHeaders: boolean
  // 🆕 Word 导出配置
  wordExport?: {
    enabled: boolean
    filename?: string
    includeChapters?: boolean
    imageHandling?: 'keep' | 'reference' | 'remove'
  }
}

interface Props {
  config: ExportConfig
  parsedData?: ParsedData | ParsedData[] | null  // 🆕 添加 parsedData 用于预览计算
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
  includeSectionHeaders: false,
  wordExport: {
    enabled: false,
    filename: '',
    includeChapters: true,
    imageHandling: 'reference'
  }
})

// 🆕 预览数据：基于传入的 parsedData 计算 Word/Excel 的导出预览
const exportPreview = ref<
  {
    totalItems: number
    wordItems: number
    excelItems: number
    previewItems: Array<{
      id: string
      needsWordExport: boolean
      hasImages: boolean
      hasTables: boolean
      wordExportReason?: string[]
    }>
  } | null
>(null)

// 更新预览数据的简单封装（若 parsedData 更新时同步）
watchEffect(() => {
  const data = (props.parsedData as any) as ParsedData | ParsedData[] | null
  if (!data || (Array.isArray(data) && data.length === 0)) {
    exportPreview.value = null
    return
  }
  const stats = ExportCoordinator.getExportPreview(Array.isArray(data) ? data : [data], (props.config as any))
  exportPreview.value = stats as any
})

// 🆕 Word 导出相关响应式变量
const wordExportEnabled = computed({
  get: () => localConfig.value.wordExport?.enabled || false,
  set: (value: boolean) => {
    if (!localConfig.value.wordExport) {
      localConfig.value.wordExport = {
        enabled: value,
        filename: '',
        includeChapters: true,
        imageHandling: 'reference'
      }
    } else {
      localConfig.value.wordExport.enabled = value
    }
  }
})

const wordFilename = computed({
  get: () => localConfig.value.wordExport?.filename || '',
  set: (value: string) => {
    if (localConfig.value.wordExport) {
      localConfig.value.wordExport.filename = value
    }
  }
})

const wordIncludeChapters = computed({
  get: () => localConfig.value.wordExport?.includeChapters !== false,
  set: (value: boolean) => {
    if (localConfig.value.wordExport) {
      localConfig.value.wordExport.includeChapters = value
    }
  }
})

const wordImageHandling = computed({
  get: () => localConfig.value.wordExport?.imageHandling || 'reference',
  set: (value: 'keep' | 'reference' | 'remove') => {
    if (localConfig.value.wordExport) {
      localConfig.value.wordExport.imageHandling = value
    }
  }
})

// 合并普通列和章节标题，统一显示
const columns = computed(() => {
  const result: Array<{
    name: string
    field: string[]
    width: number
    order: number
    type: 'column' | 'section-header'
    mergeCols?: number
  }> = []
  
  // 添加普通列
  if (props.config.columns) {
    props.config.columns.forEach(col => {
      result.push({
        name: col.name,
        field: col.field,
        width: col.width,
        order: col.order,
        type: 'column'
      })
    })
  }
  
  // 添加章节标题
  if (props.config.sectionHeaders) {
    props.config.sectionHeaders.forEach(header => {
      result.push({
        name: '（章节标题）',
        field: header.field,
        width: 0,
        order: -1, // 让它排在最前面
        type: 'section-header',
        mergeCols: header.mergeCols
      })
    })
  }
  
  // 按 order 排序
  return result.sort((a, b) => a.order - b.order)
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

/* 🆕 Word 导出相关样式 */
.form-tip {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.word-export-stats {
  margin-top: 16px;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 6px;
  
  h5 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
  }
  
  h6 {
    margin: 16px 0 8px 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: var(--el-bg-color);
  border-radius: 4px;
  border: 1px solid var(--el-border-color-lighter);
  
  .stat-label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 4px;
  }
  
  .stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    
    &.highlight {
      color: var(--el-color-warning);
    }
  }
}

.preview-items {
  max-height: 120px;
  overflow-y: auto;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--el-bg-color);
  border-radius: 4px;
  font-size: 12px;
  
  .preview-reason {
    color: var(--el-text-color-secondary);
    flex: 1;
  }
}
</style>

