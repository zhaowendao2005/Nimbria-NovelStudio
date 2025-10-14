/**
 * 大文件读取器
 * 参考 VSCode 的大文件处理策略，实现分块读取和虚拟化
 */

import fs from 'fs-extra'
import { createReadStream } from 'fs'
import { getLogger } from '../../utils/shared/logger'

const logger = getLogger('LargeFileReader')

// 大文件阈值 (1MB)
const LARGE_FILE_THRESHOLD = 1024 * 1024

// 分块大小 (64KB)
const CHUNK_SIZE = 64 * 1024

// 最大预览行数
const MAX_PREVIEW_LINES = 1000

export interface FileChunk {
  index: number
  startByte: number
  endByte: number
  content: string
  lineStart: number
  lineEnd: number
}

export interface LargeFileInfo {
  path: string
  size: number
  isLarge: boolean
  totalLines?: number
  encoding: string
  preview?: string
  chunks?: FileChunk[]
}

export class LargeFileReader {
  /**
   * 检查文件是否为大文件
   */
  async isLargeFile(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath)
      return stat.size > LARGE_FILE_THRESHOLD
    } catch (error) {
      logger.error(`Failed to check file size: ${filePath}`, error)
      return false
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<LargeFileInfo> {
    try {
      const stat = await fs.stat(filePath)
      const isLarge = stat.size > LARGE_FILE_THRESHOLD

      const info: LargeFileInfo = {
        path: filePath,
        size: stat.size,
        isLarge,
        encoding: 'utf-8'
      }

      if (isLarge) {
        // 对于大文件，只读取预览内容
        info.preview = await this.readPreview(filePath)
        info.totalLines = await this.countLines(filePath)
        logger.info(`Large file detected: ${filePath} (${stat.size} bytes, ~${info.totalLines} lines)`)
      } else {
        // 小文件直接读取全部内容
        info.preview = await fs.readFile(filePath, 'utf-8')
      }

      return info
    } catch (error) {
      logger.error(`Failed to get file info: ${filePath}`, error)
      throw error
    }
  }

  /**
   * 读取文件预览（前N行）
   */
  async readPreview(filePath: string, maxLines: number = MAX_PREVIEW_LINES): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { encoding: 'utf-8' })
      let content = ''
      let lineCount = 0
      let buffer = ''

      stream.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        
        // 保留最后一行（可能不完整）
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (lineCount >= maxLines) {
            stream.destroy()
            resolve(content + '\n\n... (文件过大，仅显示前 ' + maxLines + ' 行)')
            return
          }
          content += line + '\n'
          lineCount++
        }
      })

      stream.on('end', () => {
        if (buffer && lineCount < maxLines) {
          content += buffer
        }
        resolve(content)
      })

      stream.on('error', (error) => {
        logger.error(`Failed to read preview: ${filePath}`, error)
        reject(error)
      })
    })
  }

  /**
   * 计算文件行数
   */
  async countLines(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { encoding: 'utf-8' })
      let lineCount = 0
      let buffer = ''

      stream.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        lineCount += lines.length
      })

      stream.on('end', () => {
        if (buffer) lineCount++
        resolve(lineCount)
      })

      stream.on('error', (error) => {
        logger.error(`Failed to count lines: ${filePath}`, error)
        reject(error)
      })
    })
  }

  /**
   * 读取指定范围的内容（按行号）
   */
  async readRange(filePath: string, startLine: number, endLine: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { encoding: 'utf-8' })
      let content = ''
      let currentLine = 0
      let buffer = ''

      stream.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          currentLine++
          if (currentLine >= startLine && currentLine <= endLine) {
            content += line + '\n'
          }
          if (currentLine > endLine) {
            stream.destroy()
            resolve(content)
            return
          }
        }
      })

      stream.on('end', () => {
        if (buffer && currentLine >= startLine && currentLine <= endLine) {
          content += buffer
        }
        resolve(content)
      })

      stream.on('error', (error) => {
        logger.error(`Failed to read range: ${filePath}`, error)
        reject(error)
      })
    })
  }

  /**
   * 分块读取文件
   */
  async readChunks(filePath: string, chunkIndices: number[]): Promise<FileChunk[]> {
    const chunks: FileChunk[] = []
    
    for (const index of chunkIndices) {
      try {
        const chunk = await this.readChunk(filePath, index)
        chunks.push(chunk)
      } catch (error) {
        logger.error(`Failed to read chunk ${index} from ${filePath}`, error)
      }
    }

    return chunks
  }

  /**
   * 读取单个分块
   */
  private async readChunk(filePath: string, chunkIndex: number): Promise<FileChunk> {
    const startByte = chunkIndex * CHUNK_SIZE
    const endByte = startByte + CHUNK_SIZE - 1

    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, {
        encoding: 'utf-8',
        start: startByte,
        end: endByte
      })

      let content = ''
      let lineStart = 0
      let lineEnd = 0

      stream.on('data', (chunk: string) => {
        content += chunk
        // 计算行号（简化实现）
        const lines = content.split('\n')
        lineEnd = lineStart + lines.length - 1
      })

      stream.on('end', () => {
        resolve({
          index: chunkIndex,
          startByte,
          endByte: Math.min(endByte, startByte + content.length - 1),
          content,
          lineStart,
          lineEnd
        })
      })

      stream.on('error', (error) => {
        logger.error(`Failed to read chunk: ${filePath}`, error)
        reject(error)
      })
    })
  }

  /**
   * 搜索文件内容（支持大文件）
   */
  async searchInFile(filePath: string, searchTerm: string, maxResults: number = 100): Promise<Array<{
    line: number
    content: string
    index: number
  }>> {
    const results: Array<{ line: number; content: string; index: number }> = []
    
    return new Promise((resolve, reject) => {
      const stream = createReadStream(filePath, { encoding: 'utf-8' })
      let lineNumber = 0
      let buffer = ''
      let charIndex = 0

      stream.on('data', (chunk: string) => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          lineNumber++
          const index = line.toLowerCase().indexOf(searchTerm.toLowerCase())
          if (index !== -1) {
            results.push({
              line: lineNumber,
              content: line,
              index: charIndex + index
            })
            
            if (results.length >= maxResults) {
              stream.destroy()
              resolve(results)
              return
            }
          }
          charIndex += line.length + 1 // +1 for newline
        }
      })

      stream.on('end', () => {
        if (buffer) {
          lineNumber++
          const index = buffer.toLowerCase().indexOf(searchTerm.toLowerCase())
          if (index !== -1 && results.length < maxResults) {
            results.push({
              line: lineNumber,
              content: buffer,
              index: charIndex + index
            })
          }
        }
        resolve(results)
      })

      stream.on('error', (error) => {
        logger.error(`Failed to search in file: ${filePath}`, error)
        reject(error)
      })
    })
  }
}
