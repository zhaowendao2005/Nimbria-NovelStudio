<template>
  <q-dialog 
    v-model="dialogVisible" 
    persistent 
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="project-creation-dialog">
      <!-- 标题栏 -->
      <q-bar class="project-creation-dialog__titlebar">
        <div class="project-creation-dialog__title">
          <q-icon name="add_circle_outline" class="q-mr-sm" />
          创建新项目
        </div>
        <q-space />
        <q-btn 
          flat 
          dense 
          round 
          icon="close" 
          @click="closeDialog"
          :disable="isCreating"
        />
      </q-bar>

      <!-- 主内容区 -->
      <q-card-section class="project-creation-dialog__content">
        <div class="project-creation-form">
          <!-- 左侧表单 -->
          <div class="project-creation-form__left">
            <div class="form-section">
              <div class="form-section__title">基本信息</div>
              
              <!-- 项目存放位置选择 -->
              <div class="form-field">
                <q-input
                  v-model="formData.parentDirectory"
                  label="项目存放位置"
                  outlined
                  readonly
                  :error="!!errors.parentDirectory"
                  :error-message="errors.parentDirectory"
                  class="q-mb-md"
                  hint="选择一个文件夹来存放新项目"
                >
                  <template v-slot:append>
                    <q-btn
                      flat
                      dense
                      icon="folder_open"
                      @click="selectDirectory"
                      :disable="isCreating"
                      color="primary"
                    >
                      <q-tooltip>选择存放位置</q-tooltip>
                    </q-btn>
                  </template>
                </q-input>
              </div>

              <!-- 项目路径预览 -->
              <div v-if="projectFullPath" class="form-field">
                <q-banner inline-actions class="text-primary bg-primary-1 q-mb-md">
                  <template v-slot:avatar>
                    <q-icon name="info" color="primary" />
                  </template>
                  项目将创建在：<strong>{{ projectFullPath }}</strong>
                </q-banner>
              </div>

              <!-- 项目名称 -->
              <div class="form-field">
                <q-input
                  v-model="formData.projectName"
                  label="项目名称"
                  outlined
                  :error="!!errors.projectName"
                  :error-message="errors.projectName"
                  :disable="isCreating"
                  @blur="validateProjectName"
                  class="q-mb-md"
                  placeholder="例如：我的第一部小说"
                />
              </div>

              <!-- 小说标题 -->
              <div class="form-field">
                <q-input
                  v-model="formData.novelTitle"
                  label="小说标题"
                  outlined
                  :error="!!errors.novelTitle"
                  :error-message="errors.novelTitle"
                  :disable="isCreating"
                  @blur="validateNovelTitle"
                  class="q-mb-md"
                  placeholder="例如：星际穿越者"
                />
              </div>

              <!-- 作者 -->
              <div class="form-field">
                <q-input
                  v-model="formData.author"
                  label="作者"
                  outlined
                  :error="!!errors.author"
                  :error-message="errors.author"
                  :disable="isCreating"
                  @blur="validateAuthor"
                  class="q-mb-md"
                  placeholder="请输入作者姓名"
                />
              </div>
            </div>

            <div class="form-section">
              <div class="form-section__title">小说设定</div>
              
              <!-- 小说类型 -->
              <div class="form-field">
                <q-select
                  v-model="formData.genre"
                  :options="genreOptions"
                  label="小说类型"
                  outlined
                  multiple
                  use-chips
                  :error="!!errors.genre"
                  :error-message="errors.genre"
                  :disable="isCreating"
                  @update:model-value="validateGenre"
                  class="q-mb-md"
                  placeholder="选择小说类型（可多选）"
                  max-values="3"
                >
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        没有匹配的选项
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <!-- 小说简介 -->
              <div class="form-field">
                <q-input
                  v-model="formData.description"
                  label="小说简介（可选）"
                  outlined
                  type="textarea"
                  rows="4"
                  :disable="isCreating"
                  class="q-mb-md"
                  placeholder="简要描述你的小说内容、主题或特色..."
                />
              </div>
            </div>
          </div>

          <!-- 右侧预览 -->
          <div class="project-creation-form__right">
            <div class="preview-section">
              <div class="preview-section__title">项目预览</div>
              
              <q-card flat bordered class="preview-card">
                <q-card-section>
                  <div class="preview-item">
                    <q-icon name="folder" color="primary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">存放位置：</span>
                    <span class="preview-value">{{ formData.parentDirectory || '未选择' }}</span>
                  </div>

                  <div v-if="projectFullPath" class="preview-item">
                    <q-icon name="create_new_folder" color="secondary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">项目路径：</span>
                    <span class="preview-value">{{ projectFullPath }}</span>
                  </div>
                  
                  <div class="preview-item">
                    <q-icon name="drive_file_rename_outline" color="primary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">项目名称：</span>
                    <span class="preview-value">{{ formData.projectName || '未填写' }}</span>
                  </div>
                  
                  <div class="preview-item">
                    <q-icon name="auto_stories" color="primary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">小说标题：</span>
                    <span class="preview-value">{{ formData.novelTitle || '未填写' }}</span>
                  </div>
                  
                  <div class="preview-item">
                    <q-icon name="person" color="primary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">作者：</span>
                    <span class="preview-value">{{ formData.author || '未填写' }}</span>
                  </div>
                  
                  <div class="preview-item">
                    <q-icon name="category" color="primary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">类型：</span>
                    <span class="preview-value">
                      {{ formData.genre.length > 0 ? formData.genre.join('、') : '未选择' }}
                    </span>
                  </div>
                  
                  <div v-if="formData.description" class="preview-item">
                    <q-icon name="description" color="primary" size="sm" class="q-mr-sm" />
                    <span class="preview-label">简介：</span>
                    <span class="preview-value">{{ formData.description }}</span>
                  </div>
                </q-card-section>
              </q-card>

              <!-- 目录结构预览 -->
              <div class="preview-structure">
                <div class="preview-section__subtitle">将创建的目录结构</div>
                <q-card flat bordered class="structure-card">
                  <q-card-section class="structure-content">
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>{{ formData.projectName || '项目文件夹' }}/</span>
                    </div>
                    <div class="structure-item structure-item--file">
                      <q-icon name="settings" color="grey-6" size="sm" />
                      <span>nimbria.config.json</span>
                    </div>
                    <div class="structure-item structure-item--file">
                      <q-icon name="description" color="blue" size="sm" />
                      <span>README.md</span>
                    </div>
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>manuscripts/</span>
                    </div>
                    <div class="structure-item structure-item--folder structure-item--indent">
                      <q-icon name="description" color="green" size="sm" />
                      <span>chapter-001.md</span>
                    </div>
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>characters/</span>
                    </div>
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>outlines/</span>
                    </div>
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>research/</span>
                    </div>
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>assets/</span>
                    </div>
                    <div class="structure-item structure-item--folder">
                      <q-icon name="folder" color="amber" size="sm" />
                      <span>backups/</span>
                    </div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
        </div>
      </q-card-section>

      <!-- 底部操作栏 -->
      <q-card-actions class="project-creation-dialog__actions">
        <q-space />
        <q-btn
          flat
          label="取消"
          @click="closeDialog"
          :disable="isCreating"
          class="q-mr-sm"
        />
        <q-btn
          color="primary"
          label="创建项目"
          @click="createProject"
          :loading="isCreating"
          :disable="!isFormValid"
          unelevated
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import type { ProjectCreationOptions } from '../../../types/filesystem'

// Props & Emits
interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'created', projectPath: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const $q = useQuasar()

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isCreating = ref(false)
const shouldCloseAfterCreate = ref(false) // 标志位：创建成功后是否应关闭对话框

// 表单数据
const formData = reactive({
  parentDirectory: '',  // 改为父目录
  projectName: '',
  novelTitle: '',
  author: '',
  genre: [] as string[],
  description: ''
})

// 表单验证错误
const errors = reactive({
  parentDirectory: '',  // 改为父目录
  projectName: '',
  novelTitle: '',
  author: '',
  genre: ''
})

// 小说类型选项
const genreOptions = [
  '玄幻', '仙侠', '都市', '历史', '军事', '游戏',
  '科幻', '灵异', '同人', '轻小说', '现实',
  '武侠', '奇幻', '悬疑', '言情', '古言',
  '现言', '校园', '职场', '豪门', '重生',
  '穿越', '系统', '末世', '星际', '机甲',
  '修真', '洪荒', '网游', '竞技', '二次元'
]

// 项目完整路径预览
const projectFullPath = computed(() => {
  if (formData.parentDirectory && formData.projectName) {
    return `${formData.parentDirectory}\\${formData.projectName}`
  }
  return ''
})

// 表单验证
const isFormValid = computed(() => {
  return formData.parentDirectory &&
         formData.projectName &&
         formData.novelTitle &&
         formData.author &&
         formData.genre.length > 0 &&
         !errors.parentDirectory &&
         !errors.projectName &&
         !errors.novelTitle &&
         !errors.author &&
         !errors.genre
})

// 验证函数
function validateProjectName() {
  if (!formData.projectName.trim()) {
    errors.projectName = '项目名称不能为空'
    return
  }
  
  if (formData.projectName.trim().length < 2) {
    errors.projectName = '项目名称至少需要2个字符'
    return
  }
  
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/.test(formData.projectName)) {
    errors.projectName = '项目名称只能包含中文、英文、数字、下划线、连字符和空格'
    return
  }
  
  // 检查是否包含Windows文件名禁用字符
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(formData.projectName.trim())) {
    errors.projectName = '项目名称不能包含特殊字符 < > : " | ? *'
    return
  }
  
  errors.projectName = ''
  
  // 如果父目录已选择，检查项目目录是否已存在
  if (formData.parentDirectory) {
    validateProjectDirectory()
  }
}

// 验证项目目录是否已存在
async function validateProjectDirectory() {
  if (!formData.parentDirectory || !formData.projectName) return
  
  try {
    const fullPath = `${formData.parentDirectory}\\${formData.projectName}`
    const exists = await window.nimbria?.fs?.pathExists(fullPath)
    
    if (exists) {
      errors.projectName = '该项目名称对应的文件夹已存在，请选择其他名称'
    } else {
      // 只有当没有其他错误时才清空错误信息
      if (errors.projectName === '该项目名称对应的文件夹已存在，请选择其他名称') {
        errors.projectName = ''
      }
    }
  } catch (error) {
    console.warn('验证项目目录失败:', error)
  }
}

function validateNovelTitle() {
  if (!formData.novelTitle.trim()) {
    errors.novelTitle = '小说标题不能为空'
  } else {
    errors.novelTitle = ''
  }
}

function validateAuthor() {
  if (!formData.author.trim()) {
    errors.author = '作者不能为空'
  } else {
    errors.author = ''
  }
}

function validateGenre() {
  if (formData.genre.length === 0) {
    errors.genre = '请至少选择一个小说类型'
  } else {
    errors.genre = ''
  }
}

// 选择目录
async function selectDirectory() {
  try {
    if (!window.nimbria?.file?.openDialog) {
      throw new Error('文件对话框API不可用')
    }

    const result = await window.nimbria?.file?.openDialog({
      title: '选择项目创建位置',
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      formData.parentDirectory = result.filePaths[0]
      errors.parentDirectory = ''
      
      // 验证项目名称是否有冲突
      if (formData.projectName) {
        await validateProjectDirectory()
      }
    }
  } catch (error) {
    console.error('选择目录失败:', error)
    $q.notify({
      type: 'negative',
      message: '选择目录失败',
      position: 'top'
    })
  }
}

// 创建项目
async function createProject() {
  if (!isFormValid.value || isCreating.value) return

  // 最终验证
  validateProjectName()
  validateNovelTitle()
  validateAuthor()
  validateGenre()

  if (!isFormValid.value) {
    $q.notify({
      type: 'negative',
      message: '请检查表单中的错误',
      position: 'top'
    })
    return
  }

  isCreating.value = true

  try {
    if (!window.nimbria?.project?.createProject) {
      throw new Error('项目创建API不可用')
    }

    const options: ProjectCreationOptions = {
      parentDirectory: formData.parentDirectory.trim(),  // 改为父目录
      projectName: formData.projectName.trim(),
      novelTitle: formData.novelTitle.trim(),
      author: formData.author.trim(),
      genre: [...formData.genre],
      description: formData.description ? formData.description.trim() : undefined,
      timestamp: new Date().toISOString()
    }

    const result = await window.nimbria.project.createProject({ ...options })

    if (result.success) {
      // 设置标志位，表示创建成功后需要关闭对话框
      shouldCloseAfterCreate.value = true
      
      // 添加到最近打开列表
      try {
        await window.nimbria.project.updateRecent({
          projectPath: result.projectPath!,
          projectName: formData.projectName
        })
        console.log('项目已添加到最近打开列表')
      } catch (error) {
        console.warn('添加到最近列表失败，但不影响项目创建:', error)
      }
      
      // 显示成功通知
      $q.notify({
        type: 'positive',
        message: `项目创建成功！`,
        caption: `位置：${result.projectPath}`,
        position: 'top',
        timeout: 5000,
        actions: [
          { 
            label: '知道了', 
            color: 'white',
            handler: () => {
              // 通知会自动关闭，用户确认项目创建成功
              console.log('用户确认项目创建成功')
            }
          }
        ]
      })
      
      // TODO: 这里应该打开项目页面，但因为项目页面还未开发完成，
      // 暂时只是通知成功并停留在主界面。后续需要替换为：
      // router.push({ name: 'project', params: { projectPath: result.projectPath } })
      console.log('项目创建成功，暂时停留在主界面，等待项目页面开发完成')
      
      emit('created', result.projectPath!)
    } else {
      throw new Error(result.error || '项目创建失败')
    }

  } catch (error) {
    console.error('创建项目失败:', error)
    const message = error instanceof Error ? error.message : '创建项目失败'
    $q.notify({
      type: 'negative',
      message,
      position: 'top'
    })
  } finally {
    isCreating.value = false
    
    // 如果创建成功，在 finally 块中关闭对话框（此时 isCreating 已复位为 false）
    if (shouldCloseAfterCreate.value) {
      shouldCloseAfterCreate.value = false // 重置标志位
      closeDialog()
    }
  }
}

// 关闭对话框
function closeDialog() {
  if (isCreating.value) return
  dialogVisible.value = false
}

// 重置表单
function resetForm() {
  Object.assign(formData, {
    parentDirectory: '',  // 改为父目录
    projectName: '',
    novelTitle: '',
    author: '',
    genre: [],
    description: ''
  })
  
  Object.assign(errors, {
    parentDirectory: '',  // 改为父目录
    projectName: '',
    novelTitle: '',
    author: '',
    genre: ''
  })
}

// 监听对话框打开/关闭
watch(() => props.modelValue, (newValue) => {
  if (!newValue) {
    // 对话框关闭时重置表单
    setTimeout(resetForm, 300) // 等待动画完成
  }
})
</script>

<style scoped lang="scss">
.project-creation-dialog {
  height: 100vh;
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
    display: flex;
    align-items: center;
  }

  &__content {
    flex: 1;
    overflow: hidden;
    padding: 24px;
  }

  &__actions {
    border-top: 1px solid #e0e0e0;
    padding: 16px 24px;
    background: #fafafa;
  }
}

.project-creation-form {
  height: 100%;
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 32px;

  &__left {
    overflow-y: auto;
    padding-right: 16px;
  }

  &__right {
    border-left: 1px solid #e0e0e0;
    padding-left: 32px;
    overflow-y: auto;
    height: 100%;
  }
}

.form-section {
  margin-bottom: 32px;

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #1976d2;
  }
}

.form-field {
  margin-bottom: 16px;
}

.preview-section {
  &__title {
    font-size: 16px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 16px;
  }

  &__subtitle {
    font-size: 14px;
    font-weight: 500;
    color: #555;
    margin: 24px 0 12px 0;
  }
}

.preview-card {
  margin-bottom: 24px;
  
  .preview-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }

    .preview-label {
      font-weight: 500;
      color: #555;
      min-width: 80px;
    }

    .preview-value {
      color: #333;
      word-break: break-word;
    }
  }
}

.structure-card {
  .structure-content {
    padding: 16px;
  }

  .structure-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;

    &:last-child {
      margin-bottom: 0;
    }

    &--indent {
      margin-left: 20px;
    }

    .q-icon {
      margin-right: 8px;
    }

    span {
      color: #333;
    }
  }
}

// 响应式设计
@media (max-width: 1200px) {
  .project-creation-form {
    grid-template-columns: 1fr 350px;
    gap: 24px;
  }
}

@media (max-width: 900px) {
  .project-creation-form {
    grid-template-columns: 1fr;
    gap: 0;

    &__right {
      border-left: none;
      border-top: 1px solid #e0e0e0;
      padding-left: 0;
      padding-top: 24px;
      margin-top: 24px;
    }
  }
}
</style>
