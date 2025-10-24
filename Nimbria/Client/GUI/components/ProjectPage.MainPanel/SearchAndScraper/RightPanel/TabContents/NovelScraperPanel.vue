<template>
  <div class="novel-scraper-panel">
    <!-- Toolbar -->
    <div class="novel-toolbar">
      <!-- 模式选择器 -->
      <el-select
        v-model="currentMode"
        size="small"
        style="width: 120px"
        @change="handleModeChange"
      >
        <el-option
          label="智能模式"
          value="smart"
        />
      </el-select>
      
      <!-- 工具栏 -->
      <div class="toolbar-tools">
        <div
          class="tool-item"
          @click="handleMatchChapters"
        >
          <el-icon><Aim /></el-icon>
          <span>智能匹配章节列表</span>
        </div>
        
        <div
          class="tool-item"
          @click="handleScrapeChapters"
        >
          <el-icon><Download /></el-icon>
          <span>爬取章节</span>
        </div>
      </div>
    </div>
    
    <!-- 🔥 主内容区 - 改成长页面滚动 -->
    <div class="panel-content">
      <!-- 智能模式内容 -->
      <div v-if="currentMode === 'smart'" class="smart-mode-content">
        <!-- 🔥 章节列表区域 -->
        <div class="content-section chapter-list-section">
          <div class="section-header">
            <h3>匹配章节列表</h3>
            <div class="header-tools">
              <el-switch
                v-model="urlPrefixEnabled"
                size="small"
                active-text="URL前缀"
              />
              <el-input
                v-if="urlPrefixEnabled"
                v-model="urlPrefix"
                size="small"
                placeholder="https://example.com"
                style="width: 200px; margin-left: 8px"
              />
            </div>
          </div>
          <div class="section-body">
            <ChapterListSection
              :chapters="matchedChapters"
              :url-prefix="urlPrefix"
              :url-prefix-enabled="urlPrefixEnabled"
              @update:url-prefix="urlPrefix = $event"
              @update:url-prefix-enabled="urlPrefixEnabled = $event"
            />
          </div>
        </div>
        
        <!-- 🔥 爬取进度区域（仅在爬取时显示） -->
        <div v-if="isScrapingInProgress" class="content-section progress-section">
          <div class="section-header">
            <h3>爬取进度</h3>
          </div>
          <div class="section-body">
            <el-progress
              :percentage="scrapingProgressPercent"
              :format="() => `${instance?.scrapingProgress?.current || 0} / ${instance?.scrapingProgress?.total || 0}`"
            />
            <p class="current-chapter">当前: {{ instance?.scrapingProgress?.currentChapter || '' }}</p>
          </div>
        </div>
        
        <!-- 🔥 章节摘要区域 -->
        <div class="content-section chapter-summary-section">
          <div class="section-header">
            <h3>已爬取章节</h3>
            <span class="chapter-count">共 {{ scrapedChapters.length }} 章</span>
          </div>
          <div class="section-body">
            <ChapterSummarySection
              :chapters="scrapedChapters"
              @view-detail="handleViewDetail"
            />
          </div>
        </div>
      </div>
    </div>
    
    <!-- 🔥 使用Teleport将对话框传送到右栏容器，避免被BrowserView覆盖 -->
    <teleport to="#right-panel-dialog-container">
      <el-dialog
        v-model="detailDialogVisible"
        :title="currentChapter?.title || '章节详情'"
        width="85%"
        :close-on-click-modal="false"
        :append-to-body="false"
        class="chapter-detail-dialog"
      >
        <el-scrollbar max-height="600px">
          <div class="chapter-detail-content">
            {{ currentChapter?.content || '暂无内容' }}
          </div>
        </el-scrollbar>
      </el-dialog>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Aim, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import { SearchAndScraperService } from '@service/SearchAndScraper'
import ChapterListSection from './SmartMode/ChapterListSection.vue'
import ChapterSummarySection from './SmartMode/ChapterSummarySection.vue'
import type { ScrapedChapter } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'

/**
 * NovelScraperPanel 组件
 * 小说可视化爬取工具
 * 
 * 🔥 多例模式：
 * - 每个 tabId 对应一个独立的状态实例
 * - 状态存储在 Store 中，切换标签页时保持状态
 * - 组件挂载/卸载时自动恢复/保存状态
 */

interface Props {
  tabId: string
}

const props = defineProps<Props>()
const store = useSearchAndScraperStore()

// 🔥 从Store获取当前实例的状态（保证多例独立性）
const instance = computed(() => store.getInstance(props.tabId))

// 本地响应式状态（用于UI绑定）
const currentMode = ref<string>('smart')

// 🔥 使用computed双向绑定到Store，确保状态同步
const urlPrefix = computed({
  get: () => instance.value?.urlPrefix ?? '',
  set: (value) => store.updateInstance(props.tabId, { urlPrefix: value })
})

const urlPrefixEnabled = computed({
  get: () => instance.value?.urlPrefixEnabled ?? false,
  set: (value) => store.updateInstance(props.tabId, { urlPrefixEnabled: value })
})

const matchedChapters = computed(() => instance.value?.matchedChapters ?? [])
const scrapedChapters = computed(() => instance.value?.scrapedChapters ?? [])
const isScrapingInProgress = computed(() => instance.value?.isScrapingInProgress ?? false)

// 🔥 计算爬取进度百分比
const scrapingProgressPercent = computed(() => {
  if (!instance.value?.scrapingProgress) return 0
  const { current, total } = instance.value.scrapingProgress
  return total > 0 ? Math.round((current / total) * 100) : 0
})

// 对话框状态（仅UI，不需要持久化）
const detailDialogVisible = ref(false)
const currentChapter = ref<ScrapedChapter | null>(null)

/**
 * 模式切换
 */
const handleModeChange = (mode: string): void => {
  console.log(`[NovelScraper ${props.tabId}] Mode changed:`, mode)
}

/**
 * 智能匹配章节列表
 */
const handleMatchChapters = async (): Promise<void> => {
  try {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.info({ message: '正在智能匹配章节列表...' })
    
    const result = await SearchAndScraperService.extractChapters(props.tabId)
    
    if (result.success && result.chapters) {
      // 处理URL前缀拼接
      let chapters = result.chapters.map(ch => ({
        title: ch.title,
        url: ch.url
      }))
      
      // 如果启用了URL前缀且链接是相对路径
      if (urlPrefixEnabled.value && urlPrefix.value) {
        chapters = chapters.map(ch => ({
          ...ch,
          url: ch.url.startsWith('http') ? ch.url : `${urlPrefix.value}${ch.url}`
        }))
      }
      
      store.updateInstance(props.tabId, { matchedChapters: chapters })
      
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.success({ message: `成功匹配到 ${chapters.length} 个章节` })
      console.log(`[NovelScraper ${props.tabId}] Matched ${chapters.length} chapters`)
    } else {
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.warning({ message: result.error || '未找到章节' })
    }
  } catch (error) {
    console.error(`[NovelScraper ${props.tabId}] Match chapters failed:`, error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '匹配章节失败' })
  }
}

/**
 * 爬取章节
 */
const handleScrapeChapters = async (): Promise<void> => {
  if (matchedChapters.value.length === 0) {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.warning({ message: '请先匹配章节列表' })
    return
  }
  
  if (isScrapingInProgress.value) {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.warning({ message: '正在爬取中，请稍候...' })
    return
  }
  
  try {
    store.updateInstance(props.tabId, { 
      isScrapingInProgress: true,
      scrapingProgress: {
        current: 0,
        total: matchedChapters.value.length,
        currentChapter: ''
      }
    })
    
    const scraped: ScrapedChapter[] = []
    
    for (let i = 0; i < matchedChapters.value.length; i++) {
      const chapter = matchedChapters.value[i]
      
      if (!chapter) {
        continue
      }
      
      // 更新进度
      store.updateInstance(props.tabId, {
        scrapingProgress: {
          current: i + 1,
          total: matchedChapters.value.length,
          currentChapter: chapter.title
        }
      })
      
      try {
        const result = await SearchAndScraperService.scrapeChapter(props.tabId, chapter.url)
        
        if (result.success && result.chapter && result.chapter.title && result.chapter.content) {
          scraped.push({
            title: result.chapter.title,
            content: result.chapter.content,
            summary: result.chapter.summary || '',
            url: chapter.url
          })
          
          // 实时更新已爬取的章节
          store.updateInstance(props.tabId, { scrapedChapters: [...scraped] })
        }
        
        // 延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[NovelScraper ${props.tabId}] Failed to scrape chapter:`, chapter.title, error)
      }
    }
    
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: `爬取完成！共爬取 ${scraped.length} 个章节` })
    console.log(`[NovelScraper ${props.tabId}] Scraping completed: ${scraped.length} chapters`)
  } catch (error) {
    console.error(`[NovelScraper ${props.tabId}] Scrape chapters failed:`, error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '爬取失败' })
  } finally {
    store.updateInstance(props.tabId, { 
      isScrapingInProgress: false,
      scrapingProgress: null
    })
  }
}

/**
 * 查看详情
 */
const handleViewDetail = (chapter: ScrapedChapter): void => {
  currentChapter.value = chapter
  detailDialogVisible.value = true
}

// 🔥 生命周期：挂载时记录日志
onMounted(() => {
  console.log(`[NovelScraper ${props.tabId}] Mounted`, {
    urlPrefix: urlPrefix.value,
    matchedChapters: matchedChapters.value.length,
    scrapedChapters: scrapedChapters.value.length
  })
})

// 🔥 生命周期：卸载时记录日志（状态已经自动同步到Store）
onUnmounted(() => {
  console.log(`[NovelScraper ${props.tabId}] Unmounted`, {
    urlPrefix: urlPrefix.value,
    matchedChapters: matchedChapters.value.length,
    scrapedChapters: scrapedChapters.value.length
  })
})
</script>

<style scoped lang="scss">
.novel-scraper-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color-page);
  overflow: hidden;
}

// ==================== Toolbar ====================
.novel-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
}

.toolbar-tools {
  flex: 1;
  display: flex;
  gap: 6px;
  padding: 3px 6px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  
  &:hover {
    border-color: var(--el-color-primary);
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  
  &:active {
    transform: translateY(1px);
  }
}

// ==================== 🔥 长页面布局（参考DocParser） ====================
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: auto; // 🔥 关键：让整个内容区可滚动
  min-height: 0;
}

.smart-mode-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

// ==================== 🔥 卡片区域（参考DocParser） ====================
.content-section {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  
  // 🔥 为每个区域设置固定高度
  &.chapter-list-section {
    min-height: 500px;
  }
  
  &.chapter-summary-section {
    min-height: 600px;
  }
  
  &.progress-section {
    min-height: 150px;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color-page);
  flex-shrink: 0;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }
  
  .header-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .chapter-count {
    font-size: 14px;
    color: var(--el-text-color-secondary);
  }
}

.section-body {
  flex: 1;
  padding: 0;
  overflow: hidden; // 🔥 让子组件自己处理滚动
  min-height: 0;
}

// ==================== 🔥 进度区域特殊样式 ====================
.progress-section {
  .section-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px; // 进度区域需要padding
  }
  
  .current-chapter {
    margin: 0;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }
}

// ==================== 详情对话框 ====================
.chapter-detail-content {
  font-size: 14px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
