<template>
  <!-- 使用 Headless UI 的 Dialog + Combobox -->
  <TransitionRoot :show="commandStore.isOpen" as="template">
    <Dialog as="div" class="command-palette-dialog" @close="commandStore.close()">
      <!-- 遮罩层 -->
      <TransitionChild
        enter="duration-200 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-150 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="dialog-overlay" />
      </TransitionChild>

      <!-- 对话框容器 -->
      <div class="dialog-container">
        <TransitionChild
          enter="duration-200 ease-out"
          enter-from="opacity-0 scale-95"
          enter-to="opacity-100 scale-100"
          leave="duration-150 ease-in"
          leave-from="opacity-100 scale-100"
          leave-to="opacity-0 scale-95"
        >
          <DialogPanel class="palette-panel">
            <Combobox v-model="selected" @update:modelValue="handleExecute">
              <!-- 输入框 -->
              <div class="palette-input-wrapper">
                <el-icon class="search-icon"><Search /></el-icon>
                <ComboboxInput
                  class="palette-input"
                  placeholder="输入命令..."
                  @change="query = $event.target.value"
                />
              </div>

              <!-- 命令列表 -->
              <ComboboxOptions class="palette-options">
                <div v-if="filteredCommands.length === 0" class="empty-state">
                  未找到命令
                </div>
                
                <ComboboxOption
                  v-for="command in filteredCommands"
                  :key="command.id"
                  :value="command"
                  v-slot="{ active }"
                >
                  <li :class="['command-item', { 'active': active }]">
                    <div class="command-main">
                      <el-icon v-if="command.icon" class="command-icon">
                        <component :is="command.icon" />
                      </el-icon>
                      <span class="command-label">{{ command.label }}</span>
                    </div>
                    <div class="command-meta">
                      <span v-if="command.category" class="command-category">
                        {{ categoryLabels[command.category] || command.category }}
                      </span>
                      <span v-if="command.shortcut" class="command-shortcut">
                        {{ command.shortcut }}
                      </span>
                    </div>
                  </li>
                </ComboboxOption>
              </ComboboxOptions>
            </Combobox>
          </DialogPanel>
        </TransitionChild>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  Combobox,
  ComboboxInput,
  ComboboxOptions,
  ComboboxOption,
} from '@headlessui/vue'
import { Search } from '@element-plus/icons-vue'
import { useCommandPaletteStore } from '@/stores/projectPage/commandPalette'
import type { Command, CommandCategory } from '@/stores/projectPage/commandPalette/types'

const commandStore = useCommandPaletteStore()
const query = ref('')
const selected = ref<Command | null>(null)

// 分类标签映射
const categoryLabels: Record<CommandCategory, string> = {
  view: '视图',
  file: '文件',
  edit: '编辑',
  navigate: '导航',
  tools: '工具',
  custom: '自定义'
}

// 过滤命令（仅UI逻辑）
const filteredCommands = computed(() => {
  const q = query.value.toLowerCase()
  if (!q) return commandStore.availableCommands
  
  return commandStore.availableCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(q) ||
    cmd.keywords?.some(k => k.toLowerCase().includes(q))
  )
})

// 执行命令（调用外部提供的action）
const handleExecute = (command: Command | null) => {
  if (command) {
    void commandStore.executeCommand(command.id)
    selected.value = null
    query.value = ''
  }
}
</script>

<style scoped lang="scss">
@import './CommandPalette.scss';
</style>

