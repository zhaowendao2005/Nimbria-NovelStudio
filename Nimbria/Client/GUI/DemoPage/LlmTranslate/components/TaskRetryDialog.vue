<template>
  <el-dialog 
    v-model="dialogVisible" 
    title="任务提示词修正"
    width="650px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 原系统提示词展示（可折叠查看） -->
    <div class="original-prompt-section">
      <el-collapse v-model="collapseActive">
        <el-collapse-item name="original">
          <template #title>
            <div class="collapse-header">
              <el-icon><InfoFilled /></el-icon>
              <span>查看原系统提示词</span>
            </div>
          </template>
          <div class="original-prompt-content">
            {{ currentSystemPrompt }}
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <el-divider />

    <!-- 替换系统提示词输入框 -->
    <div class="prompt-section">
      <div class="prompt-header">
        <div class="prompt-title">
          <el-icon><Edit /></el-icon>
          <span>替换系统提示词</span>
        </div>
        <el-tag v-if="replacePrompt.trim() !== ''" type="success" size="small">已启用</el-tag>
      </div>
      <el-input
        v-model="replacePrompt"
        type="textarea"
        :rows="5"
        placeholder="输入新的系统提示词将完全替换原有提示词"
        :disabled="appendPrompt.trim() !== ''"
        clearable
        show-word-limit
        maxlength="5000"
      />
      <div v-if="appendPrompt.trim() !== ''" class="disabled-overlay">
        <el-icon><Lock /></el-icon>
        <span>已启用"追加提示词"，此项已禁用</span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="divider-text">— 或 —</div>

    <!-- 追加提示词输入框 -->
    <div class="prompt-section">
      <div class="prompt-header">
        <div class="prompt-title">
          <el-icon><Plus /></el-icon>
          <span>追加提示词</span>
        </div>
        <el-tag v-if="appendPrompt.trim() !== ''" type="success" size="small">已启用</el-tag>
      </div>
      <el-input
        v-model="appendPrompt"
        type="textarea"
        :rows="5"
        placeholder="输入内容将追加到原系统提示词之后（换行衔接）"
        :disabled="replacePrompt.trim() !== ''"
        clearable
        show-word-limit
        maxlength="2000"
      />
      <div v-if="replacePrompt.trim() !== ''" class="disabled-overlay">
        <el-icon><Lock /></el-icon>
        <span>已启用"替换系统提示词"，此项已禁用</span>
      </div>
    </div>

    <!-- 提示信息 -->
    <el-alert 
      v-if="!replacePrompt.trim() && !appendPrompt.trim()"
      title="不填写任何内容将使用原系统提示词重新发送" 
      type="info" 
      :closable="false"
      show-icon
      style="margin-top: 16px;"
    />

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirm"
          :icon="Refresh"
        >
          重新发送
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { 
  InfoFilled, 
  Edit, 
  Plus, 
  Lock,
  Refresh 
} from '@element-plus/icons-vue'

interface Props {
  visible: boolean
  currentSystemPrompt: string
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', data: {
    type: 'replace' | 'append' | 'none'
    content?: string
  }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = ref(false)
const replacePrompt = ref('')
const appendPrompt = ref('')
const collapseActive = ref<string[]>([])

// 双向绑定 visible
watch(() => props.visible, (val) => {
  dialogVisible.value = val
})

watch(dialogVisible, (val) => {
  if (!val) {
    emit('update:visible', false)
  }
})

const handleClose = () => {
  replacePrompt.value = ''
  appendPrompt.value = ''
  collapseActive.value = []
  dialogVisible.value = false
}

const handleConfirm = () => {
  if (replacePrompt.value.trim()) {
    emit('confirm', {
      type: 'replace',
      content: replacePrompt.value.trim()
    })
  } else if (appendPrompt.value.trim()) {
    emit('confirm', {
      type: 'append',
      content: appendPrompt.value.trim()
    })
  } else {
    emit('confirm', { type: 'none' })
  }
  handleClose()
}
</script>

<style scoped>
.original-prompt-section {
  margin-bottom: 8px;
}

.collapse-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #606266;
}

.original-prompt-content {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-section {
  margin-bottom: 20px;
  position: relative;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.prompt-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.disabled-overlay {
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  border-radius: 4px;
  z-index: 10;
  pointer-events: none;
}

.divider-text {
  text-align: center;
  color: #c0c4cc;
  margin: 24px 0;
  font-size: 13px;
  font-weight: 500;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
