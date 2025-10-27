<template>
  <RightDrawer
    :visible="visible"
    title="高级设置"
    :width="600"
    @update:visible="$emit('update:visible', $event)"
  >
    <div class="settings-container">
      <!-- 卡片1: 浏览器环境 -->
      <el-card header="浏览器环境" shadow="never">
        <el-form label-width="140px">
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
            <template #help>
              <span class="form-help">支持 Edge 或 Chrome（Chromium 内核）</span>
            </template>
          </el-form-item>

          <el-form-item>
            <el-button 
              @click="handleAutoDetect" 
              :loading="detecting"
            >
              自动检测
            </el-button>
            <el-button 
              type="primary" 
              @click="handleSave"
            >
              保存配置
            </el-button>
          </el-form-item>

          <!-- 检测结果展示 -->
          <el-alert
            v-if="detectedBrowsers.length > 0"
            type="info"
            :closable="false"
            class="browser-list-alert"
          >
            <template #title>
              <div class="browser-list">
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
            </template>
          </el-alert>
        </el-form>
      </el-card>
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
    ElMessage.info('文件选择功能开发中')
  } catch (error) {
    console.error('[AdvancedSettings] File browse failed:', error)
    ElMessage.error('打开文件选择器失败')
  }
}

// 自动检测
const handleAutoDetect = async () => {
  detecting.value = true
  try {
    const result = await window.nimbria.workflow.detectBrowsers()
    
    if (result.success && result.browsers && result.browsers.length > 0) {
      detectedBrowsers.value = result.browsers
      selectedBrowserPath.value = result.browsers[0].path // 默认选中第一个
      ElMessage.success(`检测到 ${result.browsers.length} 个浏览器`)
    } else {
      detectedBrowsers.value = []
      ElMessage.warning('未检测到 Edge 或 Chrome')
    }
  } catch (error) {
    console.error('[AdvancedSettings] Auto detect failed:', error)
    ElMessage.error('自动检测失败')
  } finally {
    detecting.value = false
  }
}

// 使用选中的浏览器
const handleUseSelected = () => {
  if (selectedBrowserPath.value) {
    browserPath.value = selectedBrowserPath.value
    ElMessage.success('已填充选中的浏览器路径')
  }
}

// 保存配置
const handleSave = () => {
  const pathToSave = browserPath.value.trim() || null
  workflowStore.setBrowserExecutablePath(pathToSave)
  
  if (pathToSave) {
    ElMessage.success(`配置已保存：${pathToSave}`)
  } else {
    ElMessage.success('配置已保存（将自动检测）')
  }
}
</script>

<style scoped lang="scss">
.settings-container {
  padding: 20px;
}

.form-help {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.browser-list-alert {
  margin-top: 16px;
}

.browser-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.browser-list-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.detected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
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
}

.browser-path {
  font-size: 12px;
  color: var(--el-text-color-regular);
  font-family: 'Consolas', 'Monaco', monospace;
  word-break: break-all;
  flex: 1;
}

.use-selected-btn {
  align-self: flex-start;
}
</style>

