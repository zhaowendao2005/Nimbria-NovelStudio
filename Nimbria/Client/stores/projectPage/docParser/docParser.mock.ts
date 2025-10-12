/**
 * DocParser Mock数据
 * 用于开发和测试，模拟Electron API
 */

import type { DocParserSchema } from './docParser.types'

interface DocParserMockData {
  defaultSchema: DocParserSchema
  savedSchemas: Record<string, string>
  sampleDocument: string
}

export const docParserMockData: DocParserMockData = {
  // 默认Schema模板
  defaultSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      chapters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            chapterTitle: {
              type: 'string',
              description: '章节标题',
              'x-parse': {
                regex: '^第[一二三四五六七八九十百]+章\\s+(.+)$',
                mode: 'extract',
                captureGroup: 1,
                conditions: { lineStart: true }
              },
              'x-export': {
                type: 'section-header',
                mergeCols: 3,
                format: {
                  bold: true,
                  fontSize: 14,
                  alignment: 'center',
                  background: '#f0f0f0'
                }
              }
            },
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  questionNumber: {
                    type: 'string',
                    description: '题号',
                    'x-parse': {
                      regex: '^(\\d+)、',
                      mode: 'extract',
                      captureGroup: 1
                    },
                    'x-export': {
                      type: 'column',
                      columnName: '题号',
                      order: 1,
                      width: 8,
                      format: {
                        alignment: 'center'
                      }
                    }
                  },
                  questionContent: {
                    type: 'string',
                    description: '题目内容',
                    'x-parse': {
                      regex: '^\\d+、(.+?)(?=\\n答[：:])',
                      flags: 's',
                      mode: 'extract',
                      captureGroup: 1
                    },
                    'x-export': {
                      type: 'column',
                      columnName: '题目',
                      order: 2,
                      width: 50
                    }
                  },
                  answer: {
                    type: 'string',
                    description: '答案',
                    'x-parse': {
                      regex: '答[：:]\\s*(.+?)(?=\\n\\d+、|\\n第[一二三四五六七八九十百]+章|$)',
                      flags: 's',
                      mode: 'extract',
                      captureGroup: 1
                    },
                    'x-export': {
                      type: 'column',
                      columnName: '答案',
                      order: 3,
                      width: 60
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  
  // 保存的Schema（模拟文件系统）
  savedSchemas: {},
  
  // 示例文档
  sampleDocument: `第一章 测试章节

1、这是第一个问题的内容？
答：这是第一个问题的答案。可以是多行的答案内容，
会一直持续到下一个问题或者下一个章节。

2、这是第二个问题的内容？
答：这是第二个问题的答案。

3、第三个问题的内容是什么？
答：第三个问题的答案在这里。

第二章 另一个章节

1、另一章的第一个问题？
答：另一章的第一个答案。

2、另一章的第二个问题？
答：另一章的第二个答案。

第三章 最后一章

1、最后一个问题？
答：最后一个答案。`
}

/**
 * 重置Mock数据（用于测试）
 */
export function resetDocParserMock() {
  docParserMockData.savedSchemas = {}
  console.log('[DocParser Mock] Mock数据已重置')
}

/**
 * 添加保存的Schema到Mock
 */
export function addMockSchema(path: string, schemaContent: string) {
  docParserMockData.savedSchemas[path] = schemaContent
  console.log('[DocParser Mock] Schema已添加:', path)
}

/**
 * 获取保存的Schema列表
 */
export function getMockSchemaList(): string[] {
  return Object.keys(docParserMockData.savedSchemas)
}

