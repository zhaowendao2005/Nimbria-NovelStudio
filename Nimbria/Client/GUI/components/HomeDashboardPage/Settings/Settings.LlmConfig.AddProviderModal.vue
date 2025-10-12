<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">添加提供商</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section>
        <!-- 添加模式切换 -->
        <q-tabs
          v-model="addMode"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
        >
          <q-tab name="quick" label="快捷添加" />
          <q-tab name="custom" label="自定义添加" />
        </q-tabs>

        <q-separator class="q-my-md" />

        <q-tab-panels v-model="addMode" animated>
          <!-- 快捷添加面板 -->
          <q-tab-panel name="quick">
            <div class="quick-add-panel">
              <p class="text-caption text-grey-7">选择常用的提供商快速配置</p>
              
              <q-btn
                outline
                color="primary"
                class="full-width q-mb-sm"
                @click="handleQuickAdd('openai')"
              >
                <div class="quick-btn-content">
                  <q-icon name="dns" size="24px" class="quick-btn-icon" />
                  <span>OpenAI</span>
                </div>
              </q-btn>

              <q-btn
                outline
                color="primary"
                class="full-width q-mb-sm"
                @click="handleQuickAdd('anthropic')"
              >
                <div class="quick-btn-content">
                  <q-icon name="psychology" size="24px" class="quick-btn-icon" />
                  <span>Anthropic</span>
                </div>
              </q-btn>

              <q-btn
                outline
                color="primary"
                class="full-width"
                @click="handleQuickAdd('azure')"
              >
                <div class="quick-btn-content">
                  <q-icon name="cloud" size="24px" class="quick-btn-icon" />
                  <span>Azure OpenAI</span>
                </div>
              </q-btn>
            </div>
          </q-tab-panel>

          <!-- 自定义添加面板 -->
          <q-tab-panel name="custom">
            <q-form @submit="handleSubmit" class="custom-form">
              <q-input
                v-model="form.displayName"
                label="显示名称 *"
                outlined
                dense
                :rules="[val => !!val || '请输入显示名称']"
              />

              <q-input
                v-model="form.id"
                label="Provider ID *"
                outlined
                dense
                hint="唯一标识符，小写字母和连字符"
                :rules="[
                  val => !!val || '请输入Provider ID',
                  val => /^[a-z0-9-]+$/.test(val) || 'ID只能包含小写字母、数字和连字符'
                ]"
              />

              <q-input
                v-model="form.baseUrl"
                label="Base URL *"
                outlined
                dense
                placeholder="https://api.example.com/v1"
                :rules="[
                  val => !!val || '请输入Base URL',
                  val => val.startsWith('http') || 'URL必须以http://或https://开头'
                ]"
              />

              <q-input
                v-model="form.apiKey"
                label="API Key *"
                type="password"
                outlined
                dense
                :rules="[val => !!val || '请输入API Key']"
              />

              <q-input
                v-model="form.description"
                label="描述"
                type="textarea"
                outlined
                dense
                rows="3"
              />

              <div class="form-actions">
                <q-btn
                  label="取消"
                  flat
                  v-close-popup
                />
                <q-btn
                  label="添加"
                  type="submit"
                  color="primary"
                  :loading="loading"
                />
              </div>
            </q-form>
          </q-tab-panel>
        </q-tab-panels>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useSettingsLlmStore } from '@stores/settings'
import { DEFAULT_MODEL_CONFIG } from '@stores/settings'
import { Notify } from 'quasar'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'provider-added': []
}>()

const llmStore = useSettingsLlmStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const addMode = ref<'quick' | 'custom'>('quick')
const loading = ref(false)

const form = ref({
  id: '',
  displayName: '',
  baseUrl: '',
  apiKey: '',
  description: ''
})

// 重置表单
function resetForm() {
  form.value = {
    id: '',
    displayName: '',
    baseUrl: '',
    apiKey: '',
    description: ''
  }
  addMode.value = 'quick'
}

// 监听对话框关闭，重置表单
watch(isOpen, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

// 快捷添加
function handleQuickAdd(type: string) {
  switch (type) {
    case 'openai':
      form.value = {
        id: 'openai',
        displayName: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        description: 'Official OpenAI API'
      }
      break
    case 'anthropic':
      form.value = {
        id: 'anthropic',
        displayName: 'Anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: '',
        description: 'Claude AI by Anthropic'
      }
      break
    case 'azure':
      form.value = {
        id: 'azure-openai',
        displayName: 'Azure OpenAI',
        baseUrl: 'https://YOUR_RESOURCE.openai.azure.com',
        apiKey: '',
        description: 'Azure OpenAI Service'
      }
      break
  }
  
  addMode.value = 'custom'
}

// 提交表单
async function handleSubmit() {
  loading.value = true
  
  try {
    const newProvider = await llmStore.addProvider({
      id: form.value.id,
      name: form.value.id,
      displayName: form.value.displayName,
      description: form.value.description,
      status: 'available',
      apiKey: form.value.apiKey,
      baseUrl: form.value.baseUrl,
      defaultConfig: { ...DEFAULT_MODEL_CONFIG },
      supportedModels: []
    })

    if (newProvider) {
      emit('provider-added')
      isOpen.value = false
    } else {
      Notify.create({
        type: 'negative',
        message: '添加提供商失败',
        position: 'top'
      })
    }
  } catch (error) {
    console.error('Add provider error:', error)
    Notify.create({
      type: 'negative',
      message: `添加失败: ${error instanceof Error ? error.message : '未知错误'}`,
      position: 'top'
    })
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.quick-add-panel {
  padding: 8px 0;
}

.quick-btn-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
  padding: 8px 0;
}

.quick-btn-logo {
  font-size: 24px;
  line-height: 1;
}

.custom-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}
</style>

