<template>
  <div class="settings-content">
    <!-- 设置区域1：爬取设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>爬取设置</h4>
      </div>
      <div class="section-body">
        <el-form label-position="top">
          <el-form-item label="爬取延迟（毫秒）">
            <el-input-number
              v-model="scrapeDelay"
              :min="100"
              :max="5000"
              :step="100"
            />
            <span class="form-hint">每个章节爬取之间的延迟时间</span>
          </el-form-item>
          
          <el-form-item label="最大重试次数">
            <el-input-number
              v-model="maxRetries"
              :min="0"
              :max="10"
            />
            <span class="form-hint">爬取失败时的重试次数</span>
          </el-form-item>
          
          <el-form-item label="自动保存">
            <el-switch v-model="autoSave" />
            <span class="form-hint">爬取完成后自动保存到文件</span>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <!-- 设置区域2：显示设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>显示设置</h4>
      </div>
      <div class="section-body">
        <el-form label-position="top">
          <el-form-item label="章节列表显示数量">
            <el-input-number
              v-model="displayCount"
              :min="10"
              :max="500"
              :step="10"
            />
            <span class="form-hint">章节列表最多显示的章节数量</span>
          </el-form-item>
          
          <el-form-item label="显示URL">
            <el-switch v-model="showUrl" />
            <span class="form-hint">是否在章节列表中显示URL</span>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <!-- 设置区域3：高级设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>高级设置</h4>
      </div>
      <div class="section-body">
        <el-form label-position="top">
          <el-form-item label="User Agent">
            <el-input
              v-model="userAgent"
              type="textarea"
              :rows="2"
              placeholder="留空使用默认值"
            />
            <span class="form-hint">自定义浏览器标识</span>
          </el-form-item>
          
          <el-form-item label="Cookie">
            <el-input
              v-model="cookie"
              type="textarea"
              :rows="2"
              placeholder="留空使用默认值"
            />
            <span class="form-hint">自定义Cookie（需要登录的网站）</span>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="settings-actions">
      <el-button type="primary" @click="handleSave">保存设置</el-button>
      <el-button @click="handleReset">重置为默认</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

/**
 * SettingsContent 组件
 * 小说爬取设置页内容
 */

// 爬取设置
const scrapeDelay = ref(500)
const maxRetries = ref(3)
const autoSave = ref(true)

// 显示设置
const displayCount = ref(100)
const showUrl = ref(true)

// 高级设置
const userAgent = ref('')
const cookie = ref('')

/**
 * 保存设置
 */
const handleSave = (): void => {
  // TODO: 将设置保存到 Store 或持久化存储
  console.log('[SettingsContent] Saving settings:', {
    scrapeDelay: scrapeDelay.value,
    maxRetries: maxRetries.value,
    autoSave: autoSave.value,
    displayCount: displayCount.value,
    showUrl: showUrl.value,
    userAgent: userAgent.value,
    cookie: cookie.value
  })
  
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.success({ message: '设置已保存' })
}

/**
 * 重置为默认值
 */
const handleReset = (): void => {
  scrapeDelay.value = 500
  maxRetries.value = 3
  autoSave.value = true
  displayCount.value = 100
  showUrl.value = true
  userAgent.value = ''
  cookie.value = ''
  
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.info({ message: '已重置为默认设置' })
}
</script>

<style scoped lang="scss">
.settings-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-height: 100%;
  min-width: 320px; // 🔥 设置最小宽度，防止过窄时排版混乱
}

// 设置区域
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
  
  .el-form {
    .el-form-item {
      margin-bottom: 20px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

// 操作按钮
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

