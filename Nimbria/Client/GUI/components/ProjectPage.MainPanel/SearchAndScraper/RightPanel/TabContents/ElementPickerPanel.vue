<template>
  <div class="element-picker-panel">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button
        :type="isSelecting ? 'danger' : 'primary'"
        :icon="Pointer"
        size="small"
        @click="togglePicker"
      >
        {{ isSelecting ? '停止选取' : '选取Div元素' }}
      </el-button>
      
      <el-button
        v-if="selectedElements.length > 0"
        :icon="Delete"
        size="small"
        @click="clearAll"
      >
        清空
      </el-button>
    </div>
    
    <!-- 选取状态提示 -->
    <div v-if="isSelecting" class="picking-hint">
      <el-alert
        type="info"
        :closable="false"
        show-icon
      >
        <template #title>
          <span>在左侧浏览器中悬停并点击要选取的元素</span>
        </template>
      </el-alert>
    </div>
    
    <!-- 已选元素列表 -->
    <div class="elements-list">
      <div v-if="selectedElements.length === 0" class="empty-state">
        <el-empty description="暂无选取的元素" :image-size="80" />
      </div>
      
      <div v-else class="element-cards">
        <div
          v-for="(element, index) in selectedElements"
          :key="index"
          class="element-card"
        >
          <div class="card-header">
            <el-tag size="small" type="primary">{{ element.tagName }}</el-tag>
            <el-button
              :icon="Delete"
              size="small"
              text
              @click="removeElement(index)"
            />
          </div>
          
          <div class="card-body">
            <!-- 选择器 -->
            <div class="info-row">
              <span class="label">选择器:</span>
              <el-input
                :model-value="element.selector"
                size="small"
                readonly
                class="selector-input"
              >
                <template #append>
                  <el-button :icon="CopyDocument" @click="copySelector(element.selector)" />
                </template>
              </el-input>
            </div>
            
            <!-- ID -->
            <div v-if="element.id" class="info-row">
              <span class="label">ID:</span>
              <code class="value">{{ element.id }}</code>
            </div>
            
            <!-- Class -->
            <div v-if="element.classList && element.classList.length > 0" class="info-row">
              <span class="label">Class:</span>
              <div class="class-list">
                <el-tag
                  v-for="(cls, idx) in element.classList"
                  :key="idx"
                  size="small"
                  class="class-tag"
                >
                  {{ cls }}
                </el-tag>
              </div>
            </div>
            
            <!-- 文本内容 -->
            <div v-if="element.textContent" class="info-row">
              <span class="label">文本:</span>
              <div class="text-content">{{ element.textContent }}</div>
            </div>
            
            <!-- XPath -->
            <div v-if="element.xpath" class="info-row">
              <span class="label">XPath:</span>
              <code class="value xpath">{{ element.xpath }}</code>
            </div>
            
            <!-- 时间 -->
            <div class="info-row timestamp">
              <span class="label">时间:</span>
              <span class="value">{{ formatTime(element.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Pointer, Delete, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import { SearchAndScraperService } from '@service/SearchAndScraper'
import type { SelectedElement } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'

/**
 * ElementPickerPanel 组件
 * 用于选取页面中的DOM元素
 */

interface Props {
  tabId: string
}

const props = defineProps<Props>()

const store = useSearchAndScraperStore()

// 计算属性
const instance = computed(() => store.getInstance(props.tabId))
const isSelecting = computed(() => instance.value?.isSelectingElement ?? false)
const selectedElements = computed(() => instance.value?.selectedElements ?? [])

/**
 * 切换选取状态
 */
const togglePicker = async (): Promise<void> => {
  try {
    if (isSelecting.value) {
      // 停止选取
      await SearchAndScraperService.stopElementPicker(props.tabId)
      store.updateInstance(props.tabId, { isSelectingElement: false })
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.success({ message: '已停止元素选取' })
    } else {
      // 开始选取
      await SearchAndScraperService.startElementPicker(props.tabId)
      store.updateInstance(props.tabId, { isSelectingElement: true })
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.info({ message: '请在左侧浏览器中选取元素' })
    }
  } catch (error) {
    console.error('[ElementPicker] Toggle picker failed:', error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '操作失败' })
  }
}

/**
 * 清空所有选取的元素
 */
const clearAll = (): void => {
  store.updateInstance(props.tabId, { selectedElements: [] })
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.success({ message: '已清空所有选取' })
}

/**
 * 移除单个元素
 */
const removeElement = (index: number): void => {
  const elements = [...selectedElements.value]
  elements.splice(index, 1)
  store.updateInstance(props.tabId, { selectedElements: elements })
}

/**
 * 复制选择器
 */
const copySelector = async (selector: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(selector)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: '已复制到剪贴板' })
  } catch (error) {
    console.error('[ElementPicker] Copy failed:', error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '复制失败' })
  }
}

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听元素选取事件
SearchAndScraperService.onElementSelected((data) => {
  if (data.tabId === props.tabId) {
    const elements = [...selectedElements.value, data.element]
    store.updateInstance(props.tabId, { selectedElements: elements })
    console.log('[ElementPicker] Element selected:', data.element)
  }
})
</script>

<style scoped lang="scss">
.element-picker-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--el-bg-color-page);
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.picking-hint {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.elements-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.element-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.element-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 12px;
  transition: all 0.2s;
  
  &:hover {
    border-color: var(--el-color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  
  &.timestamp {
    color: var(--el-text-color-secondary);
    font-size: 11px;
  }
}

.label {
  flex-shrink: 0;
  font-weight: 500;
  color: var(--el-text-color-regular);
  min-width: 50px;
}

.value {
  flex: 1;
  color: var(--el-text-color-primary);
  word-break: break-all;
  
  &.xpath {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
}

.selector-input {
  flex: 1;
  
  :deep(.el-input__inner) {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
  }
}

.class-list {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.class-tag {
  font-family: 'Consolas', 'Monaco', monospace;
}

.text-content {
  flex: 1;
  padding: 4px 8px;
  background: var(--el-fill-color-light);
  border-radius: 2px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  max-height: 60px;
  overflow-y: auto;
  word-break: break-word;
}
</style>

