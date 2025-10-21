/**
 * TokenRegressionEstimator - Token回归估计器
 * 
 * 职责：
 * - 收集已完成任务的实际token数据
 * - 基于线性回归预估未来任务的输出token数
 * - 按modelId分组维护样本（不同模型特性不同）
 * 
 * 设计理念：
 * - 滑动窗口：只保留最近100个样本（避免内存泄漏）
 * - 降级策略：样本不足时返回-1（由调用者决定降级方案）
 * - 简单线性模型：outputTokens ≈ k * inputLength + b
 */

export interface TokenSample {
  modelId: string
  inputLength: number      // 输入文本长度（字符数）
  inputTokens: number      // 实际输入token数
  outputTokens: number     // 实际输出token数
  timestamp: number
}

export interface RegressionCoefficients {
  slope: number            // 斜率 k
  intercept: number        // 截距 b
  r2: number              // R² 决定系数（拟合度）
  sampleCount: number      // 样本数量
}

const MIN_SAMPLES = 3       // 最少样本数
const MAX_SAMPLES = 100     // 最大样本数（滑动窗口）

export class TokenRegressionEstimator {
  // 按modelId分组的样本库
  private samples: Map<string, TokenSample[]> = new Map()
  
  // 按modelId分组的回归系数
  private coefficients: Map<string, RegressionCoefficients> = new Map()

  constructor() {
    console.log(`📊 [TokenRegressionEstimator] 初始化回归估计器`)
  }

  /**
   * 添加样本
   */
  addSample(sample: TokenSample): void {
    const { modelId } = sample
    
    // 获取或创建样本数组
    if (!this.samples.has(modelId)) {
      this.samples.set(modelId, [])
    }
    
    const modelSamples = this.samples.get(modelId)!
    
    // 添加新样本
    modelSamples.push(sample)
    
    // 维护滑动窗口（最多保留100个最新样本）
    if (modelSamples.length > MAX_SAMPLES) {
      modelSamples.shift() // 移除最早的样本
    }
    
    console.log(`📊 [TokenRegressionEstimator] 添加样本: modelId=${modelId}, count=${modelSamples.length}/${MAX_SAMPLES}`)
    
    // 每10个样本重新训练一次
    if (modelSamples.length % 10 === 0) {
      this.train(modelId)
    }
  }

  /**
   * 训练回归模型
   */
  train(modelId: string): void {
    const modelSamples = this.samples.get(modelId)
    
    if (!modelSamples || modelSamples.length < MIN_SAMPLES) {
      console.log(`⚠️ [TokenRegressionEstimator] 样本不足，无法训练: modelId=${modelId}, count=${modelSamples?.length || 0}`)
      return
    }

    // 简单线性回归：y = kx + b
    // y = outputTokens, x = inputLength
    
    const n = modelSamples.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumX2 = 0
    
    for (const sample of modelSamples) {
      const x = sample.inputLength
      const y = sample.outputTokens
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    }
    
    const meanX = sumX / n
    const meanY = sumY / n
    
    // 计算斜率 k
    const slope = (sumXY - n * meanX * meanY) / (sumX2 - n * meanX * meanX)
    
    // 计算截距 b
    const intercept = meanY - slope * meanX
    
    // 计算 R²（拟合度）
    let ssTotal = 0
    let ssResidual = 0
    
    for (const sample of modelSamples) {
      const predicted = slope * sample.inputLength + intercept
      ssTotal += Math.pow(sample.outputTokens - meanY, 2)
      ssResidual += Math.pow(sample.outputTokens - predicted, 2)
    }
    
    const r2 = 1 - (ssResidual / ssTotal)
    
    // 保存系数
    this.coefficients.set(modelId, {
      slope,
      intercept,
      r2,
      sampleCount: n
    })
    
    console.log(`✅ [TokenRegressionEstimator] 模型训练完成: modelId=${modelId}`)
    console.log(`   斜率: ${slope.toFixed(4)}, 截距: ${intercept.toFixed(2)}, R²: ${r2.toFixed(4)}, 样本数: ${n}`)
  }

  /**
   * 估计输出token数
   */
  estimate(contentLength: number, modelId: string): number {
    const coeffs = this.coefficients.get(modelId)
    
    if (!coeffs) {
      // 没有训练数据，返回 -1 表示无法估计
      console.log(`⚠️ [TokenRegressionEstimator] 无训练数据: modelId=${modelId}`)
      return -1
    }
    
    if (coeffs.sampleCount < MIN_SAMPLES) {
      // 样本不足
      console.log(`⚠️ [TokenRegressionEstimator] 样本不足: modelId=${modelId}, count=${coeffs.sampleCount}`)
      return -1
    }
    
    // 使用线性回归公式计算
    const estimated = Math.round(coeffs.slope * contentLength + coeffs.intercept)
    
    // 确保估计值为正数
    const result = Math.max(estimated, 10)
    
    console.log(`📊 [TokenRegressionEstimator] 预估结果: inputLength=${contentLength} → outputTokens=${result} (R²=${coeffs.r2.toFixed(4)})`)
    
    return result
  }

  /**
   * 检查是否有足够的样本
   */
  hasSufficientSamples(modelId: string): boolean {
    const modelSamples = this.samples.get(modelId)
    return modelSamples ? modelSamples.length >= MIN_SAMPLES : false
  }

  /**
   * 获取样本数量
   */
  getSampleCount(modelId: string): number {
    const modelSamples = this.samples.get(modelId)
    return modelSamples ? modelSamples.length : 0
  }

  /**
   * 获取所有模型的统计信息
   */
  getStats(): Record<string, { sampleCount: number; r2?: number }> {
    const stats: Record<string, { sampleCount: number; r2?: number }> = {}
    
    for (const [modelId, samples] of this.samples) {
      const coeffs = this.coefficients.get(modelId)
      stats[modelId] = {
        sampleCount: samples.length,
        r2: coeffs?.r2
      }
    }
    
    return stats
  }

  /**
   * 清空所有数据
   */
  reset(): void {
    this.samples.clear()
    this.coefficients.clear()
    console.log(`🔄 [TokenRegressionEstimator] 数据已重置`)
  }
}

