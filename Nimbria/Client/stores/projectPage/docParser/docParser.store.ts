/**
 * DocParser Store
 * 文档解析器状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  DocParserSchema, 
  ParsedData, 
  ExportConfig,
  JsonSchema 
} from './docParser.types'

export const useDocParserStore = defineStore('projectPage-docParser', () => {
  // ==================== 状态 ====================
  
  const projectPath = ref<string>('')
  const currentSchema = ref<DocParserSchema | null>(null)
  const selectedFilePath = ref<string>('')
  const sourceContent = ref<string>('')
  const parsedData = ref<ParsedData | null>(null)
  const exportConfig = ref<ExportConfig | null>(null)
  
  const loading = ref<boolean>(false)
  const error = ref<string | null>(null)
  
  // ==================== 计算属性 ====================
  
  const isSchemaValid = computed(() => {
    return currentSchema.value && currentSchema.value.properties
  })
  
  const canParse = computed(() => {
    return isSchemaValid.value && sourceContent.value.length > 0
  })
  
  const canExport = computed(() => {
    return parsedData.value !== null
  })
  
  // ==================== 方法 ====================
  
  /**
   * 初始化项目路径
   */
  const initProject = (path: string) => {
    projectPath.value = path
    console.log('[DocParser Store] 初始化项目路径:', path)
  }
  
  /**
   * 更新Schema
   */
  const updateSchema = (schema: JsonSchema) => {
    currentSchema.value = schema as DocParserSchema
    console.log('[DocParser Store] Schema已更新')
  }
  
  /**
   * 清空Schema
   */
  const clearSchema = () => {
    currentSchema.value = null
    console.log('[DocParser Store] Schema已清空')
  }
  
  /**
   * 加载文档内容
   */
  const loadDocument = async (content: string) => {
    try {
      loading.value = true
      sourceContent.value = content
      console.log('[DocParser Store] 文档内容已加载，长度:', content.length)
    } catch (err) {
      error.value = `加载文档失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 选择文档文件
   */
  const selectDocument = async (filePath: string) => {
    try {
      loading.value = true
      selectedFilePath.value = filePath
      console.log('[DocParser Store] 文档已选择:', filePath)
      // 实际读取文件内容通过外部调用loadDocument
    } catch (err) {
      error.value = `选择文档失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 解析文档
   * 注意：实际解析逻辑在 docParser.parser.ts 中
   */
  const parse = async () => {
    if (!canParse.value) {
      throw new Error('解析条件不满足：需要有效的Schema和文档内容')
    }
    
    try {
      loading.value = true
      console.log('[DocParser Store] 开始解析文档...')
      
      // 解析逻辑将由外部调用 docParser.parser.ts 的 parseDocument 函数
      // 这里只是状态管理
      
      // 解析完成后会通过 setParseResult 设置结果
    } catch (err) {
      error.value = `解析失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 设置解析结果
   */
  const setParseResult = (data: ParsedData) => {
    parsedData.value = data
    console.log('[DocParser Store] 解析结果已设置')
    
    // 自动提取导出配置
    if (currentSchema.value) {
      exportConfig.value = extractExportConfigFromSchema(currentSchema.value)
    }
  }
  
  /**
   * 清空解析结果
   */
  const clearParseResult = () => {
    parsedData.value = null
    exportConfig.value = null
    console.log('[DocParser Store] 解析结果已清空')
  }
  
  /**
   * 从 Schema 提取导出配置
   */
  const extractExportConfigFromSchema = (schema: DocParserSchema): ExportConfig => {
    const config: ExportConfig = {
      columns: [],
      sectionHeaders: []
    }
    
    const traverse = (node: any, path: string[]) => {
      if (node['x-export']) {
        const exportMeta = node['x-export']
        
        if (exportMeta.type === 'column') {
          config.columns.push({
            field: [...path],
            name: exportMeta.columnName || path[path.length - 1],
            order: exportMeta.order || 999,
            width: exportMeta.width || 15,
            format: exportMeta.format
          })
        } else if (exportMeta.type === 'section-header') {
          config.sectionHeaders.push({
            field: [...path],
            mergeCols: exportMeta.mergeCols || 1,
            format: exportMeta.format
          })
        }
      }
      
      if (node.properties) {
        Object.entries(node.properties).forEach(([key, subNode]) => {
          traverse(subNode, [...path, key])
        })
      }
      
      if (node.items && !Array.isArray(node.items)) {
        traverse(node.items, [...path, '[]'])
      }
    }
    
    if (schema.properties) {
      traverse(schema, [])
    }
    
    // 按 order 排序
    config.columns.sort((a, b) => a.order - b.order)
    
    console.log('[DocParser Store] 导出配置已提取:', config)
    return config
  }
  
  /**
   * 导出Excel
   * 注意：实际导出逻辑在 docParser.exporter.ts 中
   */
  const exportExcel = async (outputPath: string) => {
    if (!canExport.value || !exportConfig.value) {
      throw new Error('导出条件不满足')
    }
    
    try {
      loading.value = true
      console.log('[DocParser Store] 开始导出Excel...')
      
      // 导出逻辑将由外部调用 docParser.exporter.ts 的 exportToExcel 函数
      // 这里只是状态管理
      
    } catch (err) {
      error.value = `导出失败: ${err}`
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 清空错误信息
   */
  const clearError = () => {
    error.value = null
  }
  
  /**
   * 重置所有状态
   */
  const reset = () => {
    currentSchema.value = null
    selectedFilePath.value = ''
    sourceContent.value = ''
    parsedData.value = null
    exportConfig.value = null
    loading.value = false
    error.value = null
    console.log('[DocParser Store] 所有状态已重置')
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    projectPath,
    currentSchema,
    selectedFilePath,
    sourceContent,
    parsedData,
    exportConfig,
    loading,
    error,
    
    // 计算属性
    isSchemaValid,
    canParse,
    canExport,
    
    // 方法
    initProject,
    updateSchema,
    clearSchema,
    loadDocument,
    selectDocument,
    parse,
    setParseResult,
    clearParseResult,
    exportExcel,
    clearError,
    reset
  }
})

