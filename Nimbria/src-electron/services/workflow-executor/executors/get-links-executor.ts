/**
 * 获取链接节点执行器
 * 负责从页面中提取链接列表
 */

import type { BrowserViewManager } from '../../search-scraper-service/browser-view-manager'
import type {
  NodeExecutor,
  WorkflowNode,
  WorkflowExecutionContext,
  NodeExecutionResult,
  GetLinksOutput
} from '../types'

export class GetLinksExecutor implements NodeExecutor {
  constructor(private browserViewManager: BrowserViewManager) {}

  async execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _input?: unknown
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now()
    const { containerSelector = 'body', filterKeywords = '首页, 书架, 投票, 打赏' } = node.data.config || {}

    try {
      // @ts-expect-error - 访问私有属性
      const viewInstance = this.browserViewManager.views.get(context.tabId)
      
      if (!viewInstance) {
        throw new Error(`BrowserView for tab ${context.tabId} not found`)
      }

      // 🔥 在 BrowserView 中执行提取脚本
      const result = await viewInstance.view.webContents.executeJavaScript(`
        (function() {
          const container = document.querySelector('${containerSelector}');
          if (!container) {
            return { links: [], count: 0, url: window.location.href };
          }
          
          // 解析黑名单关键词
          const blacklist = '${filterKeywords}'
            .split(',')
            .map(k => k.trim())
            .filter(k => k);
          
          // 提取所有链接
          const anchors = Array.from(container.querySelectorAll('a'));
          
          // 过滤并提取链接
          const links = anchors
            .filter(a => {
              const text = (a.textContent || '').trim();
              const href = a.href || '';
              
              // 必须有文本和URL
              if (!text || !href) return false;
              
              // 检查黑名单
              return !blacklist.some(kw => 
                text.includes(kw) || href.includes(kw)
              );
            })
            .map(a => ({
              title: (a.textContent || '').trim(),
              url: a.href
            }));
          
          return {
            links,
            count: links.length,
            url: window.location.href
          };
        })();
      `)

      const duration = Date.now() - startTime
      const output: GetLinksOutput = {
        links: result.links,
        count: result.count,
        url: result.url,
        engine: 'browserview',
        duration
      }

      return {
        nodeId: node.id,
        success: true,
        output,
        executedAt: Date.now(),
        engine: 'browserview',
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      return {
        nodeId: node.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executedAt: Date.now(),
        engine: 'browserview',
        duration
      }
    }
  }
}

