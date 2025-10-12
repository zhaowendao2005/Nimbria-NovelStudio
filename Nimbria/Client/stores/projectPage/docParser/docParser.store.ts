/**
 * DocParser Store
 * 文档解析器状态管理
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { debounce } from 'lodash-es'
import { useQuasar } from 'quasar'
import DataSource from '@stores/projectPage/DataSource'
import type { 
  DocParserSchema, 
  ParsedData, 
  ExportConfig,
  JsonSchema 
} from './docParser.types'

export const useDocParserStore = defineStore('projectPage-docParser', () => {
  const $q = useQuasar()
  
  // ==================== 状态 ====================
  
  const projectPath = ref<string>('')
  const currentSchema = ref<DocParserSchema | null>(null)
  const currentSchemaPath = ref<string | null>(null) // 当前 Schema 文件路径
  const isDirty = ref<boolean>(false) // 是否有未保存的更改
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
   * 防抖保存函数（3秒延迟）
   */
  const debouncedSave = debounce(async () => {
    if (!currentSchemaPath.value || !isDirty.value) return
    
    try {
      console.log('[DocParser Store] 开始自动保存 Schema:', currentSchemaPath.value)
      
      const schemaContent = JSON.stringify(currentSchema.value, null, 2)
      await DataSource.saveSchema(currentSchemaPath.value, schemaContent)
      
      isDirty.value = false
      console.log('[DocParser Store] Schema 自动保存成功')
      
      $q.notify({
        type: 'positive',
        message: 'Schema 已自动保存',
        position: 'bottom-right',
        timeout: 1000
      })
    } catch (err) {
      console.error('[DocParser Store] Schema 自动保存失败:', err)
      $q.notify({
        type: 'negative',
        message: `自动保存失败: ${err}`,
        position: 'bottom-right'
      })
    }
  }, 3000)
  
  /**
   * 更新Schema（触发自动保存）
   */
  const updateSchema = (schema: JsonSchema) => {
    currentSchema.value = schema as DocParserSchema
    isDirty.value = true
    console.log('[DocParser Store] Schema已更新，触发自动保存')
    debouncedSave()
  }
  
  /**
   * 更新Schema内容（提供字符串接口，用于 Monaco Editor）
   */
  const updateSchemaContent = (content: string) => {
    try {
      // 验证 JSON 格式
      const schema = JSON.parse(content)
      currentSchema.value = schema as DocParserSchema
      isDirty.value = true
      console.log('[DocParser Store] Schema 内容已更新，触发自动保存')
      debouncedSave()
    } catch (err) {
      console.error('[DocParser Store] Schema JSON 格式错误:', err)
      throw new Error(`JSON 格式错误: ${err}`)
    }
  }
  
  /**
   * 加载 Schema 文件
   */
  const loadSchemaFile = async (schemaPath: string) => {
    try {
      loading.value = true
      console.log('[DocParser Store] 加载 Schema 文件:', schemaPath)
      
      const content = await DataSource.loadSchema(schemaPath)
      const schema = JSON.parse(content)
      
      currentSchema.value = schema as DocParserSchema
      currentSchemaPath.value = schemaPath
      isDirty.value = false
      
      console.log('[DocParser Store] Schema 文件加载成功')
      $q.notify({
        type: 'positive',
        message: 'Schema 加载成功',
        position: 'bottom-right'
      })
    } catch (err) {
      error.value = `加载 Schema 失败: ${err}`
      console.error('[DocParser Store] 加载 Schema 失败:', err)
      $q.notify({
        type: 'negative',
        message: `加载 Schema 失败: ${err}`,
        position: 'bottom-right'
      })
      throw err
    } finally {
      loading.value = false
    }
  }
  
  /**
   * 清空Schema
   */
  const clearSchema = () => {
    currentSchema.value = null
    currentSchemaPath.value = null
    isDirty.value = false
    console.log('[DocParser Store] Schema已清空')
  }
  
  /**
   * 手动保存 Schema
   */
  const saveSchema = async () => {
    if (!currentSchemaPath.value) {
      throw new Error('没有指定 Schema 文件路径')
    }
    
    try {
      loading.value = true
      console.log('[DocParser Store] 手动保存 Schema:', currentSchemaPath.value)
      
      const schemaContent = JSON.stringify(currentSchema.value, null, 2)
      await DataSource.saveSchema(currentSchemaPath.value, schemaContent)
      
      isDirty.value = false
      console.log('[DocParser Store] Schema 保存成功')
      
      $q.notify({
        type: 'positive',
        message: 'Schema 保存成功',
        position: 'bottom-right'
      })
    } catch (err) {
      error.value = `保存 Schema 失败: ${err}`
      console.error('[DocParser Store] 保存 Schema 失败:', err)
      $q.notify({
        type: 'negative',
        message: `保存 Schema 失败: ${err}`,
        position: 'bottom-right'
      })
      throw err
    } finally {
      loading.value = false
    }
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
    currentSchemaPath.value = null
    isDirty.value = false
    selectedFilePath.value = ''
    sourceContent.value = ''
    parsedData.value = null
    exportConfig.value = null
    loading.value = false
    error.value = null
    
    // 取消未执行的防抖保存
    debouncedSave.cancel()
    
    console.log('[DocParser Store] 所有状态已重置')
  }
  
  // ==================== 返回 ====================
  
  return {
    // 状态
    projectPath,
    currentSchema,
    currentSchemaPath,
    isDirty,
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
    updateSchemaContent,
    loadSchemaFile,
    saveSchema,
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

