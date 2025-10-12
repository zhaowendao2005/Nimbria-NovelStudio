<template>
  <div class="docparser-topbar">
    <div class="topbar-left">
      <el-button 
        type="primary" 
        :icon="DocumentAdd"
        @click="emit('create-schema')"
      >
        新建Schema
      </el-button>
      <el-button 
        :icon="FolderOpened"
        @click="emit('load-schema')"
      >
        加载Schema
      </el-button>
      <el-button 
        :icon="Document"
        :disabled="!canSelectDoc"
        @click="emit('select-document')"
      >
        选择文档
      </el-button>
    </div>
    
    <div class="topbar-center">
      <el-steps :active="currentStep" finish-status="success" simple>
        <el-step title="定义Schema" />
        <el-step title="选择文档" />
        <el-step title="解析数据" />
        <el-step title="导出结果" />
      </el-steps>
    </div>
    
    <div class="topbar-right">
      <el-button 
        type="success"
        :icon="CircleCheck"
        :disabled="!canParse"
        :loading="parsing"
        @click="emit('parse')"
      >
        开始解析
      </el-button>
      <el-button 
        type="warning"
        :icon="Download"
        :disabled="!canExport"
        :loading="exporting"
        @click="emit('export')"
      >
        导出Excel
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DocumentAdd, FolderOpened, Document, CircleCheck, Download } from '@element-plus/icons-vue'

interface Props {
  hasSchema: boolean
  hasDocument: boolean
  hasParsedData: boolean
  parsing?: boolean
  exporting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  parsing: false,
  exporting: false
})

const emit = defineEmits<{
  'create-schema': []
  'load-schema': []
  'select-document': []
  'parse': []
  'export': []
}>()

const currentStep = computed(() => {
  if (props.hasParsedData) return 3
  if (props.hasDocument) return 2
  if (props.hasSchema) return 1
  return 0
})

const canSelectDoc = computed(() => props.hasSchema)
const canParse = computed(() => props.hasSchema && props.hasDocument)
const canExport = computed(() => props.hasParsedData)
</script>

<style scoped lang="scss">
.docparser-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  gap: 20px;
}

.topbar-left,
.topbar-right {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.topbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 400px;
  max-width: 600px;
}

.el-steps {
  width: 100%;
}
</style>

