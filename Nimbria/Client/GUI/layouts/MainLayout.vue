<template>
  <q-layout view="lHh Lpr lFf" class="startup-layout">
    <!-- 顶部自定义标题栏 -->
    <q-bar class="startup-titlebar q-electron-drag">
      <div class="startup-titlebar__title">Nimbria</div>
      <q-space />
      <q-btn 
        flat 
        dense 
        round 
        size="sm" 
        icon="minimize" 
        @click="minimize" 
        class="q-electron-drag--exception startup-titlebar__btn startup-titlebar__btn--minimize" 
      />
      <q-btn 
        flat 
        dense 
        round 
        size="sm" 
        icon="close" 
        @click="closeApp" 
        class="q-electron-drag--exception startup-titlebar__btn" 
      />
    </q-bar>

    <!-- 左侧项目历史抽屉 -->
    <q-drawer 
      v-model="leftDrawerOpen"
      side="left" 
      :width="280"
      class="startup-drawer"
      bordered
      show-if-above
      :breakpoint="0"
    >
      <q-scroll-area class="startup-drawer__scroll" :style="drawerScrollStyle">
        <q-list class="startup-project-list">
          <q-item-label header class="text-grey-7 q-px-md">最近项目</q-item-label>
          
          <template v-if="!projectStore.hasRecentProjects && !projectStore.isLoading">
            <q-item class="startup-project-item--empty">
              <q-item-section avatar>
                <q-icon name="folder_open" color="grey-5" size="md" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-grey-6">暂无最近项目</q-item-label>
                <q-item-label caption class="text-grey-5">创建或打开项目后将显示在这里</q-item-label>
              </q-item-section>
            </q-item>
          </template>

          <template v-if="projectStore.isLoading">
            <q-item class="startup-project-item--empty">
              <q-item-section avatar>
                <q-spinner color="primary" size="md" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-grey-6">加载最近项目...</q-item-label>
              </q-item-section>
            </q-item>
          </template>

          <q-item 
            v-for="project in projectStore.recentProjects" 
            :key="project.id"
            clickable 
            v-ripple
            class="startup-project-item"
            @click="openRecentProject(project)"
          >
            <q-item-section avatar>
              <q-icon name="folder" color="primary" size="md" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ project.name }}</q-item-label>
              <q-item-label caption class="text-grey-6 project-path">{{ project.path }}</q-item-label>
              <q-item-label caption class="text-grey-5">{{ formatLastOpened(project.lastOpened) }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <!-- 右侧主内容区 -->
    <q-page-container class="startup-content">
      <q-page class="startup-page" :style="pageContentStyle">
        <div class="startup-actions">
          <!-- Logo区域 -->
          <div class="startup-logo text-center q-mb-xl">
            <div class="startup-logo__icon">
              <q-icon name="auto_stories" size="64px" color="primary" />
            </div>
            <div class="startup-logo__title text-h4 text-weight-light q-mt-md">Nimbria</div>
            <div class="startup-logo__subtitle text-body2 text-grey-6">云墨澜书</div>
          </div>

          <!-- 操作卡片 -->
          <div class="startup-cards">
            <!-- 新建项目卡片 -->
            <q-card class="startup-action-card" flat bordered>
              <q-card-section class="q-pb-xs">
                <div class="row items-center q-gutter-sm">
                  <q-icon name="add_circle_outline" color="primary" size="md" />
                  <div class="text-h6 text-weight-medium">新建项目</div>
                </div>
                <div class="text-body2 text-grey-7 q-mt-sm">在指定文件夹下创建一个新的项目工作区</div>
              </q-card-section>
              <q-card-actions align="right" class="q-pt-xs">
                <q-btn 
                  color="primary" 
                  unelevated 
                  label="创建项目" 
                  :loading="isCreatingProject"
                  @click="createProject" 
                />
              </q-card-actions>
            </q-card>

            <!-- 打开本地项目卡片 -->
            <q-card class="startup-action-card" flat bordered>
              <q-card-section class="q-pb-xs">
                <div class="row items-center q-gutter-sm">
                  <q-icon name="folder_open" color="primary" size="md" />
                  <div class="text-h6 text-weight-medium">打开本地项目</div>
                </div>
                <div class="text-body2 text-grey-7 q-mt-sm">将一个本地文件夹作为项目在 Nimbria 中打开</div>
              </q-card-section>
              <q-card-actions align="right" class="q-pt-xs">
                <q-btn 
                  color="primary" 
                  unelevated 
                  label="打开项目" 
                  :loading="isOpeningProject"
                  @click="openProject" 
                />
              </q-card-actions>
            </q-card>
          </div>

        </div>
      </q-page>
    </q-page-container>

    <!-- 项目创建对话框 -->
    <ProjectCreationDialog
      v-model="showProjectCreationDialog"
      @created="onProjectCreated"
    />

    <!-- 项目验证对话框 -->
    <ProjectValidationDialog
      v-model="showProjectValidationDialog"
      :project-path="validationProjectPath"
      @project-opened="onProjectOpened"
    />
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useProjectSelectionStore } from '../../stores/project'
import ProjectCreationDialog from '../components/ProjectManagement/ProjectCreationDialog.vue'
import ProjectValidationDialog from '../components/ProjectManagement/ProjectValidationDialog.vue'
import type { RecentProject } from '../../types/domain/project'

const leftDrawerOpen = ref(true)
const projectStore = useProjectSelectionStore()
const isCreatingProject = ref(false)
const isOpeningProject = ref(false)

// 对话框控制
const showProjectCreationDialog = ref(false)
const showProjectValidationDialog = ref(false)
const validationProjectPath = ref('')

// 高度计算
const TITLEBAR_HEIGHT = 48;
const CONTENT_HEIGHT = `calc(100vh - ${TITLEBAR_HEIGHT}px)`;

const drawerScrollStyle = computed(() => ({
  height: CONTENT_HEIGHT
}));

const pageContentStyle = computed(() => ({
  height: CONTENT_HEIGHT
}));

// 窗口控制函数
async function minimize() {
  console.log('最小化窗口');
  try {
    if (window.nimbria?.window?.minimize) {
      await window.nimbria.window.minimize();
    }
  } catch (error) {
    console.error('窗口最小化失败:', error);
  }
}

async function closeApp() {
  console.log('关闭应用');
  try {
    if (window.nimbria?.window?.close) {
      await window.nimbria.window.close();
    }
  } catch (error) {
    console.error('窗口关闭失败:', error);
  }
}

// 组件挂载时加载最近项目
onMounted(() => {
  void projectStore.loadRecentProjects()
})

// 时间格式化函数
function formatLastOpened(lastOpened: string): string {
  const date = new Date(lastOpened)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInHours < 1) {
    return '刚刚'
  } else if (diffInHours < 24) {
    return `${diffInHours}小时前`
  } else if (diffInDays === 1) {
    return '昨天'
  } else if (diffInDays < 7) {
    return `${diffInDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN')
  }
}

// 项目操作函数
async function createProject() {
  if (isCreatingProject.value) return
  
  isCreatingProject.value = true
  projectStore.clearError()

  try {
    const result = await projectStore.createNewProject()
    
    if (result === 'show-creation-dialog') {
      showProjectCreationDialog.value = true
    }
    
  } catch (error) {
    console.error('创建项目失败:', error)
    
  } finally {
    isCreatingProject.value = false
  }
}

async function openProject() {
  if (isOpeningProject.value) return
  
  isOpeningProject.value = true
  projectStore.clearError()

  try {
    const result = await projectStore.openExistingProject()
    
    if (result && typeof result === 'object' && result.action === 'show-validation-dialog') {
      validationProjectPath.value = result.projectPath
      showProjectValidationDialog.value = true
    }
    
  } catch (error) {
    console.error('打开项目失败:', error)
    
  } finally {
    isOpeningProject.value = false
  }
}

async function openRecentProject(project: RecentProject) {
  projectStore.clearError()

  try {
    const result = await projectStore.openRecentProject(project)
    
    if (result && typeof result === 'object' && result.action === 'show-validation-dialog') {
      validationProjectPath.value = result.projectPath
      showProjectValidationDialog.value = true
    }
  } catch (error) {
    console.error('打开最近项目失败:', error)
  }
}

// 对话框事件处理
function onProjectCreated(projectPath: string) {
  console.log('项目创建成功:', projectPath)
  
  // 刷新最近项目列表
  void projectStore.loadRecentProjects()
  
  // TODO: 这里应该打开项目页面，但因为项目页面还未开发完成，
  // 暂时只是刷新项目列表并停留在主界面。后续需要替换为：
  // await openProjectWindow(projectPath)
  console.log('项目创建成功，暂时停留在主界面，等待项目页面开发完成')
}

function onProjectOpened(projectPath: string) {
  console.log('项目打开成功:', projectPath)
  // 这里可以添加打开项目窗口的逻辑
  // 或者刷新最近项目列表
  void projectStore.loadRecentProjects()
}
</script>

<style scoped lang="scss">
.startup-layout {
  height: 100vh;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

// 顶部标题栏
.startup-titlebar {
  height: 48px;
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 16px;
  
  &__title {
    font-weight: 600;
    font-size: 14px;
    color: #2c3e50;
  }

  &__btn {
    width: 30px;
    height: 30px;
    
    &:hover {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  &__btn--minimize {
    display: flex;
    align-items: center;
    justify-content: center;

    :deep(.q-icon) {
      margin: 0;
      line-height: 1;
      transform: translateY(-5px);
    }
  }
}

// 左侧抽屉
.startup-drawer {
  background: #f8f9fa;
  
  &__scroll {
    height: v-bind(CONTENT_HEIGHT);
  }
}

.startup-project-list {
  padding: 8px 0;
}

.startup-project-item {
  min-height: 72px;
  margin: 2px 12px;
  border-radius: 8px;
  
  &:hover {
    background: rgba(25, 118, 210, 0.04);
  }
  
  &--empty {
    min-height: 80px;
    margin: 16px 12px;
    pointer-events: none;
  }
  
  .q-item__section--avatar {
    min-width: 48px;
  }
  
  // 项目路径自动换行样式
  .project-path {
    word-break: break-all;
    word-wrap: break-word;
    white-space: normal !important;
    line-height: 1.4;
    max-width: 100%;
  }
}

// 右侧主内容区
.startup-content {
  background: #ffffff;
}

.startup-page {
  height: v-bind(CONTENT_HEIGHT);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.startup-actions {
  max-width: 480px;
  width: 100%;
}

// Logo区域
.startup-logo {
  &__icon {
    opacity: 0.8;
  }

  &__title {
    color: #2c3e50;
    margin: 0;
  }

  &__subtitle {
    color: #6c757d;
  }
}

// 操作卡片
.startup-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.startup-action-card {
  border: 1px solid #e9ecef;
  border-radius: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #1976d2;
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.15);
    transform: translateY(-1px);
  }
  
  .q-card__section {
    padding: 20px 24px 16px;
  }
  
  .q-card__actions {
    padding: 0 24px 20px;
  }
}

// 语言设置区域
//（语言切换已移除）
</style>