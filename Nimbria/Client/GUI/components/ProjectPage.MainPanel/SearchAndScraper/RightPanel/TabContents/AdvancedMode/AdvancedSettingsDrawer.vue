<template>
  <RightDrawer
    :visible="visible"
    title="高级设置"
    :width="600"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="settings-content">
      <!-- 卡片1: 浏览器环境 -->
      <div class="settings-section">
        <div class="section-header">
          <h4>浏览器环境</h4>
        </div>
        <div class="section-body">
          <el-form label-position="top">
            <el-form-item label="Chromium 路径">
              <el-input
                v-model="browserPath"
                placeholder="留空则自动检测 Edge/Chrome"
                clearable
              >
                <template #append>
                  <el-button 
                    :icon="FolderOpened" 
                    @click="handleBrowse"
                    title="浏览文件"
                  />
                </template>
              </el-input>
              <span class="form-hint">支持 Edge 或 Chrome（Chromium 内核）</span>
            </el-form-item>

            <el-form-item>
              <div class="action-buttons">
                <el-button 
                  @click="handleAutoDetect" 
                  :loading="detecting"
                >
                  自动检测
                </el-button>
              </div>
            </el-form-item>

            <!-- 检测结果展示 -->
            <transition name="slide-fade">
              <div v-if="detectedBrowsers.length > 0" class="browser-list-container">
                <el-divider />
                
                <div class="browser-list-title">检测到以下浏览器：</div>
                <el-radio-group v-model="selectedBrowserPath" class="detected-list">
                  <el-radio 
                    v-for="browser in detectedBrowsers" 
                    :key="browser.path"
                    :label="browser.path"
                    class="browser-radio"
                  >
                    <el-tag 
                      :type="browser.type === 'edge' ? 'primary' : 'success'"
                      size="small"
                    >
                      {{ browser.name }}
                    </el-tag>
                    <span class="browser-path">{{ browser.path }}</span>
                  </el-radio>
                </el-radio-group>
                <el-button 
                  size="small" 
                  type="primary" 
                  @click="handleUseSelected"
                  :disabled="!selectedBrowserPath"
                  class="use-selected-btn"
                >
                  使用选中的浏览器
                </el-button>
              </div>
            </transition>
          </el-form>
        </div>
      </div>
      
      <!-- 操作按钮 -->
      <div class="settings-actions">
        <el-button type="primary" @click="handleSave">保存配置</el-button>
        <el-button @click="handleReset">重置为自动检测</el-button>
      </div>
    </div>
  </RightDrawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FolderOpened } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import RightDrawer from '../../RightDrawer.vue'
import { useWorkflowStore } from '@stores/projectPage/workflow.store'

interface Props {
  visible: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
}>()

const workflowStore = useWorkflowStore()

const browserPath = ref(workflowStore.browserExecutablePath || '')
const detecting = ref(false)
const detectedBrowsers = ref<Array<{
  name: string
  type: 'edge' | 'chrome'
  path: string
}>>([])
const selectedBrowserPath = ref('')

// 浏览文件
const handleBrowse = async () => {
  try {
    // 使用Electron dialog选择文件
    // TODO: 需要添加dialog API到preload
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.info({ message: '文件选择功能开发中' })
  } catch (error) {
    console.error('[AdvancedSettings] File browse failed:', error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '打开文件选择器失败' })
  }
}

// 自动检测
const handleAutoDetect = async () => {
  detecting.value = true
  try {
    // @ts-expect-error - workflow API 扩展
    const result = await window.nimbria.workflow.detectBrowsers()
    
    if (result.success && result.browsers && result.browsers.length > 0) {
      detectedBrowsers.value = result.browsers
      selectedBrowserPath.value = result.browsers[0].path // 默认选中第一个
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.success({ message: `检测到 ${result.browsers.length} 个浏览器` })
    } else {
      detectedBrowsers.value = []
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.warning({ message: '未检测到 Edge 或 Chrome' })
    }
  } catch (error) {
    console.error('[AdvancedSettings] Auto detect failed:', error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '自动检测失败' })
  } finally {
    detecting.value = false
  }
}

// 使用选中的浏览器
const handleUseSelected = () => {
  if (selectedBrowserPath.value) {
    browserPath.value = selectedBrowserPath.value
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: '已填充选中的浏览器路径' })
  }
}

// 保存配置
const handleSave = () => {
  const pathToSave = browserPath.value.trim() || null
  workflowStore.setBrowserExecutablePath(pathToSave)
  
  if (pathToSave) {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: `配置已保存：${pathToSave}` })
  } else {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: '配置已保存（将自动检测）' })
  }
}

// 🔥 重置为自动检测
const handleReset = () => {
  browserPath.value = ''
  detectedBrowsers.value = []
  selectedBrowserPath.value = ''
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.info({ message: '已重置为自动检测' })
}
</script>

<style scoped lang="scss">
// 🔥 参照 SettingsContent.vue 的标准布局
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-height: 100%;
  min-width: 320px; // ← 保证最小宽度
}

// 🔥 设置区域（替换 el-card）
.settings-section {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

.section-header {
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color);
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
}

.section-body {
  padding: 16px;
  
  .el-form-item {
    margin-bottom: 20px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
}

// 🔥 表单提示文字
.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

// 🔥 操作按钮容器
.action-buttons {
  display: flex;
  gap: 12px;
}

// 🔥 浏览器列表容器（展开动画）
.browser-list-container {
  margin-top: 16px;
  
  .el-divider {
    margin: 16px 0;
  }
}

.browser-list-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--el-text-color-primary);
}

.detected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  margin-bottom: 12px;
}

.browser-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--el-fill-color-light);
  }
  
  .el-tag {
    flex-shrink: 0;
  }
}

.browser-path {
  font-size: 12px;
  color: var(--el-text-color-regular);
  font-family: 'Consolas', 'Monaco', monospace;
  word-break: break-all;
  flex: 1;
}

.use-selected-btn {
  width: 100%;
}

// 🔥 过渡动画（与 SettingsContent 一致）
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-5px);
  opacity: 0;
}

// 🔥 操作按钮区域（sticky固定底部）
.settings-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-fill-color-lighter);
  margin-top: auto;
  position: sticky;
  bottom: 0;
  z-index: 1;
}
</style>

