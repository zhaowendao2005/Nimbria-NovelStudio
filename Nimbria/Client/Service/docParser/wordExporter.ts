/**
 * Word 文档导出器
 * 用于将包含图片、表格的题目导出到 Word 文档
 */

import type { 
  ParsedData, 
  WordExportOptions, 
  WordExportResult,
  ExportConfig
} from '@stores/projectPage/docParser/docParser.types'

// 优先尝试引入 docx 库，若不可用则采用 Mock 写法
let Docx: any = null
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Docx = require('docx')
} catch {}

export class WordExporter {
  /**
   * 导出数据到 Word 文档
   */
  static async export(
    data: ParsedData[], 
    config: ExportConfig,
    options: WordExportOptions
  ): Promise<WordExportResult> {
    try {
      console.log('[WordExporter] 开始导出到 Word 文档:', options.filename)
      
      // 过滤需要导出到 Word 的数据；即使为空，也要生成空文档
      const wordData = this.filterWordExportData(data)
      
      // 生成 Word 文档内容
      const buffer = await this.generateDocxBuffer(wordData, config, options)
      
      console.log('[WordExporter] Word 文档生成成功, 大小:', buffer.byteLength, 'bytes')
      
      return {
        success: true,
        wordPath: options.filename,
        exportedItemCount: wordData.length,
        retainedInExcelCount: data.length - wordData.length
      }
      
    } catch (error) {
      console.error('[WordExporter] 导出失败:', error)
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)]
      }
    }
  }

  /**
   * 过滤需要导出到 Word 的数据
   */
  private static filterWordExportData(data: ParsedData[]): ParsedData[] {
    return data.filter(item => item.needsWordExport === true)
  }

  /**
   * 创建文档内容
   */
  private static createDocumentContent(
    data: ParsedData[], 
    config: ExportConfig, 
    options: WordExportOptions
  ): any[] {
    const content: any[] = []
    
    // 添加文档标题
    content.push({
      type: 'title',
      text: '包含图片和表格的题目'
    })
    
    let currentChapter = ''
    
    data.forEach((item, index) => {
      // 添加章节标题（如果配置了包含章节）
      if (options.includeChapters && item.chapterTitle && item.chapterTitle !== currentChapter) {
        currentChapter = item.chapterTitle
        content.push({
          type: 'chapter',
          text: currentChapter
        })
      }
      
      // 添加题目内容
      content.push({
        type: 'question',
        number: item.questionNumber || (index + 1).toString(),
        content: item.questionContent || '',
        answer: item.answer || '',
        hasImages: item.hasImages,
        hasTables: item.hasTables,
        wordExportReason: item.wordExportReason || []
      })
    })
    
    return content
  }

  /**
   * 生成 docx 缓冲区（优先使用 docx 库，失败则使用 Mock 文本）
   */
  private static async generateDocxBuffer(
    data: ParsedData[],
    config: ExportConfig,
    options: WordExportOptions
  ): Promise<ArrayBuffer> {
    if (Docx && Docx.Document && Docx.Packer) {
      const paragraphs: any[] = []
      // 标题
      paragraphs.push(new Docx.Paragraph({
        children: [new Docx.TextRun({ text: '包含图片和表格的题目', bold: true, size: 28 })]
      }))
      paragraphs.push(new Docx.Paragraph({ text: '' }))

      let currentChapter = ''
      const items = data.length > 0 ? data : []
      if (items.length === 0) {
        paragraphs.push(new Docx.Paragraph({ text: '无需要导入 Word 的题目（自动生成空白附件）。' }))
      }

      items.forEach((item, index) => {
        if (options.includeChapters && item.chapterTitle && item.chapterTitle !== currentChapter) {
          currentChapter = item.chapterTitle
          paragraphs.push(new Docx.Paragraph({
            children: [new Docx.TextRun({ text: currentChapter, bold: true, size: 26 })]
          }))
        }

        const number = item.questionNumber || (index + 1).toString()
        const titleLine = `${number}、${item.questionContent || ''}`
        paragraphs.push(new Docx.Paragraph({ text: titleLine }))
        if (item.answer) {
          paragraphs.push(new Docx.Paragraph({
            children: [
              new Docx.TextRun({ text: '答：', bold: true }),
              new Docx.TextRun({ text: ` ${item.answer}` })
            ]
          }))
        }
        if (item.wordExportReason && item.wordExportReason.length > 0) {
          paragraphs.push(new Docx.Paragraph({ text: `导出原因: ${item.wordExportReason.join(', ')}`, italics: true }))
        }
        paragraphs.push(new Docx.Paragraph({ text: '' }))
      })

      const doc = new Docx.Document({
        sections: [
          {
            properties: {},
            children: paragraphs
          }
        ]
      })

      const bufferNode = await Docx.Packer.toBuffer(doc)
      return bufferNode.buffer.slice(bufferNode.byteOffset, bufferNode.byteOffset + bufferNode.byteLength)
    }

    // Fallback: 生成 Mock Markdown 文本并转为 ArrayBuffer
    const mockDocument = {
      sections: [{
        properties: {},
        children: this.createDocumentContent(data, config, options)
      }]
    }
    const mockContent = this.generateMockWordContent(mockDocument)
    const encoder = new TextEncoder()
    return encoder.encode(mockContent).buffer
  }

  /**
   * 生成 Word 文档缓冲区
   */
  private static async generateBuffer(document: any): Promise<ArrayBuffer> {
    // 兼容旧方法，直接走 Mock
    const mockContent = this.generateMockWordContent(document)
    const encoder = new TextEncoder()
    return encoder.encode(mockContent).buffer
  }

  /**
   * 生成 Mock Word 内容
   */
  private static generateMockWordContent(document: any): string {
    const sections = document.sections || []
    let content = '# Word 文档导出 (Mock 版本)\n\n'
    
    sections.forEach((section: any) => {
      const children = section.children || []
      
      children.forEach((child: any) => {
        switch (child.type) {
          case 'title':
            content += `# ${child.text}\n\n`
            break
          case 'chapter':
            content += `## ${child.text}\n\n`
            break
          case 'question':
            content += `### ${child.number}、${child.content}\n\n`
            if (child.answer) {
              content += `**答：** ${child.answer}\n\n`
            }
            if (child.wordExportReason && child.wordExportReason.length > 0) {
              content += `*导出原因: ${child.wordExportReason.join(', ')}*\n\n`
            }
            content += '---\n\n'
            break
        }
      })
    })
    
    return content
  }

  /**
   * 检查是否支持 Word 导出
   */
  static isSupported(): boolean {
    return !!(Docx && Docx.Document && Docx.Packer)
  }

  /**
   * 获取建议的文件名
   */
  static getSuggestedFilename(baseName?: string): string {
    const date = new Date().toISOString().split('T')[0]
    const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-')
    return `${baseName || '题目导出'}_图表题目_${date}_${time}.docx`
  }
}
