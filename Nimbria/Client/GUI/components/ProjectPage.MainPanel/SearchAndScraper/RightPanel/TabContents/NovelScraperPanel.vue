<template>
  <div class="novel-scraper-panel">
    <!-- Toolbar -->
    <div class="novel-toolbar">
      <!-- 左侧：批次选择器 + 模式选择器 -->
      <div class="toolbar-left-group">
        <!-- 批次选择器 -->
        <div class="batch-selector-toolbar">
          <span class="batch-label">批次:</span>
          <el-select
            v-model="selectedBatchId"
            size="small"
            placeholder="选择或创建批次"
            class="batch-select"
            @change="handleBatchChange"
          >
            <el-option
              key="create-new"
              label="➕ 创建新批次"
              value="__create_new__"
            />
            <el-option
              v-for="batch in batches"
              :key="batch.id"
              :label="`${batch.name} (${batch.totalMatched}/${batch.totalScraped})`"
              :value="batch.id"
            />
          </el-select>
          <el-button
            v-if="selectedBatchId && selectedBatchId !== '__create_new__'"
            type="info"
            size="small"
            @click="handleRefreshBatch"
          >
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <!-- 分隔线 -->
        <div class="toolbar-divider"></div>

        <!-- 模式选择器 -->
        <el-select
          v-model="currentMode"
          size="small"
          class="mode-select"
          @change="handleModeChange"
        >
          <el-option
            label="智能模式"
            value="smart"
          />
        </el-select>
      </div>
      
      <!-- 中间：工具按钮组 -->
      <div class="toolbar-tools">
        <div
          class="tool-item"
          :class="{ disabled: !isBatchSelected }"
          @click="handleMatchChapters"
        >
          <el-icon><Aim /></el-icon>
          <span>智能匹配章节列表</span>
        </div>
        
        <div
          class="tool-item"
          :class="{ disabled: !isBatchSelected }"
          @click="handleScrapeChapters"
        >
          <el-icon><Download /></el-icon>
          <span>爬取章节</span>
        </div>
        
        <div
          class="tool-item"
          @click="handleOpenSettings"
        >
          <el-icon><Setting /></el-icon>
          <span>设置</span>
        </div>

        <!-- 内部空白区域撑满 -->
        <div class="toolbar-spacer"></div>
      </div>
    </div>
    
    <!-- 🔥 主内容区 - 改成长页面滚动 -->
    <div class="panel-content">
      <!-- 智能模式内容 -->
      <div v-if="currentMode === 'smart'" class="smart-mode-content">
        <!-- 🔥 章节列表区域 -->
        <div class="content-section chapter-list-section" :class="{ disabled: !isBatchSelected }">
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
              ref="chapterListRef"
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
        width="90%"
        :close-on-click-modal="false"
        :append-to-body="false"
        :modal="true"
        class="chapter-detail-dialog"
      >
        <el-scrollbar max-height="60vh">
          <div class="chapter-detail-content">
            {{ currentChapter?.content || '暂无内容' }}
          </div>
        </el-scrollbar>
      </el-dialog>

      <!-- 🆕 创建批次对话框 -->
      <el-dialog
        v-model="createBatchDialogVisible"
        title="创建新批次"
        width="500px"
        :close-on-click-modal="false"
      >
        <el-form
          ref="batchFormRef"
          :model="batchForm"
          :rules="batchFormRules"
          label-width="80px"
        >
          <el-form-item label="批次名称" prop="name">
            <el-input
              v-model="batchForm.name"
              placeholder="例如：《斗破苍穹》第一卷"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="批次描述" prop="description">
            <el-input
              v-model="batchForm.description"
              type="textarea"
              :rows="3"
              placeholder="可选：添加批次描述"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="createBatchDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreateBatch">创建</el-button>
        </template>
      </el-dialog>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Aim, Download, Setting, Refresh } from '@element-plus/icons-vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useSearchAndScraperStore } from '@stores/projectPage/searchAndScraper'
import { SearchAndScraperService } from '@service/SearchAndScraper'
import { ScraperStorageService } from '@service/SearchAndScraper/scraper-storage.service'
import ChapterListSection from './SmartMode/ChapterListSection.vue'
import ChapterSummarySection from './SmartMode/ChapterSummarySection.vue'
import type { ScrapedChapter, Chapter } from '@stores/projectPage/searchAndScraper/searchAndScraper.types'
import type { NovelBatch, CreateNovelBatchParams, SaveMatchedChaptersResult } from '@service/SearchAndScraper/types'

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

interface Emits {
  (e: 'open-drawer', content: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const store = useSearchAndScraperStore()

// 🔥 ChapterListSection 组件引用
const chapterListRef = ref<InstanceType<typeof ChapterListSection> | null>(null)

// 🔥 从Store获取当前实例的状态（保证多例独立性）
const instance = computed(() => store.getInstance(props.tabId))

// 本地响应式状态（用于UI绑定）
const currentMode = ref<string>('smart')

// 🆕 批次管理状态
const batches = ref<NovelBatch[]>([])
const selectedBatchId = ref<string>('')
const isBatchSelected = computed(() => selectedBatchId.value && selectedBatchId.value !== '__create_new__')

// 🆕 创建批次对话框
const createBatchDialogVisible = ref(false)
const batchFormRef = ref<FormInstance>()
const batchForm = ref<CreateNovelBatchParams>({
  name: '',
  description: ''
})
const batchFormRules: FormRules = {
  name: [
    { required: true, message: '请输入批次名称', trigger: 'blur' },
    { min: 1, max: 50, message: '名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

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

// ==================== 🆕 批次管理方法 ====================

/**
 * 加载批次列表
 */
const loadBatches = async (): Promise<void> => {
  try {
    const projectPath = window.nimbria.getCurrentProjectPath()
    if (!projectPath) {
      console.warn('[NovelScraper] 当前项目路径为空，无法加载批次')
      return
    }

    const result = await window.nimbria.database.searchScraperGetAllNovelBatches({ projectPath })
    if (result.success && result.batches) {
      // 导入 mapBatchRowToBatch 并转换
      const { mapBatchRowToBatch } = await import('@service/SearchAndScraper/types')
      batches.value = result.batches.map(mapBatchRowToBatch)
      console.log('[NovelScraper] 批次列表加载成功:', batches.value.length, '个批次')
    } else {
      console.warn('[NovelScraper] 加载批次失败:', result.error)
    }
  } catch (error) {
    console.error('[NovelScraper] 加载批次列表失败:', error)
  }
}

/**
 * 批次选择改变
 */
const handleBatchChange = (value: string): void => {
  if (value === '__create_new__') {
    // 打开创建对话框
    createBatchDialogVisible.value = true
    // 清空表单
    batchForm.value = { name: '', description: '' }
    // 重置选择
    selectedBatchId.value = ''
  } else {
    selectedBatchId.value = value
    console.log('[NovelScraper] 批次已切换:', value)
    // 🆕 加载批次数据
    void loadBatchData(value)
  }
}

/**
 * 加载批次数据（匹配章节列表）
 */
const loadBatchData = async (batchId: string): Promise<void> => {
  try {
    const projectPath = window.nimbria.getCurrentProjectPath()
    if (!projectPath) {
      console.warn('[NovelScraper] 当前项目路径为空，无法加载批次数据')
      return
    }

    // 加载匹配章节
    const matchedResult = await window.nimbria.database.searchScraperGetMatchedChapters({ 
      projectPath, 
      batchId 
    })

    if (matchedResult.success && matchedResult.chapters) {
      // 导入类型转换函数
      const { mapMatchedChapterRowToChapter } = await import('@service/SearchAndScraper/types')
      const chapters = matchedResult.chapters.map(mapMatchedChapterRowToChapter)
      
      // 转换为 store 需要的格式（包含id）
      const matchedChapters = chapters.map(ch => ({
        id: ch.id,  // 🔥 包含ID用于爬取时关联
        title: ch.title,
        url: ch.url
      }))
      
      store.updateInstance(props.tabId, { matchedChapters })
      
      console.log('[NovelScraper] 匹配章节加载成功:', matchedChapters.length, '个章节')
    } else {
      console.warn('[NovelScraper] 加载匹配章节失败:', matchedResult.error)
      store.updateInstance(props.tabId, { matchedChapters: [] })
    }

    // 🔥 加载已爬取章节（Iteration 3）
    const scrapedResult = await ScraperStorageService.getScrapedChapters(projectPath, batchId)
    
    if (scrapedResult.success && scrapedResult.chapters) {
      const { mapScrapedChapterRowToChapter } = await import('@service/SearchAndScraper/types')
      const scrapedChapters = scrapedResult.chapters.map(mapScrapedChapterRowToChapter)
      
      // 转换为store格式
      const formattedChapters = scrapedChapters.map(ch => ({
        title: ch.title,
        content: ch.content,
        summary: ch.summary || '',
        url: ch.url
      }))
      
      store.updateInstance(props.tabId, { scrapedChapters: formattedChapters })
      
      console.log('[NovelScraper] 已爬取章节加载成功:', formattedChapters.length, '个章节')
    } else {
      console.warn('[NovelScraper] 加载已爬取章节失败:', scrapedResult.error)
      store.updateInstance(props.tabId, { scrapedChapters: [] })
    }
  } catch (error) {
    console.error('[NovelScraper] 加载批次数据失败:', error)
    // 清空章节列表
    store.updateInstance(props.tabId, { matchedChapters: [] })
  }
}

/**
 * 创建批次
 */
const handleCreateBatch = async (): Promise<void> => {
  if (!batchFormRef.value) return
  
  try {
    const valid = await batchFormRef.value.validate()
    if (!valid) return

    const projectPath = window.nimbria.getCurrentProjectPath()
    if (!projectPath) {
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.error({ message: '未找到项目路径' })
      return
    }

    // 将 ref 对象转换为纯对象
    const batchData: { name: string; description?: string } = {
      name: batchForm.value.name
    }
    if (batchForm.value.description) {
      batchData.description = batchForm.value.description
    }

    const result = await window.nimbria.database.searchScraperCreateNovelBatch({
      projectPath,
      data: batchData
    })

    if (result.success && result.batchId) {
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.success({ message: '批次创建成功' })
      createBatchDialogVisible.value = false
      // 重新加载批次列表
      await loadBatches()
      // 自动选择新创建的批次
      selectedBatchId.value = result.batchId
    } else {
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.error({ message: result.error || '创建批次失败' })
    }
  } catch (error) {
    console.error('[NovelScraper] 创建批次失败:', error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '创建批次失败' })
  }
}

/**
 * 刷新批次信息
 */
const handleRefreshBatch = async (): Promise<void> => {
  await loadBatches()
  // @ts-expect-error - ElMessage类型定义问题
  ElMessage.success({ message: '批次信息已刷新' })
}

// ==================== 原有方法 ====================

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
  // 🆕 检查是否选择了批次
  if (!isBatchSelected.value) {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.warning({ message: '请先选择或创建一个批次' })
    return
  }

  try {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.info({ message: '正在智能匹配章节列表...' })
    
    // 🆕 获取当前BrowserView的URL
    const navState = await SearchAndScraperService.getNavigationState(props.tabId)
    const sourcePageUrl = navState.currentUrl
    
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
      
      // 🆕 保存到数据库并获取完整数据（包含id）
      const projectPath = window.nimbria.getCurrentProjectPath()
      if (projectPath && selectedBatchId.value) {
        const saveResult = await window.nimbria.database.searchScraperSaveMatchedChapters({
          projectPath,
          batchId: selectedBatchId.value,
          chapters: chapters,
          sourcePageUrl: sourcePageUrl
        }) as SaveMatchedChaptersResult
        
        if (!saveResult.success) {
          console.error('[NovelScraper] 保存章节到数据库失败:', saveResult.error)
          // 保存失败时使用原始数据（没有id）
          store.updateInstance(props.tabId, { matchedChapters: chapters.map(ch => ({ ...ch, id: '' })) })
        } else if (saveResult.chapters) {
          // 🔥 使用返回的完整数据（包含id）更新store
          const matchedChaptersWithId = saveResult.chapters.map(ch => ({
            id: ch.id,
            title: ch.title,
            url: ch.url
          }))
          store.updateInstance(props.tabId, { matchedChapters: matchedChaptersWithId })
          console.log('[NovelScraper] 章节已保存到数据库，已更新store（包含id）')
        }
      } else {
        // 未选择批次或项目路径为空，直接使用原始数据
        store.updateInstance(props.tabId, { matchedChapters: chapters.map(ch => ({ ...ch, id: '' })) })
      }
      
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
 * 爬取章节（路由器）
 */
const handleScrapeChapters = async (): Promise<void> => {
  // 🆕 检查是否选择了批次
  if (!isBatchSelected.value) {
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.warning({ message: '请先选择或创建一个批次' })
    return
  }

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
  
  // 🔥 获取要爬取的章节列表
  let chaptersToScrape = matchedChapters.value
  
  // 🔥 检查是否启用了选择模式
  const listComponent = chapterListRef.value
  if (listComponent) {
    const isSelectModeEnabled = listComponent.selectMode
    
    if (isSelectModeEnabled) {
      const selectedChapters = listComponent.getSelectedChapters()
      
      if (selectedChapters.length === 0) {
        // @ts-expect-error - ElMessage类型定义问题
        ElMessage.warning({ message: '请先选择要爬取的章节' })
        return
      }
      
      chaptersToScrape = selectedChapters
      console.log(`[NovelScraper ${props.tabId}] 选择模式：将爬取 ${chaptersToScrape.length} 个选中章节`)
    } else {
      console.log(`[NovelScraper ${props.tabId}] 普通模式：将爬取所有 ${chaptersToScrape.length} 个章节`)
    }
  }
  
  // 🚀 根据爬取模式选择不同的策略
  // 🔥 重新从 store 获取最新的 instance 状态
  const currentInstance = store.getInstance(props.tabId)
  if (!currentInstance) {
    console.error(`[NovelScraper ${props.tabId}] Instance not found!`)
    return
  }
  
  const scrapeMode = currentInstance.scrapeMode
  console.log(`[NovelScraper ${props.tabId}] 当前爬取模式: ${scrapeMode}`)
  console.log(`[NovelScraper ${props.tabId}] 轻量模式配置:`, currentInstance.lightModeConfig)
  
  if (scrapeMode === 'light') {
    // 🟡 轻量模式
    await scrapeLightMode(chaptersToScrape)
  } else {
    // 🔵 全浏览器模式
    await scrapeBrowserMode(chaptersToScrape)
  }
}

/**
 * 全浏览器模式爬取（Iteration 3 - 对接存储服务）
 */
const scrapeBrowserMode = async (chaptersToScrape: Chapter[]): Promise<void> => {
  
  try {
    store.updateInstance(props.tabId, { 
      isScrapingInProgress: true,
      scrapingProgress: {
        current: 0,
        total: chaptersToScrape.length,
        currentChapter: ''
      }
    })
    
    let successCount = 0
    const startTime = Date.now()
    
    for (let i = 0; i < chaptersToScrape.length; i++) {
      const chapter = chaptersToScrape[i]
      
      if (!chapter) {
        continue
      }
      
      // 更新进度
      store.updateInstance(props.tabId, {
        scrapingProgress: {
          current: i + 1,
          total: chaptersToScrape.length,
          currentChapter: chapter.title
        }
      })
      
      try {
        const chapterStartTime = Date.now()
        const result = await SearchAndScraperService.scrapeChapter(props.tabId, chapter.url)
        const scrapeDuration = Date.now() - chapterStartTime
        
        if (result.success && result.chapter && result.chapter.title && result.chapter.content) {
          // 🔥 保存到数据库（使用存储服务）
          const projectPath = window.nimbria.getCurrentProjectPath()
          if (!projectPath) continue
          
          const saveResult = await ScraperStorageService.saveScrapedChapter(
            projectPath,
            {
              matchedChapterId: chapter.id,  // 需要从matched_chapters获取ID
              batchId: selectedBatchId.value!,
              title: result.chapter.title,
              url: chapter.url,
              content: result.chapter.content,
              summary: ScraperStorageService.generateSummary(result.chapter.content),
              scrapeDuration
            }
          )
          
          if (saveResult.success) {
            successCount++
            console.log(`[NovelScraper ${props.tabId}] Chapter saved to database:`, chapter.title)
          } else {
            console.error(`[NovelScraper ${props.tabId}] Failed to save chapter:`, saveResult.error)
          }
        }
        
        // 延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        console.error(`[NovelScraper ${props.tabId}] Failed to scrape chapter:`, chapter.title, error)
      }
    }
    
    const totalTime = Date.now() - startTime
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.success({ message: `爬取完成！成功爬取 ${successCount} 个章节，耗时 ${(totalTime / 1000).toFixed(1)}s` })
    console.log(`[NovelScraper ${props.tabId}] Scraping completed: ${successCount}/${chaptersToScrape.length} chapters`)
    
    // 🔥 刷新批次数据
    if (selectedBatchId.value) {
      await loadBatchData(selectedBatchId.value)
    }
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

/**
 * 轻量模式爬取
 */
const scrapeLightMode = async (chaptersToScrape: Chapter[]): Promise<void> => {
  // 🔥 实时获取 instance
  const currentInstance = store.getInstance(props.tabId)
  if (!currentInstance) return
  
  try {
    // 1. 检查是否已学习选择器
    if (!currentInstance.lightModeConfig.selectorLearned) {
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.info({ message: '正在学习内容选择器...' })
      
      // 使用第一个章节学习选择器
      const firstChapter = chaptersToScrape[0]
      if (!firstChapter) {
        // @ts-expect-error - ElMessage类型定义问题
        ElMessage.error({ message: '章节列表为空' })
        return
      }
      
      const selectorResult = await SearchAndScraperService.learnContentSelector(
        props.tabId,
        firstChapter.url
      )
      
      if (!selectorResult.success || !selectorResult.selector) {
        // @ts-expect-error - ElMessage类型定义问题
        ElMessage.error({ message: '选择器学习失败，请尝试全浏览器模式' })
        return
      }
      
      // 保存学习到的选择器
      store.setContentSelector(props.tabId, selectorResult.selector)
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.success({ message: `已学习选择器: ${selectorResult.selector}` })
    }
    
    // 2. 开始并行爬取
    store.updateInstance(props.tabId, { 
      isScrapingInProgress: true,
      scrapingProgress: {
        current: 0,
        total: chaptersToScrape.length,
        currentChapter: '正在准备...'
      }
    })
    
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.info({ message: `开始轻量模式爬取 ${chaptersToScrape.length} 个章节...` })
    
    // 🔥 转换为纯 JSON 对象，避免 IPC 序列化错误
    const plainChapters = chaptersToScrape.map(ch => ({
      title: ch.title,
      url: ch.url
    }))
    
    const lightModeOptions: {
      selector: string
      parallelCount: number
      timeout: number
      urlPrefix?: string
    } = {
      selector: currentInstance.lightModeConfig.contentSelector!,
      parallelCount: currentInstance.lightModeConfig.parallelCount,
      timeout: currentInstance.lightModeConfig.requestTimeout * 1000
    }
    
    if (urlPrefixEnabled.value && urlPrefix.value) {
      lightModeOptions.urlPrefix = urlPrefix.value
    }
    
    const result = await SearchAndScraperService.scrapeChaptersLight(
      props.tabId,
      plainChapters,
      lightModeOptions
    )
    
    if (result.success && result.results) {
      // 🔥 批量保存到数据库（使用存储服务）
      const chaptersToSave = result.results
        .filter(r => r.success && r.content)
        .map(r => {
          // 找到对应的matched_chapter
          const matchedChapter = chaptersToScrape.find(ch => ch.url === r.chapter.url)
          return {
            matchedChapterId: matchedChapter?.id || '',
            batchId: selectedBatchId.value!,
            title: r.chapter.title,
            url: r.chapter.url,
            content: r.content!,
            summary: ScraperStorageService.generateSummary(r.content!),
            scrapeDuration: 1000  // 轻量模式没有单独计时，使用默认值
          }
        })
      
      const projectPath = window.nimbria.getCurrentProjectPath()
      if (!projectPath) {
        // @ts-expect-error - ElMessage类型定义问题
        ElMessage.error({ message: '未找到项目路径' })
        return
      }
      
      const saveResult = await ScraperStorageService.batchSaveScrapedChapters(
        projectPath,
        chaptersToSave
      )
      
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.success({ 
        message: `爬取完成！成功爬取 ${saveResult.successCount}/${chaptersToScrape.length} 章，已保存到数据库` 
      })
      console.log(`[NovelScraper ${props.tabId}] Light mode scrape completed:`, saveResult)
      
      // 🔥 刷新批次数据
      if (selectedBatchId.value) {
        await loadBatchData(selectedBatchId.value)
      }
    } else {
      // @ts-expect-error - ElMessage类型定义问题
      ElMessage.error({ message: result.message || '爬取失败' })
    }
    
  } catch (error) {
    console.error(`[NovelScraper ${props.tabId}] Light mode scrape error:`, error)
    // @ts-expect-error - ElMessage类型定义问题
    ElMessage.error({ message: '爬取过程中发生错误' })
  } finally {
    store.updateInstance(props.tabId, { 
      isScrapingInProgress: false,
      scrapingProgress: null
    })
  }
}

/**
 * 打开设置抽屉
 */
const handleOpenSettings = (): void => {
  emit('open-drawer', 'settings')
  console.log(`[NovelScraper ${props.tabId}] Opening settings drawer`)
}

// 🔥 生命周期：挂载时记录日志并加载批次列表
onMounted(() => {
  console.log(`[NovelScraper ${props.tabId}] Mounted`, {
    urlPrefix: urlPrefix.value,
    matchedChapters: matchedChapters.value.length,
    scrapedChapters: scrapedChapters.value.length
  })
  
  // 🆕 加载批次列表
  void loadBatches()
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
  gap: 2px;
  padding: 0px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  flex-shrink: 0;
  height: 48px; // 固定高度
}

// 左侧分组：批次选择器 + 模式选择器
.toolbar-left-group {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
  flex-shrink: 0; // 不收缩
  padding: 0 8px; // 添加左右内边距
}

// 批次选择器
.batch-selector-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .batch-label {
    font-size: 14px;
    color: var(--el-text-color-regular);
    font-weight: 500;
    white-space: nowrap;
  }

  .batch-select {
    width: 120px; // 与模式选择器一致
  }
}

// 模式选择器
.mode-select {
  width: 120px;
}

// 分隔线
.toolbar-divider {
  width: 1px;
  height: 24px;
  background: var(--el-border-color);
  flex-shrink: 0;
}

// 中间工具按钮组
.toolbar-tools {
  display: flex;
  gap: 6px;
  padding: 3px 6px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  height: 32px; // 固定高度
  flex: 1; // 自动伸缩填满剩余空间
  align-items: center;
  margin-left: 8px; // 与左侧分组的间距
  min-width: 0; // 允许收缩

  // 内部空白撑满
  .toolbar-spacer {
    flex: 1 1 auto; // 可伸缩
    min-width: 0;
  }
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
  
  // 🆕 禁用状态
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
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
  
  // 🔥 为每个区域设置固定高度（改为 height 使其固定）
  &.chapter-list-section {
    height: 800px; // 🔥 固定高度
    
    // 🆕 禁用状态
    &.disabled {
      opacity: 0.6;
      pointer-events: none;
    }
  }
  
  &.chapter-summary-section {
    height: 800px; // 🔥 固定高度
  }
  
  &.progress-section {
    height: 150px; // 🔥 固定高度
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
  overflow: auto; // 🔥 改为 auto，让溢出内容可以滚动
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
