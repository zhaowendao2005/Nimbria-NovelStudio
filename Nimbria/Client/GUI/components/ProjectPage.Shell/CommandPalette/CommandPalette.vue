<template>
  <!-- Headless UI Dialog 作为遮罩 -->
  <TransitionRoot :show="commandStore.isOpen" as="template">
    <Dialog as="div" class="command-palette-overlay" @close="commandStore.close()">
      <!-- 背景遮罩 -->
      <TransitionChild
        enter="ease-out duration-200"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-150"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="dialog-backdrop" />
      </TransitionChild>

      <!-- 面板容器（居中，从上往下） -->
      <div class="dialog-positioner">
        <TransitionChild
          enter="ease-out duration-200"
          enter-from="opacity-0 scale-95 -translate-y-4"
          enter-to="opacity-100 scale-100 translate-y-0"
          leave="ease-in duration-150"
          leave-from="opacity-100 scale-100 translate-y-0"
          leave-to="opacity-0 scale-95 -translate-y-4"
        >
          <DialogPanel class="palette-container">
            <!-- 搜索输入框 -->
            <div class="palette-header">
              <el-icon class="search-icon"><Search /></el-icon>
              <input
                ref="searchInputRef"
                v-model="query"
                type="text"
                class="palette-search-input"
                placeholder="按名称搜索命令..."
                @keydown.down.prevent="navigateDown"
                @keydown.up.prevent="navigateUp"
                @keydown.enter.prevent="executeSelected"
                @keydown.esc.prevent="commandStore.close()"
              />
            </div>

            <!-- 命令列表 -->
            <div v-if="filteredCommands.length > 0" class="palette-list">
              <div
                v-for="(command, index) in filteredCommands"
                :key="command.id"
                :class="['command-item', { 'active': index === selectedIndex }]"
                @click="handleExecute(command)"
                @mouseenter="selectedIndex = index"
              >
                <div class="command-main">
                  <el-icon v-if="command.icon" class="command-icon">
                    <component :is="command.icon" />
                  </el-icon>
                  <span class="command-label">{{ command.label }}</span>
                </div>
                <div class="command-meta">
                  <span v-if="command.category" class="command-category">
                    {{ categoryLabels[command.category] }}
                  </span>
                  <kbd v-if="command.shortcut" class="command-shortcut">
                    {{ command.shortcut }}
                  </kbd>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
              <p>未找到匹配的命令</p>
            </div>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
} from '@headlessui/vue'
import { Search } from '@element-plus/icons-vue'
import { useCommandPaletteStore } from '@stores/projectPage/commandPalette'
import type { Command, CommandCategory } from '@stores/projectPage/commandPalette/types'

const commandStore = useCommandPaletteStore()
const query = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)

// 分类标签
const categoryLabels: Record<CommandCategory, string> = {
  view: '视图',
  file: '文件',
  edit: '编辑',
  navigate: '导航',
  tools: '工具',
  custom: '自定义'
}

// 过滤命令
const filteredCommands = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return commandStore.availableCommands
  
  return commandStore.availableCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(q) ||
    cmd.keywords?.some(k => k.toLowerCase().includes(q))
  )
})

// 键盘导航
const navigateDown = () => {
  if (filteredCommands.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % filteredCommands.value.length
}

const navigateUp = () => {
  if (filteredCommands.value.length === 0) return
  selectedIndex.value = selectedIndex.value === 0 
    ? filteredCommands.value.length - 1 
    : selectedIndex.value - 1
}

const executeSelected = () => {
  const command = filteredCommands.value[selectedIndex.value]
  if (command) handleExecute(command)
}

// 执行命令
const handleExecute = (command: Command) => {
  void commandStore.executeCommand(command.id)
  query.value = ''
  selectedIndex.value = 0
}

// 监听打开状态，自动聚焦
watch(() => commandStore.isOpen, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  } else {
    query.value = ''
    selectedIndex.value = 0
  }
})
</script>

<style scoped lang="scss">
@import './CommandPalette.scss';
</style>

