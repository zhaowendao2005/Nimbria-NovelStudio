/**
 * 正则引擎
 * 负责执行正则表达式匹配和提取
 */

import type { RegexMatch, RegexEngineConfig } from './docParser.service.types'
import type { ParseMetadata } from '@stores/projectPage/docParser/docParser.types'

/**
 * 正则引擎
 */
export class RegexEngine {
  /**
   * 执行正则匹配
   * @param text 待匹配文本
   * @param config 正则配置
   * @returns 匹配结果
   */
  static execute(text: string, config: RegexEngineConfig): RegexMatch {
    try {
      // 预处理：根据条件调整正则
      let pattern = config.regex
      
      if (config.conditions?.lineStart && !pattern.startsWith('^')) {
        pattern = '^' + pattern
      }
      
      if (config.conditions?.lineEnd && !pattern.endsWith('$')) {
        pattern = pattern + '$'
      }
      
      if (config.conditions?.wholeWord) {
        pattern = '\\b' + pattern + '\\b'
      }
      
      // 创建正则对象
      const flags = config.flags || ''
      const regex = new RegExp(pattern, flags)
      
      // 执行匹配
      const match = regex.exec(text)
      
      if (!match) {
        return { matched: false }
      }
      
      // 提取结果
      const result: RegexMatch = {
        matched: true,
        capturedGroups: match.slice(1), // 排除完整匹配
        startIndex: match.index,
        endIndex: match.index + match[0].length
      }
      
      // 根据模式提取值
      switch (config.mode) {
        case 'extract':
          if (config.captureGroup !== undefined && config.captureGroup > 0) {
            result.value = match[config.captureGroup] || ''
          } else {
            result.value = match[0]
          }
          break
          
        case 'validate':
          result.value = match[0]
          break
          
        case 'split':
          // Split模式下，value是匹配的分隔符
          result.value = match[0]
          break
      }
      
      return result
      
    } catch (error) {
      console.error('[RegexEngine] 正则执行失败:', error)
      return { matched: false }
    }
  }
  
  /**
   * 执行全局匹配
   * @param text 待匹配文本
   * @param config 正则配置
   * @returns 所有匹配结果
   */
  static executeGlobal(text: string, config: RegexEngineConfig): RegexMatch[] {
    try {
      let pattern = config.regex
      let flags = config.flags || ''
      
      // 确保包含全局标志
      if (!flags.includes('g')) {
        flags += 'g'
      }
      
      // 应用条件
      if (config.conditions?.lineStart && !pattern.startsWith('^')) {
        pattern = '^' + pattern
      }
      
      if (config.conditions?.lineEnd && !pattern.endsWith('$')) {
        pattern = pattern + '$'
      }
      
      if (config.conditions?.wholeWord) {
        pattern = '\\b' + pattern + '\\b'
      }
      
      const regex = new RegExp(pattern, flags)
      const results: RegexMatch[] = []
      
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        const result: RegexMatch = {
          matched: true,
          capturedGroups: match.slice(1),
          startIndex: match.index,
          endIndex: match.index + match[0].length
        }
        
        // 提取值
        if (config.captureGroup !== undefined && config.captureGroup > 0) {
          result.value = match[config.captureGroup] || ''
        } else {
          result.value = match[0]
        }
        
        results.push(result)
      }
      
      return results
      
    } catch (error) {
      console.error('[RegexEngine] 全局匹配失败:', error)
      return []
    }
  }
  
  /**
   * 根据ParseMetadata创建RegexEngineConfig
   */
  static fromParseMetadata(metadata: ParseMetadata): RegexEngineConfig {
    return {
      regex: metadata.regex,
      flags: metadata.flags,
      mode: metadata.mode,
      captureGroup: metadata.captureGroup,
      conditions: metadata.conditions
    }
  }
  
  /**
   * 验证正则表达式是否有效
   */
  static validateRegex(pattern: string, flags?: string): boolean {
    try {
      new RegExp(pattern, flags)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * 按行匹配
   * 针对每一行执行正则匹配
   */
  static matchLines(text: string, config: RegexEngineConfig): Array<{
    lineNumber: number
    line: string
    match: RegexMatch
  }> {
    const lines = text.split('\n')
    const results: Array<{
      lineNumber: number
      line: string
      match: RegexMatch
    }> = []
    
    lines.forEach((line, index) => {
      const match = this.execute(line, config)
      if (match.matched) {
        results.push({
          lineNumber: index + 1,
          line,
          match
        })
      }
    })
    
    return results
  }
}

