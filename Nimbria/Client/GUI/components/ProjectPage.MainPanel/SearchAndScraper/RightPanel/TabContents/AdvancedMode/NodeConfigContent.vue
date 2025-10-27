<template>
  <div class="node-config-content">
    <!-- 🔥 节点配置区域 -->
    <div class="config-section">
      <div class="section-title">
        <el-icon><Setting /></el-icon>
        <span>节点配置</span>
      </div>
      
      <el-form :model="formData" label-width="100px" size="default">
        <!-- 选择器配置 -->
        <el-form-item label="内容选择器">
          <el-input
            v-model="formData.selector"
            placeholder="CSS选择器"
            @change="handleConfigChange"
          >
            <template #append>
              <el-button 
                @click="handlePickElement"
                :type="isContentPickerActive ? 'primary' : ''"
              >
                <el-icon><Aim /></el-icon>
                {{ isContentPickerActive ? '选择中' : '选取' }}
              </el-button>
            </template>
          </el-input>
          <template #extra>
            <span class="form-tip">用于提取章节内容的CSS选择器</span>
          </template>
        </el-form-item>
        
        <!-- 🔥 章节标题选择器 -->
        <el-form-item label="标题选择器">
          <el-input
            v-model="formData.titleSelector"
            placeholder="CSS选择器（可选）"
            @change="handleConfigChange"
          >
            <template #append>
              <el-button 
                @click="handlePickTitleElement"
                :type="isTitlePickerActive ? 'primary' : ''"
              >
                <el-icon><Aim /></el-icon>
                {{ isTitlePickerActive ? '选择中' : '选取' }}
              </el-button>
            </template>
          </el-input>
          <template #extra>
            <span class="form-tip">用于从内容页提取章节标题（可选）</span>
          </template>
        </el-form-item>
        
        <!-- 🔥 爬取引擎选择 -->
        <el-form-item label="爬取引擎">
          <el-select v-model="formData.engine" @change="handleConfigChange">
            <el-option label="BrowserView（可视化）" value="browserview">
              <div style="display: flex; flex-direction: column;">
                <span>BrowserView（可视化）</span>
                <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                  使用当前浏览器，支持动态JS，速度中等
                </span>
              </div>
            </el-option>
            <el-option label="Cheerio（快速）" value="cheerio">
              <div style="display: flex; flex-direction: column;">
                <span>Cheerio（快速）</span>
                <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                  轻量级爬取，仅静态HTML，速度快
                </span>
              </div>
            </el-option>
            <el-option label="Puppeteer（强大）" value="puppeteer" disabled>
              <div style="display: flex; flex-direction: column;">
                <span>Puppeteer（强大）</span>
                <span style="font-size: 12px; color: var(--el-text-color-secondary);">
                  独立浏览器，功能最强，资源占用高（开发中）
                </span>
              </div>
            </el-option>
          </el-select>
          <template #extra>
            <span class="form-tip">
              选择爬取引擎：BrowserView适合动态页面，Cheerio适合静态页面
            </span>
          </template>
        </el-form-item>
        
        <!-- 提取策略 -->
        <el-form-item label="提取策略">
          <el-select v-model="formData.strategy" @change="handleConfigChange">
            <el-option label="直接提取" value="direct" />
            <el-option label="找文字最多的div" value="max-text" />
          </el-select>
          <template #extra>
            <span class="form-tip">
              直接提取：使用选择器直接获取内容<br>
              找文字最多的div：自动查找文本最多的容器
            </span>
          </template>
        </el-form-item>
        
        <!-- 🔥 权重调节滑动条（仅在max-text模式下显示） -->
        <el-form-item v-if="formData.strategy === 'max-text'" label="权重调节">
          <div class="weight-slider-container">
            <div class="weight-labels">
              <span class="label-density">密度优先</span>
              <span class="label-length">长度优先</span>
            </div>
            <el-slider
              v-model="formData.densityWeight"
              :min="0"
              :max="100"
              :show-tooltip="true"
              :format-tooltip="formatWeightTooltip"
              @change="handleConfigChange"
              class="weight-slider"
            />
            <div class="weight-info">
              <span class="info-text">
                密度权重: {{ formData.densityWeight }}% | 长度权重: {{ 100 - formData.densityWeight }}%
              </span>
            </div>
          </div>
          <template #extra>
            <span class="form-tip">
              调整密度与文本长度的权重比例。密度高=正文少广告，长度大=包含更多内容
            </span>
          </template>
        </el-form-item>
        
        <!-- 移除选择器 -->
        <el-form-item label="移除元素">
          <el-input
            v-model="formData.removeSelectors"
            type="textarea"
            :rows="2"
            placeholder="script, style, nav, header, footer"
            @change="handleConfigChange"
          />
          <template #extra>
            <span class="form-tip">要移除的元素选择器（逗号分隔）</span>
          </template>
        </el-form-item>
        
        <!-- 测试执行按钮 -->
        <el-form-item>
          <el-button type="primary" @click="handleTestExecute" :loading="isExecuting">
            <el-icon><VideoPlay /></el-icon>
            测试执行
          </el-button>
        </el-form-item>
      </el-form>
    </div>
    
    <!-- 🔥 执行结果区域 -->
    <div v-if="hasOutput" class="output-section">
      <div class="section-title">
        <el-icon><Document /></el-icon>
        <span>执行结果</span>
        <el-tag :type="outputData?.success ? 'success' : 'danger'" size="small">
          {{ outputData?.success ? '成功' : '失败' }}
        </el-tag>
      </div>
      
      <!-- 视图切换 -->
      <el-segmented v-model="viewMode" :options="viewOptions" block />
      
      <!-- 渲染视图 -->
      <div v-if="viewMode === 'render'" class="render-view">
        <template v-if="outputData?.success && outputData.output">
          <!-- 元数据卡片 -->
          <el-card shadow="never" class="metadata-card">
            <div class="meta-row">
              <span class="meta-label">引擎:</span>
              <el-tag :type="outputData.output.engine === 'browserview' ? 'primary' : 'success'" size="small">
                {{ outputData.output.engine || 'unknown' }}
              </el-tag>
            </div>
            <div class="meta-row" v-if="outputData.output.duration">
              <span class="meta-label">耗时:</span>
              <span class="meta-value">{{ outputData.output.duration }}ms</span>
            </div>
            <div class="meta-row" v-if="outputData.output.url">
              <span class="meta-label">URL:</span>
              <el-link :href="outputData.output.url" target="_blank" type="primary" class="meta-link">
                {{ outputData.output.url }}
              </el-link>
            </div>
          </el-card>
          
          <!-- 标题提取结果 -->
          <div v-if="outputData.output.title" class="extract-section">
            <div class="section-header">
              <el-icon><Document /></el-icon>
              <span class="section-label">标题</span>
              <el-tag size="small" type="info">{{ outputData.output.title.length }} 字</el-tag>
            </div>
            <div class="selector-info">
              <el-icon><Search /></el-icon>
              <code>{{ outputData.output.title.selector }}</code>
            </div>
            <div class="extract-content">
              {{ outputData.output.title.text }}
            </div>
          </div>
          
          <!-- 内容提取结果 -->
          <div v-if="outputData.output.content" class="extract-section">
            <div class="section-header">
              <el-icon><Document /></el-icon>
              <span class="section-label">内容</span>
              <el-tag size="small" type="info">{{ outputData.output.content.length }} 字</el-tag>
            </div>
            <div class="selector-info">
              <el-icon><Search /></el-icon>
              <code>{{ outputData.output.content.selector }}</code>
            </div>
            <div class="extract-content">
              {{ outputData.output.content.text }}
            </div>
          </div>
        </template>
        
        <!-- 错误信息 -->
        <el-alert
          v-else-if="outputData?.error"
          type="error"
          :title="outputData.error"
          :closable="false"
        />
      </div>
      
      <!-- JSON视图 -->
      <div v-else-if="viewMode === 'json'" class="json-view">
        <pre>{{ JSON.stringify(outputData, null, 2) }}</pre>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-output">
      <el-empty description="暂无执行结果">
        <template #extra>
          <el-button type="primary" @click="handleTestExecute">
            <el-icon><VideoPlay /></el-icon>
            测试执行
          </el-button>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Aim, VideoPlay, Document, Search } from '@element-plus/icons-vue'
import type { WorkflowNode, NodeExecutionResult, ScraperEngine } from './types'

interface Props {
  node: WorkflowNode | null
  output: NodeExecutionResult | null
  tabId: string
}

interface Emits {
  (e: 'update-node', data: Partial<WorkflowNode['data']>): void
  (e: 'execute-node'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ==================== 表单数据 ====================

const formData = ref({
  selector: '',
  titleSelector: '',
  engine: 'browserview' as ScraperEngine, // 🔥 默认使用BrowserView
  strategy: 'direct' as 'direct' | 'max-text',
  removeSelectors: 'script, style, nav, header, footer',
  densityWeight: 70  // 🔥 默认70%密度权重，30%长度权重
})

// 🔥 元素选取监听器引用（用于清理）
interface ElementSelectedData {
  tabId: string
  element: { selector: string; [key: string]: unknown }
}
let contentPickerHandler: ((data: ElementSelectedData) => void) | null = null
let titlePickerHandler: ((data: ElementSelectedData) => void) | null = null

// 🔥 选取器激活状态
const isContentPickerActive = ref(false)
const isTitlePickerActive = ref(false)

// 🔥 监听Esc键取消事件
const pickerCancelledListener = (data: { tabId: string; reason: string }) => {
  console.log('[NodeConfigContent] 📥 Picker cancelled event received:', data, 'current tabId:', props.tabId)
  console.log('[NodeConfigContent] 🔍 Current active states:', {
    isContentPickerActive: isContentPickerActive.value,
    isTitlePickerActive: isTitlePickerActive.value
  })
  
  if (data.tabId !== props.tabId) {
    console.log('[NodeConfigContent] ⏭️ Tab mismatch, ignoring. Expected:', props.tabId, 'Got:', data.tabId)
    return
  }
  
  console.log('[NodeConfigContent] ✅ Clearing picker state...')
  
  // 清理状态
  contentPickerHandler = null
  titlePickerHandler = null
  isContentPickerActive.value = false
  isTitlePickerActive.value = false
  
  console.log('[NodeConfigContent] ✨ Picker state cleared successfully:', {
    isContentPickerActive: isContentPickerActive.value,
    isTitlePickerActive: isTitlePickerActive.value
  })
}

// 需要在组件加载时手动监听，因为onPickerCancelled是常驻监听器
console.log('[NodeConfigContent] 🔧 Registering picker cancelled listener')
window.nimbria.searchScraper.onPickerCancelled(pickerCancelledListener)
console.log('[NodeConfigContent] ✅ Picker cancelled listener registered')

// 组件卸载时清理
onUnmounted(() => {
  if (contentPickerHandler) {
    // 注意：目前的API不支持移除监听器，这里只是标记
    contentPickerHandler = null
  }
  if (titlePickerHandler) {
    titlePickerHandler = null
  }
  
  // 清理激活状态
  isContentPickerActive.value = false
  isTitlePickerActive.value = false
})

// 监听节点变化，更新表单
watch(() => props.node, (newNode) => {
  if (newNode && newNode.data) {
    formData.value = {
      selector: newNode.data.selector || '',
      titleSelector: '', // 章节标题选择器存在workflow实例中
      engine: newNode.data.config?.engine || 'browserview', // 🔥 读取引擎配置
      strategy: newNode.data.config?.strategy || 'direct',
      removeSelectors: newNode.data.config?.removeSelectors || 'script, style, nav, header, footer',
      densityWeight: newNode.data.config?.densityWeight ?? 70 // 🔥 读取权重配置，默认70
    }
  }
}, { immediate: true })

// ==================== 执行状态 ====================

const isExecuting = ref(false)

const hasOutput = computed(() => {
  return props.output !== null
})

const outputData = computed(() => {
  return props.output
})

// ==================== 视图模式 ====================

const viewMode = ref<'render' | 'json'>('render')

const viewOptions = [
  { label: '渲染视图', value: 'render' },
  { label: 'JSON视图', value: 'json' }
]

// ==================== 事件处理 ====================

/**
 * 配置变更
 */
const handleConfigChange = () => {
  emit('update-node', {
    selector: formData.value.selector,
    config: {
      engine: formData.value.engine, // 🔥 保存引擎选择
      strategy: formData.value.strategy,
      removeSelectors: formData.value.removeSelectors,
      densityWeight: formData.value.densityWeight // 🔥 保存权重配置
    }
  })
}

/**
 * 格式化权重提示
 */
const formatWeightTooltip = (value: number) => {
  return `密度${value}% : 长度${100 - value}%`
}

/**
 * 选取元素（内容）
 */
const handlePickElement = async () => {
  try {
    // 🔥 双态切换：如果已激活，则停止
    if (isContentPickerActive.value) {
      await window.nimbria.searchScraper.stopElementPicker(props.tabId)
      contentPickerHandler = null
      isContentPickerActive.value = false
      
      // @ts-expect-error - ElMessage类型定义过于严格
      ElMessage({
        type: 'info' as const,
        message: '已退出选取模式'
      })
      return
    }
    
    // 🔥 启动选取模式
    // 如果已有监听器，先清理
    if (contentPickerHandler) {
      contentPickerHandler = null
    }
    
    // 🔥 创建新的监听器（使用变量存储，避免重复注册）
    contentPickerHandler = (data: ElementSelectedData) => {
      if (data.tabId !== props.tabId) return
      
      // 🔥 只处理一次，然后立即清理
      if (!contentPickerHandler) return
      
      const selector = data.element.selector
      formData.value.selector = selector
      handleConfigChange()
      
      // @ts-expect-error - ElMessage类型定义过于严格
      ElMessage({
        type: 'success' as const,
        message: `已选择: ${selector}`
      })
      
      // 停止选取模式并清理监听器
      void window.nimbria.searchScraper.stopElementPicker(props.tabId)
      contentPickerHandler = null
      isContentPickerActive.value = false
    }
    
    // 注册监听器
    window.nimbria.searchScraper.onElementSelected(contentPickerHandler)
    
    // 启动元素选取模式
    await window.nimbria.searchScraper.startElementPicker(props.tabId)
    isContentPickerActive.value = true
    
    // @ts-expect-error - ElMessage类型定义过于严格
    ElMessage({
      type: 'info' as const,
      message: '请点击要选取的元素，或按 Esc / 再次点击按钮 退出'
    })
  } catch (error) {
    console.error('[NodeConfig] Failed to pick element:', error)
    isContentPickerActive.value = false
    // @ts-expect-error - ElMessage类型定义过于严格
    ElMessage({
      type: 'error' as const,
      message: '选取元素失败'
    })
    contentPickerHandler = null
  }
}

/**
 * 选取元素（标题）
 */
const handlePickTitleElement = async () => {
  try {
    // 🔥 双态切换：如果已激活，则停止
    if (isTitlePickerActive.value) {
      await window.nimbria.searchScraper.stopElementPicker(props.tabId)
      titlePickerHandler = null
      isTitlePickerActive.value = false
      
      // @ts-expect-error - ElMessage类型定义过于严格
      ElMessage({
        type: 'info' as const,
        message: '已退出选取模式'
      })
      return
    }
    
    // 🔥 启动选取模式
    // 如果已有监听器，先清理
    if (titlePickerHandler) {
      titlePickerHandler = null
    }
    
    // 🔥 创建新的监听器
    titlePickerHandler = (data: ElementSelectedData) => {
      if (data.tabId !== props.tabId) return
      
      // 🔥 只处理一次，然后立即清理
      if (!titlePickerHandler) return
      
      const selector = data.element.selector
      formData.value.titleSelector = selector
      // 章节标题选择器存在workflow实例中，不在节点data里
      // TODO: 保存到workflow实例
      
      // @ts-expect-error - ElMessage类型定义过于严格
      ElMessage({
        type: 'success' as const,
        message: `已选择标题选择器: ${selector}`
      })
      
      // 停止选取模式并清理监听器
      void window.nimbria.searchScraper.stopElementPicker(props.tabId)
      titlePickerHandler = null
      isTitlePickerActive.value = false
    }
    
    // 注册监听器
    window.nimbria.searchScraper.onElementSelected(titlePickerHandler)
    
    // 启动元素选取模式
    await window.nimbria.searchScraper.startElementPicker(props.tabId)
    isTitlePickerActive.value = true
    
    // @ts-expect-error - ElMessage类型定义过于严格
    ElMessage({
      type: 'info' as const,
      message: '请点击要选取的标题元素，或按 Esc / 再次点击按钮 退出'
    })
  } catch (error) {
    console.error('[NodeConfig] Failed to pick title element:', error)
    isTitlePickerActive.value = false
    // @ts-expect-error - ElMessage类型定义过于严格
    ElMessage({
      type: 'error' as const,
      message: '选取标题元素失败'
    })
    titlePickerHandler = null
  }
}

/**
 * 测试执行
 */
const handleTestExecute = () => {
  emit('execute-node')
}
</script>

<style scoped lang="scss">
.node-config-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

// ==================== 通用section样式 ====================

.config-section,
.output-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color);
}

.form-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

// ==================== 执行结果样式 ====================

.render-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

// 元数据卡片
.metadata-card {
  background: var(--el-bg-color);
  
  :deep(.el-card__body) {
    padding: 12px;
  }
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

.meta-label {
  font-weight: 500;
  color: var(--el-text-color-secondary);
  min-width: 50px;
}

.meta-value {
  color: var(--el-text-color-primary);
}

.meta-link {
  font-size: 12px;
  word-break: break-all;
}

// 提取结果区块
.extract-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--el-bg-color);
  border-radius: 4px;
  border-left: 3px solid var(--el-color-primary);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.section-label {
  flex: 1;
}

.selector-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--el-fill-color-light);
  border-radius: 3px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  
  code {
    font-family: 'Consolas', 'Monaco', monospace;
    color: var(--el-color-primary);
    background: var(--el-fill-color-darker);
    padding: 2px 6px;
    border-radius: 2px;
  }
}

.extract-content {
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color);
    border-radius: 3px;
  }
}

// ==================== JSON视图样式 ====================

.json-view {
  background: var(--el-fill-color-light);
  border-radius: 4px;
  padding: 12px;
  
  pre {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-primary);
    overflow-x: auto;
  }
}

// ==================== 权重滑动条样式 ====================

.weight-slider-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.weight-labels {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.label-density {
  color: #409eff; // 蓝色
}

.label-length {
  color: #e6a23c; // 黄色
}

.weight-slider {
  width: 100%;
  
  // 🔥 自定义滑动条颜色：左蓝右黄渐变
  :deep(.el-slider__runway) {
    background: linear-gradient(to right, #409eff 0%, #e6a23c 100%);
    height: 8px;
  }
  
  :deep(.el-slider__bar) {
    background: transparent; // 已经有渐变了，bar透明
  }
  
  :deep(.el-slider__button) {
    width: 18px;
    height: 18px;
    border: 3px solid #409eff;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
  
  :deep(.el-slider__button-wrapper:hover .el-slider__button) {
    transform: scale(1.2);
  }
}

.weight-info {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.info-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

// ==================== 空状态样式 ====================

.empty-output {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>

