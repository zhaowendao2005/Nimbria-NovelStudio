<template>
  <q-dialog 
    v-model="dialogVisible" 
    persistent
    :maximized="isMobile"
    :full-width="!isMobile"
    :full-height="!isMobile"
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card class="project-validation-dialog" :style="dialogStyle">
      <!-- 标题栏 -->
      <q-bar class="project-validation-dialog__titlebar">
        <q-icon :name="titleIcon" :color="titleIconColor" class="q-mr-sm" />
        <div class="project-validation-dialog__title">{{ dialogTitle }}</div>
        <q-space />
        <q-btn 
          flat 
          dense 
          round 
          icon="close" 
          @click="closeDialog"
          :disable="isProcessing"
        />
      </q-bar>

      <!-- 主内容区 -->
      <q-card-section class="project-validation-dialog__content">
        <!-- 加载状态 -->
        <div v-if="isValidating" class="validation-loading">
          <q-spinner color="primary" size="48px" />
          <div class="text-h6 q-mt-md">正在验证项目...</div>
          <div class="text-body2 text-grey-6">{{ validationPath }}</div>
        </div>

        <!-- 验证结果 -->
        <div v-else-if="validationResult" class="validation-result">
          <!-- 项目状态概览 -->
          <div class="result-overview">
            <q-card flat bordered class="overview-card">
              <q-card-section class="row items-center">
                <q-icon 
                  :name="statusIcon" 
                  :color="statusColor" 
                  size="32px" 
                  class="q-mr-md"
                />
                <div class="flex-grow">
                  <div class="text-h6">{{ statusTitle }}</div>
                  <div class="text-body2 text-grey-7">{{ statusDescription }}</div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 项目信息 -->
          <div v-if="validationResult.isProject && validationResult.config" class="project-info">
            <div class="section-title">项目信息</div>
            <q-card flat bordered>
              <q-card-section>
                <div class="info-grid">
                  <div class="info-item">
                    <q-icon name="drive_file_rename_outline" color="primary" size="sm" />
                    <span class="info-label">项目名称：</span>
                    <span class="info-value">{{ validationResult.config.projectName }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="auto_stories" color="primary" size="sm" />
                    <span class="info-label">小说标题：</span>
                    <span class="info-value">{{ validationResult.config.novel.title }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="person" color="primary" size="sm" />
                    <span class="info-label">作者：</span>
                    <span class="info-value">{{ validationResult.config.novel.author }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="category" color="primary" size="sm" />
                    <span class="info-label">类型：</span>
                    <span class="info-value">{{ validationResult.config.novel.genre.join('、') }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="schedule" color="primary" size="sm" />
                    <span class="info-label">创建时间：</span>
                    <span class="info-value">{{ formatDate(validationResult.config.createdAt) }}</span>
                  </div>
                  <div class="info-item">
                    <q-icon name="update" color="primary" size="sm" />
                    <span class="info-label">最后修改：</span>
                    <span class="info-value">{{ formatDate(validationResult.config.lastModified) }}</span>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <!-- 问题列表 -->
          <div v-if="hasIssues" class="issues-section">
            <div class="section-title">
              <q-icon name="warning" color="orange" class="q-mr-sm" />
              发现的问题
            </div>
            
            <q-card flat bordered>
              <q-list separator>
                <q-item v-for="(issue, index) in allIssues" :key="index">
                  <q-item-section avatar>
                    <q-icon 
                      :name="getIssueIcon(issue)" 
                      :color="getIssueColor(issue)" 
                      size="sm" 
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ issue }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-card>
          </div>

          <!-- 缺失文件和目录 -->
          <div v-if="hasMissingItems" class="missing-items-section">
            <div class="section-title">
              <q-icon name="folder_off" color="red" class="q-mr-sm" />
              缺失的文件和目录
            </div>
            
            <div class="missing-items-grid">
              <div v-if="validationResult.missingDirectories.length > 0" class="missing-group">
                <div class="missing-group__title">缺失目录</div>
                <q-card flat bordered>
                  <q-list dense>
                    <q-item v-for="dir in validationResult.missingDirectories" :key="dir">
                      <q-item-section avatar>
                        <q-icon name="folder" color="amber" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ dir }}/</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card>
              </div>

              <div v-if="validationResult.missingFiles.length > 0" class="missing-group">
                <div class="missing-group__title">缺失文件</div>
                <q-card flat bordered>
                  <q-list dense>
                    <q-item v-for="file in validationResult.missingFiles" :key="file">
                      <q-item-section avatar>
                        <q-icon name="description" color="blue" size="sm" />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label>{{ file }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card>
              </div>
            </div>
          </div>

          <!-- 初始化选项（对于非项目目录） -->
          <div v-if="showInitializationOptions" class="initialization-section">
            <div class="section-title">
              <q-icon name="rocket_launch" color="green" class="q-mr-sm" />
              初始化选项
            </div>
            
            <q-card flat bordered class="initialization-card">
              <q-card-section>
                <div class="text-body1 q-mb-md">
                  此目录不是有效的 Nimbria 项目，但可以初始化为新项目。
                </div>
                
                <div class="initialization-form">
                  <q-input
                    v-model="initForm.projectName"
                    label="项目名称"
                    outlined
                    dense
                    :error="!!initErrors.projectName"
                    :error-message="initErrors.projectName"
                    class="q-mb-sm"
                  />
                  
                  <q-input
                    v-model="initForm.novelTitle"
                    label="小说标题"
                    outlined
                    dense
                    :error="!!initErrors.novelTitle"
                    :error-message="initErrors.novelTitle"
                    class="q-mb-sm"
                  />
                  
                  <q-input
                    v-model="initForm.author"
                    label="作者"
                    outlined
                    dense
                    :error="!!initErrors.author"
                    :error-message="initErrors.author"
                    class="q-mb-sm"
                  />
                  
                  <q-select
                    v-model="initForm.genre"
                    :options="genreOptions"
                    label="小说类型"
                    outlined
                    dense
                    multiple
                    use-chips
                    :error="!!initErrors.genre"
                    :error-message="initErrors.genre"
                    max-values="3"
                  />
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </q-card-section>

      <!-- 底部操作栏 -->
      <q-card-actions class="project-validation-dialog__actions">
        <q-space />
        
        <!-- 取消按钮 -->
        <q-btn
          flat
          label="取消"
          @click="closeDialog"
          :disable="isProcessing"
          class="q-mr-sm"
        />
        
        <!-- 修复项目按钮 -->
        <q-btn
          v-if="canRepair"
          color="orange"
          label="修复项目"
          @click="repairProject"
          :loading="isRepairing"
          :disable="isProcessing"
          unelevated
          class="q-mr-sm"
        />
        
        <!-- 初始化项目按钮 -->
        <q-btn
          v-if="showInitializationOptions"
          color="green"
          label="初始化项目"
          @click="initializeProject"
          :loading="isInitializing"
          :disable="isProcessing || !isInitFormValid"
          unelevated
          class="q-mr-sm"
        />
        
        <!-- 打开项目按钮 -->
        <q-btn
          v-if="canOpenProject"
          color="primary"
          label="打开项目"
          @click="openProject"
          :loading="isOpening"
          :disable="isProcessing"
          unelevated
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { 
  ProjectValidationResult, 
  ProjectQuickValidation, 
  NimbriaProjectConfig 
} from '../../../types/filesystem'

// Props & Emits
interface Props {
  modelValue: boolean
  projectPath: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'projectOpened', projectPath: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const $q = useQuasar()

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isMobile = computed(() => $q.screen.lt.md)
const dialogStyle = computed(() => 
  isMobile.value ? {} : { width: '800px', maxWidth: '90vw', height: '80vh' }
)

const isValidating = ref(false)
const isRepairing = ref(false)
const isInitializing = ref(false)
const isOpening = ref(false)
const validationResult = ref<ProjectValidationResult | null>(null)

const isProcessing = computed(() => 
  isValidating.value || isRepairing.value || isInitializing.value || isOpening.value
)

// 初始化表单
const initForm = reactive({
  projectName: '',
  novelTitle: '',
  author: '',
  genre: [] as string[]
})

const initErrors = reactive({
  projectName: '',
  novelTitle: '',
  author: '',
  genre: ''
})

const genreOptions = [
  '玄幻', '仙侠', '都市', '历史', '军事', '游戏',
  '科幻', '灵异', '同人', '轻小说', '现实',
  '武侠', '奇幻', '悬疑', '言情', '古言'
]

// 计算属性
const validationPath = computed(() => props.projectPath)

const titleIcon = computed(() => {
  if (isValidating.value) return 'hourglass_empty'
  if (!validationResult.value) return 'folder_open'
  if (validationResult.value.isValid) return 'check_circle'
  if (validationResult.value.isProject) return 'warning'
  return 'help_outline'
})

const titleIconColor = computed(() => {
  if (isValidating.value) return 'orange'
  if (!validationResult.value) return 'primary'
  if (validationResult.value.isValid) return 'green'
  if (validationResult.value.isProject) return 'orange'
  return 'grey'
})

const dialogTitle = computed(() => {
  if (isValidating.value) return '验证项目'
  if (!validationResult.value) return '项目验证'
  if (validationResult.value.isValid) return '项目验证 - 正常'
  if (validationResult.value.isProject) return '项目验证 - 需要修复'
  return '项目验证 - 未识别'
})

const statusIcon = computed(() => {
  if (!validationResult.value) return 'help_outline'
  if (validationResult.value.isValid) return 'check_circle'
  if (validationResult.value.isProject) return 'warning'
  return 'error_outline'
})

const statusColor = computed(() => {
  if (!validationResult.value) return 'grey'
  if (validationResult.value.isValid) return 'green'
  if (validationResult.value.isProject) return 'orange'
  return 'red'
})

const statusTitle = computed(() => {
  if (!validationResult.value) return '未知状态'
  if (validationResult.value.isValid) return '项目正常'
  if (validationResult.value.isProject) return '项目需要修复'
  return '不是有效的项目'
})

const statusDescription = computed(() => {
  if (!validationResult.value) return ''
  if (validationResult.value.isValid) return '这是一个完整的 Nimbria 项目，可以直接打开'
  if (validationResult.value.isProject) return '这是一个 Nimbria 项目，但存在一些问题需要修复'
  return '此目录不是 Nimbria 项目，但可以初始化为新项目'
})

const allIssues = computed(() => {
  if (!validationResult.value) return []
  return validationResult.value.issues || []
})

const hasIssues = computed(() => allIssues.value.length > 0)

const hasMissingItems = computed(() => {
  if (!validationResult.value) return false
  return validationResult.value.missingFiles.length > 0 || 
         validationResult.value.missingDirectories.length > 0
})

const canRepair = computed(() => {
  return validationResult.value?.isProject && !validationResult.value.isValid
})

const showInitializationOptions = computed(() => {
  return validationResult.value && !validationResult.value.isProject && validationResult.value.canInitialize
})

const canOpenProject = computed(() => {
  return validationResult.value?.isValid
})

const isInitFormValid = computed(() => {
  return initForm.projectName.trim() &&
         initForm.novelTitle.trim() &&
         initForm.author.trim() &&
         initForm.genre.length > 0
})

// 方法
function getIssueIcon(issue: string): string {
  if (issue.includes('缺少')) return 'folder_off'
  if (issue.includes('错误') || issue.includes('格式')) return 'error'
  return 'warning'
}

function getIssueColor(issue: string): string {
  if (issue.includes('缺少')) return 'red'
  if (issue.includes('错误')) return 'red'
  return 'orange'
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('zh-CN')
  } catch {
    return dateString
  }
}

// 验证项目
async function validateProject() {
  if (!props.projectPath) return

  isValidating.value = true
  validationResult.value = null

  try {
    if (!window.nimbria?.project?.validateProject) {
      throw new Error('项目验证API不可用')
    }

    const result = await window.nimbria.project.validateProject(props.projectPath)
    validationResult.value = result

    // 如果不是项目但可以初始化，预填表单
    if (!result.isProject && result.canInitialize) {
      const pathParts = props.projectPath.split(/[\\/]/)
      const folderName = pathParts[pathParts.length - 1]
      if (folderName) {
        initForm.projectName = folderName
        initForm.novelTitle = folderName
      }
    }

  } catch (error) {
    console.error('验证项目失败:', error)
    $q.notify({
      type: 'negative',
      message: '验证项目失败',
      position: 'top'
    })
  } finally {
    isValidating.value = false
  }
}

// 修复项目
async function repairProject() {
  if (!validationResult.value || isRepairing.value) return

  isRepairing.value = true

  try {
    if (!window.nimbria?.project?.repairProject) {
      throw new Error('项目修复API不可用')
    }

    const result = await window.nimbria.project.repairProject(props.projectPath)

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: '项目修复成功',
        position: 'top'
      })
      
      // 重新验证项目
      await validateProject()
    } else {
      throw new Error(result.error || '项目修复失败')
    }

  } catch (error) {
    console.error('修复项目失败:', error)
    const message = error instanceof Error ? error.message : '修复项目失败'
    $q.notify({
      type: 'negative',
      message,
      position: 'top'
    })
  } finally {
    isRepairing.value = false
  }
}

// 初始化项目
async function initializeProject() {
  if (!isInitFormValid.value || isInitializing.value) return

  isInitializing.value = true

  try {
    if (!window.nimbria?.project?.initializeExistingDirectory) {
      throw new Error('项目初始化API不可用')
    }

    const result = await window.nimbria.project.initializeExistingDirectory({
      directoryPath: props.projectPath,
      projectName: initForm.projectName,
      novelTitle: initForm.novelTitle,
      author: initForm.author,
      genre: initForm.genre,
      timestamp: new Date().toISOString()
    })

    if (result.success) {
      $q.notify({
        type: 'positive',
        message: '项目初始化成功',
        position: 'top'
      })
      
      // 重新验证项目
      await validateProject()
    } else {
      throw new Error(result.error || '项目初始化失败')
    }

  } catch (error) {
    console.error('初始化项目失败:', error)
    const message = error instanceof Error ? error.message : '初始化项目失败'
    $q.notify({
      type: 'negative',
      message,
      position: 'top'
    })
  } finally {
    isInitializing.value = false
  }
}

// 打开项目
async function openProject() {
  if (!validationResult.value?.isValid || isOpening.value) return

  isOpening.value = true

  try {
    emit('projectOpened', props.projectPath)
    closeDialog()

  } catch (error) {
    console.error('打开项目失败:', error)
  } finally {
    isOpening.value = false
  }
}

// 关闭对话框
function closeDialog() {
  if (isProcessing.value) return
  dialogVisible.value = false
}

// 重置状态
function resetState() {
  validationResult.value = null
  Object.assign(initForm, {
    projectName: '',
    novelTitle: '',
    author: '',
    genre: []
  })
  Object.assign(initErrors, {
    projectName: '',
    novelTitle: '',
    author: '',
    genre: ''
  })
}

// 监听对话框打开
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    validateProject()
  } else {
    setTimeout(resetState, 300)
  }
})

// 监听项目路径变化
watch(() => props.projectPath, () => {
  if (props.modelValue) {
    validateProject()
  }
})
</script>

<style scoped lang="scss">
.project-validation-dialog {
  display: flex;
  flex-direction: column;

  &__titlebar {
    height: 48px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    padding: 0 16px;
  }

  &__title {
    font-weight: 600;
    font-size: 16px;
    color: #2c3e50;
  }

  &__content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
  }

  &__actions {
    border-top: 1px solid #e0e0e0;
    padding: 16px 24px;
    background: #fafafa;
  }
}

.validation-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
}

.validation-result {
  .result-overview {
    margin-bottom: 24px;

    .overview-card {
      border-left: 4px solid v-bind(statusColor);
    }
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
  }

  .project-info {
    margin-bottom: 24px;

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      
      @media (max-width: 600px) {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .info-label {
        font-weight: 500;
        color: #555;
        min-width: 80px;
      }

      .info-value {
        color: #333;
        word-break: break-word;
      }
    }
  }

  .issues-section {
    margin-bottom: 24px;
  }

  .missing-items-section {
    margin-bottom: 24px;

    .missing-items-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      
      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .missing-group {
      &__title {
        font-size: 14px;
        font-weight: 500;
        color: #666;
        margin-bottom: 8px;
      }
    }
  }

  .initialization-section {
    margin-bottom: 24px;

    .initialization-card {
      border-left: 4px solid #4caf50;
    }

    .initialization-form {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      
      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }
  }
}
</style>
