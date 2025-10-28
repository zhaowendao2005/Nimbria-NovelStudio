/**
 * 链接标题相似度分析器
 * 
 * 功能：
 * - 计算字符串编辑距离（Levenshtein距离）
 * - 提取章节标题结构模式
 * - 识别主节点（最大簇）
 * - 基于相似度进行聚类
 */

import type { LinkItem, SimilarityResult } from '@types/LinkNodeView'

/**
 * 计算两个字符串的Levenshtein距离
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length
  const len2 = s2.length
  const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
    Array(len2 + 1).fill(0)
  )

  for (let i = 0; i <= len1; i++) dp[i]![0] = i
  for (let j = 0; j <= len2; j++) dp[0]![j] = j

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1,    // 删除
          dp[i]![j - 1]! + 1,    // 插入
          dp[i - 1]![j - 1]! + 1 // 替换
        )
      }
    }
  }

  return dp[len1]![len2]!
}

/**
 * 计算相似度百分比（0-1）
 */
function calculateSimilarity(s1: string, s2: string): number {
  const distance = levenshteinDistance(s1, s2)
  const maxLen = Math.max(s1.length, s2.length)
  return maxLen === 0 ? 1 : 1 - distance / maxLen
}

/**
 * 提取章节标题的结构模式
 */
function extractPattern(title: string): string | null {
  const patterns = [
    /第(\d+)章\s*(.*)$/,                           // 第N章 XXX
    /第(\d+)节\s*(.*)$/,                           // 第N节 XXX
    /第(\d+)回\s*(.*)$/,                           // 第N回 XXX
    /第(\d+)集\s*(.*)$/,                           // 第N集 XXX
    /Chapter\s*(\d+)\s*[:\-]?\s*(.*)$/i,          // Chapter N: XXX
    /(\d+)\.\s*(.*)$/,                            // N. XXX
    /\[(\d+)\]\s*(.*)$/,                          // [N] XXX
    /（(\d+)）\s*(.*)$/,                          // （N） XXX
    /(\d+)、\s*(.*)$/,                            // N、 XXX
    /卷(\d+)\s*(.*)$/,                            // 卷N XXX
    /Part\s*(\d+)\s*[:\-]?\s*(.*)$/i,            // Part N: XXX
    /Episode\s*(\d+)\s*[:\-]?\s*(.*)$/i,         // Episode N: XXX
    /EP(\d+)\s*[:\-]?\s*(.*)$/i,                 // EP N: XXX
    /(\d+)话\s*(.*)$/,                            // N话 XXX
    /(\d+)卷\s*(.*)$/,                            // N卷 XXX
    /番外(\d+)\s*(.*)$/                           // 番外N XXX
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      return pattern.source
    }
  }

  return null
}

/**
 * 计算相似度矩阵
 */
function computeSimilarityMatrix(links: LinkItem[]): number[][] {
  const n = links.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const similarity = calculateSimilarity(links[i]!.title, links[j]!.title)
      matrix[i]![j] = similarity
      matrix[j]![i] = similarity
    }
    matrix[i]![i] = 1 // 自己与自己100%相似
  }

  return matrix
}

/**
 * 基于相似度矩阵进行聚类（简单的阈值聚类）
 */
function clusterBySimilarity(
  links: LinkItem[],
  similarityMatrix: number[][],
  threshold: number
): LinkItem[][] {
  const n = links.length
  const visited = new Array(n).fill(false) as boolean[]
  const clusters: LinkItem[][] = []

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue

    const cluster: LinkItem[] = [links[i]!]
    visited[i] = true

    for (let j = i + 1; j < n; j++) {
      if (!visited[j] && similarityMatrix[i]![j]! >= threshold) {
        cluster.push(links[j]!)
        visited[j] = true
      }
    }

    clusters.push(cluster)
  }

  return clusters
}

/**
 * LinkSimilarityAnalyzer 类
 */
export class LinkSimilarityAnalyzer {
  /**
   * 分析链接相似度并识别主节点
   */
  static analyze(links: LinkItem[]): SimilarityResult {
    if (links.length === 0) {
      return { mainNode: null, clusters: new Map(), mainClusterPattern: '' }
    }

    // 1. 提取所有链接的模式
    const patternMap = new Map<string, LinkItem[]>()

    links.forEach(link => {
      const pattern = extractPattern(link.title)
      if (pattern) {
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, [])
        }
        patternMap.get(pattern)!.push(link)
      } else {
        // 无模式的归为"其他"
        if (!patternMap.has('other')) {
          patternMap.set('other', [])
        }
        patternMap.get('other')!.push(link)
      }
    })

    // 2. 找出最大的簇（即主节点类型）
    let maxClusterSize = 0
    let mainClusterPattern = ''
    let mainCluster: LinkItem[] = []

    patternMap.forEach((cluster, pattern) => {
      if (cluster.length > maxClusterSize) {
        maxClusterSize = cluster.length
        mainClusterPattern = pattern
        mainCluster = cluster
      }
    })

    // 3. 如果没有明显的模式，使用相似度聚类
    if (mainClusterPattern === 'other' || patternMap.size === 1) {
      const similarityMatrix = computeSimilarityMatrix(links)
      const clusters = clusterBySimilarity(links, similarityMatrix, 0.6) // 60%相似度阈值

      // 找出最大的簇
      let maxCluster: LinkItem[] = []
      clusters.forEach(cluster => {
        if (cluster.length > maxCluster.length) {
          maxCluster = cluster
        }
      })

      mainCluster = maxCluster
    }

    // 4. 主节点是主簇中第一个
    const mainNode = mainCluster.length > 0 ? mainCluster[0]! : null

    return {
      mainNode,
      clusters: patternMap,
      mainClusterPattern
    }
  }
}

/**
 * 便捷函数：分析链接相似度
 */
export function analyzeLinkSimilarity(links: LinkItem[]): SimilarityResult {
  return LinkSimilarityAnalyzer.analyze(links)
}

