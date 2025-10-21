/**
 * ThrottleProbe - 限流探针
 * 
 * 职责：
 * - 检测API限流状态
 * - 定时发送测试请求
 * - 恢复后通知调度器
 * 
 * 两种探针模式：
 * - quick: 轻量级连接检查（快速但可能不准确）
 * - api: 实际API调用（准确但消耗配额）
 */

import { EventEmitter } from 'events'

export interface ThrottleProbeConfig {
  /** 探针间隔（秒） */
  intervalSeconds: number
  /** 探针类型 */
  type: 'quick' | 'api'
  /** 最大重试次数 */
  maxRetries?: number
}

export interface ThrottleProbeResult {
  /** 是否成功（200响应） */
  success: boolean
  /** 响应时间（毫秒） */
  responseTime: number
  /** 错误信息 */
  error?: string
}

export class ThrottleProbe extends EventEmitter {
  private modelId: string
  private config: ThrottleProbeConfig
  private isProbing: boolean = false
  private probeTimer: NodeJS.Timeout | null = null
  private lastProbeTime: number = 0
  private retryCount: number = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private llmConfigManager: any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(modelId: string, config: ThrottleProbeConfig, llmConfigManager: any) {
    super()
    this.modelId = modelId
    this.config = config
    this.llmConfigManager = llmConfigManager
    
    console.log(`🔍 [ThrottleProbe] 初始化探针: modelId=${modelId}, type=${config.type}, interval=${config.intervalSeconds}s`)
  }

  /**
   * 快速探针 - 轻量级连接检查
   * 可以是HEAD请求或简单的ping
   */
  async quickProbe(): Promise<ThrottleProbeResult> {
    const startTime = Date.now()
    
    try {
      console.log(`⚡ [ThrottleProbe] 快速探针测试...`)
      
      // 简单的连接检查（这里暂时模拟）
      // TODO: 实际实现可能是发送HEAD请求或OPTIONS请求
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const responseTime = Date.now() - startTime
      
      console.log(`✅ [ThrottleProbe] 快速探针成功，响应时间: ${responseTime}ms`)
      
      return {
        success: true,
        responseTime
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      console.error(`❌ [ThrottleProbe] 快速探针失败:`, error)
      
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * API探针 - 实际调用API发送短内容
   */
  async apiProbe(): Promise<ThrottleProbeResult> {
    const startTime = Date.now()
    
    try {
      console.log(`🔍 [ThrottleProbe] API探针测试...`)
      
      // 解析modelId获取providerId和modelName
      const dotIndex = this.modelId.indexOf('.')
      const providerId = this.modelId.substring(0, dotIndex)
      const modelName = this.modelId.substring(dotIndex + 1)
      
      // 获取provider配置
      const provider = this.llmConfigManager.getProvider(providerId)
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`)
      }
      
      // 获取API配置
      const apiKey = provider.apiKey
      const baseUrl = provider.baseUrl
      
      if (!apiKey) {
        throw new Error('API key not configured')
      }
      
      // 发送一个最小化的API请求（仅用于测试限流状态）
      const testContent = 'hi'
      const systemPrompt = 'Reply with "ok"'
      
      // 使用fetch发送简单请求
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: testContent }
          ],
          max_tokens: 10
        })
      })
      
      const responseTime = Date.now() - startTime
      
      if (response.status === 200) {
        console.log(`✅ [ThrottleProbe] API探针成功，响应时间: ${responseTime}ms`)
        return {
          success: true,
          responseTime
        }
      } else if (response.status === 429) {
        console.log(`⚠️ [ThrottleProbe] 仍处于限流状态 (429)`)
        return {
          success: false,
          responseTime,
          error: 'RATE_LIMIT'
        }
      } else {
        throw new Error(`Unexpected status code: ${response.status}`)
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      
      console.error(`❌ [ThrottleProbe] API探针失败:`, error)
      
      return {
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 启动定时探测
   */
  async startProbing(): Promise<void> {
    if (this.isProbing) {
      console.warn(`⚠️ [ThrottleProbe] 探针已在运行中`)
      return
    }

    this.isProbing = true
    this.retryCount = 0
    
    console.log(`🔄 [ThrottleProbe] 启动定时探测，间隔: ${this.config.intervalSeconds}秒`)

    // 立即执行一次探测
    await this.probe()

    // 启动定时器
    this.probeTimer = setInterval(() => {
      void this.probe()
    }, this.config.intervalSeconds * 1000)
  }

  /**
   * 停止探测
   */
  stopProbing(): void {
    if (!this.isProbing) {
      return
    }

    this.isProbing = false
    
    if (this.probeTimer) {
      clearInterval(this.probeTimer)
      this.probeTimer = null
    }

    console.log(`⏸️ [ThrottleProbe] 停止探测`)
  }

  /**
   * 执行一次探测
   */
  private async probe(): Promise<void> {
    this.lastProbeTime = Date.now()
    
    // 根据配置选择探针类型
    const result = this.config.type === 'quick' 
      ? await this.quickProbe() 
      : await this.apiProbe()

    // 发射测试结果事件
    this.emit('test-result', result)

    if (result.success) {
      // 探针成功，限流已恢复
      console.log(`🎉 [ThrottleProbe] 限流已恢复！`)
      this.emit('recovered')
      
      // 停止探测
      this.stopProbing()
      
    } else {
      // 探针失败，继续等待
      this.retryCount++
      console.log(`⏳ [ThrottleProbe] 第 ${this.retryCount} 次探测失败，继续等待...`)
      
      // 检查是否达到最大重试次数
      if (this.config.maxRetries && this.retryCount >= this.config.maxRetries) {
        console.log(`❌ [ThrottleProbe] 达到最大重试次数，停止探测`)
        this.emit('max-retries-reached')
        this.stopProbing()
      }
    }
  }

  /**
   * 手动执行一次测试（不影响定时探测）
   */
  async test(): Promise<ThrottleProbeResult> {
    console.log(`🔧 [ThrottleProbe] 手动测试...`)
    
    const result = this.config.type === 'quick' 
      ? await this.quickProbe() 
      : await this.apiProbe()
    
    this.emit('test-result', result)
    
    return result
  }

  /**
   * 重置探针状态
   */
  reset(): void {
    this.stopProbing()
    this.retryCount = 0
    this.lastProbeTime = 0
    
    console.log(`🔄 [ThrottleProbe] 状态已重置`)
  }

  /**
   * 销毁探针
   */
  destroy(): void {
    this.stopProbing()
    this.removeAllListeners()
    
    console.log(`🗑️ [ThrottleProbe] 探针已销毁`)
  }
}

