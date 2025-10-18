<template>
  <div class="mode-selector">
    <el-dropdown trigger="click" @command="handleDropdownCommand">
      <el-button text size="small">
        <el-icon v-if="currentModeInfo?.icon">
          <component :is="currentModeInfo.icon" />
        </el-icon>
        {{ currentModeInfo?.name || '选择模式' }}
        <el-icon class="arrow-icon">
          <component :is="'ArrowDown'" />
        </el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu class="mode-dropdown-menu">
          <el-dropdown-item
            v-for="mode in availableModes"
            :key="mode.id"
            :command="mode.id"
            :class="{ 'is-active': mode.id === currentMode }"
            class="mode-item"
          >
            <div class="mode-content">
              <el-icon v-if="mode.icon" class="mode-icon">
                <component :is="mode.icon" />
              </el-icon>
              <div class="mode-info">
                <span class="mode-name">{{ mode.name }}</span>
                <span v-if="mode.description" class="mode-desc">{{ mode.description }}</span>
              </div>
            </div>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'

// 模式定义
interface Mode {
  id: string
  name: string
  icon?: string
  description?: string
}

// 可用模式
const availableModes = reactive<Mode[]>([
  {
    id: 'chat',
    name: 'Chat',
    icon: 'ChatDotRound',
    description: '智能对话模式'
  },
  {
    id: 'assistant',
    name: 'Assistant',
    icon: 'User',
    description: '专业助手模式'
  },
  {
    id: 'creative',
    name: 'Creative',
    icon: 'EditPen',
    description: '创意写作模式'
  }
])

// 当前模式
const currentMode = ref<string>('chat')

// 当前模式信息
const currentModeInfo = computed(() => {
  return availableModes.find(m => m.id === currentMode.value)
})

// 下拉菜单处理
const handleDropdownCommand = (modeId: string) => {
  handleModeChange(modeId)
}

// 模式切换处理
const handleModeChange = (modeId: string) => {
  if (modeId === currentMode.value) return
  
  const mode = availableModes.find(m => m.id === modeId)
  if (!mode) return
  
  currentMode.value = modeId
  
  // TODO: 实际的模式切换逻辑
  ElMessage.success(`已切换到 ${mode.name} 模式`)
}

// 暴露给父组件
defineExpose({
  currentMode,
  switchMode: handleModeChange
})
</script>

<style scoped lang="scss">
.mode-selector {
  flex-shrink: 0;
  
  .arrow-icon {
    margin-left: 4px;
    font-size: 12px;
  }
}

.mode-dropdown-menu {
  min-width: 180px;
  max-width: 260px;
}

.mode-item {
  &.is-active {
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
  
  .mode-content {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    
    .mode-icon {
      flex-shrink: 0;
      font-size: 16px;
    }
    
    .mode-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0; // 允许文本缩小
      
      .mode-name {
        font-size: 13px;
        font-weight: 500;
        line-height: 1.4;
        color: var(--el-text-color-primary);
      }
      
      .mode-desc {
        font-size: 11px;
        line-height: 1.3;
        color: var(--el-text-color-secondary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
  
  &:hover .mode-content .mode-info .mode-name {
    color: var(--el-color-primary);
  }
}

// 在活跃状态下的样式优化
.mode-item.is-active .mode-content {
  .mode-icon {
    color: var(--el-color-primary);
  }
  
  .mode-info {
    .mode-name {
      color: var(--el-color-primary);
      font-weight: 600;
    }
    
    .mode-desc {
      color: var(--el-color-primary-light-3);
    }
  }
}
</style>
