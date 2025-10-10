<template>
  <div ref="viewerContainer" class="markdown-viewer" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useMarkdownStore } from '@stores/projectPage/Markdown'

interface Props {
  content: string
}

const props = defineProps<Props>()

const viewerContainer = ref<HTMLElement>()
const renderedHtml = ref('')

// 🔥 获取 Markdown Store（用于大纲跳转）
const markdownStore = useMarkdownStore()

// 渲染Markdown为HTML
const renderMarkdown = async (markdown: string) => {
  if (!markdown) {
    renderedHtml.value = ''
    return
  }

  // 使用Vditor的静态方法将Markdown转为HTML
  const html = await Vditor.md2html(markdown, {
    markdown: {
      toc: true,
      mark: true,
      footnotes: true,
      autoSpace: true
    },
    math: {
      engine: 'KaTeX'
    }
  })

  renderedHtml.value = html
  
  // 等待DOM更新后处理特殊渲染
  await nextTick()
  processSpecialContent()
}

// 处理特殊内容（代码高亮、数学公式等）
const processSpecialContent = () => {
  if (!viewerContainer.value) return

  // 代码高亮
  Vditor.highlightRender({
    style: 'github',
    lineNumber: false
  }, viewerContainer.value)

  // 数学公式渲染
  Vditor.mathRender(viewerContainer.value, {
    math: {
      engine: 'KaTeX'
    }
  })

  // 代码块复制功能
  Vditor.codeRender(viewerContainer.value)

  // 图片懒加载
  Vditor.lazyLoadImageRender(viewerContainer.value)

  // 媒体渲染
  Vditor.mediaRender(viewerContainer.value)
}

// 监听内容变化
watch(() => props.content, (newContent) => {
  void renderMarkdown(newContent)
}, { immediate: true })

// 🔥 监听大纲跳转目标
watch(() => markdownStore.outlineScrollTarget, (target) => {
  if (!target || !viewerContainer.value) return
  
  console.log('[MarkdownViewer] Scroll to slug:', target.slug)
  
  try {
    // 在预览模式下，查找对应 slug 的标题元素
    // Vditor 生成的 HTML 中，标题会有 id 属性
    const headingElement = viewerContainer.value.querySelector(`#${target.slug}`)
    
    if (headingElement) {
      // 滚动到目标标题
      headingElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
      console.log('[MarkdownViewer] Scrolled to heading:', target.slug)
    } else {
      // 如果通过 slug 找不到，尝试通过文本匹配
      const allHeadings = viewerContainer.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
      let found = false
      
      for (const heading of Array.from(allHeadings)) {
        if (heading.textContent?.toLowerCase().includes(target.slug.toLowerCase())) {
          heading.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
          found = true
          console.log('[MarkdownViewer] Scrolled to heading by text match')
          break
        }
      }
      
      if (!found) {
        console.warn('[MarkdownViewer] Target heading not found:', target.slug)
      }
    }
    
    // 清除跳转目标
    setTimeout(() => {
      markdownStore.clearScrollTarget()
    }, 500)
    
  } catch (error) {
    console.error('[MarkdownViewer] Failed to scroll:', error)
  }
}, { deep: true })

onMounted(() => {
  void renderMarkdown(props.content)
})
</script>

<style scoped>
.markdown-viewer {
  /* 🔥 占满父容器，父容器的 height: 0 + flex: 1 提供了高度 */
  width: 100%;
  height: 100%;
  
  overflow-y: auto;  /* ✅ 垂直滚动 */
  padding: 20px 40px;
  background-color: var(--obsidian-bg-primary, #ffffff);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--obsidian-text-primary, #2e3338);
}

/* Markdown渲染样式 */
:deep(h1) {
  font-size: 2em;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  line-height: 1.3;
  border-bottom: 2px solid var(--obsidian-border, #e3e5e8);
  padding-bottom: 0.3em;
}

:deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin-top: 1.3em;
  margin-bottom: 0.5em;
  line-height: 1.3;
}

:deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
}

:deep(h4), :deep(h5), :deep(h6) {
  font-size: 1em;
  font-weight: 600;
  margin-top: 1em;
  margin-bottom: 0.5em;
}

:deep(p) {
  margin-bottom: 1em;
}

:deep(a) {
  color: var(--obsidian-accent, #5b7fff);
  text-decoration: none;
}

:deep(a:hover) {
  text-decoration: underline;
}

:deep(code) {
  background-color: var(--obsidian-code-bg, #f5f6f8);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
}

:deep(pre) {
  background-color: var(--obsidian-code-bg, #f5f6f8);
  border: 1px solid var(--obsidian-border, #e3e5e8);
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 1em 0;
}

:deep(pre code) {
  background-color: transparent;
  padding: 0;
}

:deep(blockquote) {
  border-left: 4px solid var(--obsidian-accent, #5b7fff);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--obsidian-text-secondary, #6a6d74);
  font-style: italic;
}

:deep(ul), :deep(ol) {
  padding-left: 2em;
  margin: 1em 0;
}

:deep(li) {
  margin: 0.5em 0;
}

:deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

:deep(th), :deep(td) {
  border: 1px solid var(--obsidian-border, #e3e5e8);
  padding: 8px 12px;
  text-align: left;
}

:deep(th) {
  background-color: var(--obsidian-bg-secondary, #f5f6f8);
  font-weight: 600;
}

:deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

:deep(hr) {
  border: none;
  border-top: 2px solid var(--obsidian-border, #e3e5e8);
  margin: 2em 0;
}

/* 任务列表样式 */
:deep(.vditor-task) {
  list-style: none;
}

:deep(.vditor-task input[type="checkbox"]) {
  margin-right: 8px;
}
</style>
