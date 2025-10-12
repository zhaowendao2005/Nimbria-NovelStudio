<template>
  <div class="file-selector">
    <div v-if="!hideHeader" class="selector-header">
      <h3>{{ title }}</h3>
      <el-button 
        v-if="allowBrowse"
        :icon="FolderOpened" 
        size="small"
        @click="handleBrowse"
      >
        浏览
      </el-button>
    </div>
    
    <div class="selector-body">
      <el-input
        v-model="filePath"
        :placeholder="placeholder"
        :readonly="readonly"
        @change="handlePathChange"
      >
        <template #prepend>
          <el-icon><Document /></el-icon>
        </template>
        <template v-if="allowBrowse" #append>
          <el-button :icon="FolderOpened" @click="handleBrowse">
            浏览
          </el-button>
        </template>
      </el-input>
      
      <div v-if="fileInfo" class="file-info">
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="文件名">
            {{ fileInfo.name }}
          </el-descriptions-item>
          <el-descriptions-item label="大小">
            {{ formatSize(fileInfo.size) }}
          </el-descriptions-item>
          <el-descriptions-item label="修改时间" :span="2">
            {{ formatDate(fileInfo.mtime) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div v-if="showPreview && previewContent" class="file-preview">
        <div class="preview-header">
          <span>内容预览</span>
          <el-button size="small" text @click="showFullPreview = !showFullPreview">
            {{ showFullPreview ? '收起' : '展开' }}
          </el-button>
        </div>
        <div class="preview-content" :class="{ expanded: showFullPreview }">
          <pre>{{ previewContent }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Document, FolderOpened } from '@element-plus/icons-vue'

interface FileInfo {
  name: string
  size: number
  mtime: Date
}

interface Props {
  title?: string
  placeholder?: string
  modelValue?: string
  readonly?: boolean
  allowBrowse?: boolean
  showPreview?: boolean
  hideHeader?: boolean
  fileInfo?: FileInfo | null
  previewContent?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '选择文件',
  placeholder: '请输入或选择文件路径',
  readonly: false,
  allowBrowse: true,
  showPreview: false,
  hideHeader: false,
  fileInfo: null,
  previewContent: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'browse': []
  'change': [path: string]
}>()

const filePath = computed({
  get: () => props.modelValue || '',
  set: (value: string) => emit('update:modelValue', value)
})

const showFullPreview = ref(false)

const handleBrowse = () => {
  emit('browse')
}

const handlePathChange = () => {
  emit('change', filePath.value)
}

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const formatDate = (date: Date): string => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}
</script>

<style scoped lang="scss">
.file-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
}

.selector-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 12px;
}

.file-info {
  margin-top: 8px;
}

.file-preview {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
  font-size: 14px;
  font-weight: 500;
}

.preview-content {
  max-height: 200px;
  overflow: auto;
  padding: 12px;
  background: var(--el-fill-color-light);
  
  &.expanded {
    max-height: 500px;
  }
  
  pre {
    margin: 0;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}
</style>

