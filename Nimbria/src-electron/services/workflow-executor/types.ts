/**
 * 工作流执行器类型定义
 */

export type ScraperEngine = 'browserview' | 'cheerio' | 'puppeteer'

export interface WorkflowNodeData {
  label: string
  selector?: string
  config?: {
    strategy?: 'max-text' | 'direct'
    removeSelectors?: string
    engine?: ScraperEngine  // 🔥 用户可选择的爬取引擎
    densityWeight?: number  // 🔥 密度权重（0-100，默认70）
    [key: string]: any
  }
  output?: any
  chapterTitleSelector?: string
}

export interface WorkflowNode {
  id: string
  type: 'get-text' | 'get-links' | 'operation' | 'iterator' | 'object' | 'output-object'
  position: { x: number; y: number }
  data: WorkflowNodeData
  dragHandle?: string
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface WorkflowExecutionContext {
  tabId: string
  currentUrl?: string
  variables?: Map<string, any>
}

/**
 * 节点执行结果
 */
export interface NodeExecutionResult {
  nodeId: string
  success: boolean
  output?: any
  error?: string
  executedAt: number
  engine?: ScraperEngine // 实际使用的引擎
  duration?: number // 执行耗时（ms）
}

/**
 * 文本提取结果子对象
 */
export interface TextExtractionResult {
  text: string                     // 提取的文本
  length: number                   // 文本长度
  selector: string                 // 使用的选择器
}

/**
 * 获取文本节点的输出格式
 */
export interface GetTextOutput {
  title?: TextExtractionResult     // 标题提取结果
  content: TextExtractionResult    // 内容提取结果
  url: string                      // 页面URL
  engine: ScraperEngine            // 使用的引擎
  duration?: number                // 执行耗时（ms）
}

/**
 * 获取链接节点的输出格式
 */
export interface GetLinksOutput {
  links: Array<{
    title: string
    url: string
  }>
  count: number
  engine: ScraperEngine
}

/**
 * 节点执行器接口
 */
export interface NodeExecutor {
  execute(
    node: WorkflowNode,
    context: WorkflowExecutionContext,
    input?: any
  ): Promise<NodeExecutionResult>
}

