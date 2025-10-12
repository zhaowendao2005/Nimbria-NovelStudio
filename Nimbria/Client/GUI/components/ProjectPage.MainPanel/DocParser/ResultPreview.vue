<template>
  <div class="result-preview">
    <div class="preview-header">
      <h3>解析结果</h3>
      <div class="header-actions">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="tree">树形视图</el-radio-button>
          <el-radio-button value="json">JSON视图</el-radio-button>
          <el-radio-button value="split">分栏视图</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <div class="preview-body" :class="`mode-${viewMode}`">
      <!-- 树形视图 -->
      <div v-if="viewMode === 'tree' || viewMode === 'split'" class="tree-view">
        <div class="view-header">
          <span>结构化视图</span>
          <el-button size="small" text :icon="Refresh" @click="refreshTree">
            刷新
          </el-button>
        </div>
        <div class="tree-container">
          <el-tree
            v-if="treeData.length > 0"
            :data="treeData"
            :props="treeProps"
            default-expand-all
            :expand-on-click-node="false"
            node-key="id"
            class="result-tree"
          >
            <template #default="{ node, data }">
              <div class="tree-node">
                <span class="node-label">{{ data.label }}</span>
                <span v-if="data.value !== undefined" class="node-value">
                  {{ formatValue(data.value) }}
                </span>
                <el-tag v-if="data.type" size="small" class="node-type">
                  {{ data.type }}
                </el-tag>
              </div>
            </template>
          </el-tree>
          <el-empty v-else description="暂无数据" />
        </div>
      </div>
      
      <!-- JSON视图 -->
      <div v-if="viewMode === 'json' || viewMode === 'split'" class="json-view">
        <div class="view-header">
          <span>JSON视图</span>
          <div class="header-btns">
            <el-button size="small" text :icon="CopyDocument" @click="copyJson">
              复制
            </el-button>
            <el-button size="small" text :icon="Download" @click="downloadJson">
              下载
            </el-button>
          </div>
        </div>
        <div class="json-container">
          <pre class="json-content">{{ formattedJson }}</pre>
        </div>
      </div>
    </div>
    
    <div class="preview-footer">
      <div class="stats">
        <el-statistic title="数据项数" :value="itemCount" />
        <el-statistic title="字段数" :value="fieldCount" />
        <el-statistic title="数据大小" :value="dataSize" suffix="B" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Refresh, CopyDocument, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ParsedData } from '@stores/projectPage/docParser/docParser.types'

interface TreeNode {
  id: string
  label: string
  value?: any
  type?: string
  children?: TreeNode[]
}

interface Props {
  data: ParsedData | null
}

const props = defineProps<Props>()

const viewMode = ref<'tree' | 'json' | 'split'>('split')
const treeData = ref<TreeNode[]>([])

const treeProps = {
  children: 'children',
  label: 'label'
}

// 将数据转换为树形结构
const buildTreeData = (obj: any, parentPath: string = ''): TreeNode[] => {
  if (!obj || typeof obj !== 'object') {
    return []
  }
  
  return Object.entries(obj).map(([key, value], index) => {
    const id = parentPath ? `${parentPath}.${key}` : key
    const node: TreeNode = {
      id,
      label: key,
      type: Array.isArray(value) ? 'array' : typeof value
    }
    
    if (Array.isArray(value)) {
      node.children = value.map((item, idx) => ({
        id: `${id}[${idx}]`,
        label: `[${idx}]`,
        type: typeof item,
        children: typeof item === 'object' ? buildTreeData(item, `${id}[${idx}]`) : undefined,
        value: typeof item !== 'object' ? item : undefined
      }))
    } else if (typeof value === 'object' && value !== null) {
      node.children = buildTreeData(value, id)
    } else {
      node.value = value
    }
    
    return node
  })
}

// 格式化JSON
const formattedJson = computed(() => {
  if (!props.data) return ''
  try {
    return JSON.stringify(props.data, null, 2)
  } catch {
    return '无法格式化数据'
  }
})

// 统计信息
const itemCount = computed(() => {
  const countItems = (obj: any): number => {
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + countItems(item), 0)
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).reduce((sum, val) => sum + countItems(val), 0)
    }
    return 1
  }
  return props.data ? countItems(props.data) : 0
})

const fieldCount = computed(() => {
  const countFields = (obj: any): number => {
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + countFields(item), 0)
    } else if (typeof obj === 'object' && obj !== null) {
      return Object.keys(obj).length + Object.values(obj).reduce((sum, val) => sum + countFields(val), 0)
    }
    return 0
  }
  return props.data ? countFields(props.data) : 0
})

const dataSize = computed(() => {
  if (!props.data) return 0
  return new Blob([formattedJson.value]).size
})

// 监听数据变化
watch(() => props.data, (newData) => {
  if (newData) {
    treeData.value = buildTreeData(newData)
  } else {
    treeData.value = []
  }
}, { immediate: true, deep: true })

const refreshTree = () => {
  if (props.data) {
    treeData.value = buildTreeData(props.data)
    ElMessage.success('已刷新')
  }
}

const formatValue = (value: any): string => {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return `"${value}"`
  return String(value)
}

const copyJson = async () => {
  try {
    await navigator.clipboard.writeText(formattedJson.value)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const downloadJson = () => {
  const blob = new Blob([formattedJson.value], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `parsed-result-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('下载成功')
}
</script>

<style scoped lang="scss">
.result-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color);
}

.preview-header {
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

.preview-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  
  &.mode-tree,
  &.mode-json {
    .tree-view,
    .json-view {
      flex: 1;
    }
  }
  
  &.mode-split {
    .tree-view,
    .json-view {
      flex: 1;
      border-right: 1px solid var(--el-border-color);
      
      &:last-child {
        border-right: none;
      }
    }
  }
}

.tree-view,
.json-view {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color);
  font-size: 14px;
  font-weight: 500;
}

.header-btns {
  display: flex;
  gap: 8px;
}

.tree-container,
.json-container {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.result-tree {
  background: transparent;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  
  .node-label {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  .node-value {
    color: var(--el-text-color-regular);
    font-family: 'Consolas', 'Monaco', monospace;
  }
  
  .node-type {
    margin-left: auto;
  }
}

.json-content {
  margin: 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  padding: 12px;
  border-radius: 4px;
}

.preview-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color-page);
}

.stats {
  display: flex;
  gap: 40px;
}
</style>

