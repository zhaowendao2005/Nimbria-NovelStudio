import type { JsonSchema, JsonSchemaField, JsonSchemaType } from './docParser.types'

// Tree 节点数据结构 - 统一设计
export interface TreeNodeData {
  id: string
  fieldName: string  // 用户输入的字段名
  fieldPath: string  // 完整路径（用于嵌套定位）
  type: JsonSchemaType
  items: any  // 节点内容：string/number等为undefined，array为[]，object为properties对象
  isRequired: boolean
  description?: string
  // 约束字段
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: any[]
  default?: any
  // 🆕 DocParser 扩展字段
  'x-parse'?: ParseMetadata
  'x-export'?: ExportMetadata
  // UI相关
  children?: TreeNodeData[]  // 子节点（用于树形展示）
  isEditing?: boolean  // 是否处于编辑状态
}

// 导入 ParseMetadata 和 ExportMetadata 类型
import type { ParseMetadata, ExportMetadata } from './docParser.types'

// 模板占位生成器
export const templateFactory = {
  // 创建模板节点（按LLM输出模板格式）
  createTemplateNode(fieldName: string, type: JsonSchemaType, path: string = ''): TreeNodeData {
    console.log('🏗️ [templateFactory] createTemplateNode 开始')
    console.log('📝 [templateFactory] 字段名:', fieldName)
    console.log('📝 [templateFactory] 类型:', type)
    console.log('📝 [templateFactory] 路径:', path)
    
    const baseNode: TreeNodeData = {
      id: `${path ? path + '.' : ''}${fieldName}_${Date.now()}`,
      fieldName,
      fieldPath: path ? `${path}.${fieldName}` : fieldName,
      type,
      items: this.getTemplateItems(type),
      isRequired: false,
      children: []
    }
    
    console.log('✅ [templateFactory] 创建的节点:', JSON.stringify(baseNode, null, 2))
    return baseNode
  },

  // 根据类型生成模板占位（统一LLM输出格式 - 所有类型都用items）
  getTemplateItems(type: JsonSchemaType): any {
    switch (type) {
      case 'string':
        return ""  // 字符串占位
      case 'number':
      case 'integer':
        return 0   // 数字占位
      case 'boolean':
        return false  // 布尔占位
      case 'object':
        return {}  // 对象占位
      case 'array':
        return []  // 数组固定为空数组，不指定元素类型
      default:
        return ""  // 默认字符串占位
    }
  },

  // 创建数组子元素（支持指定类型，默认object）
  createArrayItem(parentPath: string, index: number, childType: JsonSchemaType = 'object'): TreeNodeData {
    return this.createTemplateNode(`item${index}`, childType, parentPath)
  },

  // 创建对象属性
  createObjectProperty(fieldName: string, type: JsonSchemaType, parentPath: string): TreeNodeData {
    return this.createTemplateNode(fieldName, type, parentPath)
  }
}

// Schema 工具类
export const schemaUtils = {
  // 格式化 Schema 为 JSON 字符串
  formatSchemaToJson(schema: JsonSchema, indent: number = 2): string {
    return JSON.stringify(schema, null, indent)
  },

  // 从 JSON 字符串解析 Schema
  parseSchemaFromJson(jsonStr: string): JsonSchema | null {
    try {
      const parsed = JSON.parse(jsonStr)
      // 基本验证
      if (parsed && typeof parsed === 'object' && parsed.type) {
        return parsed as JsonSchema
      }
      return null
    } catch {
      return null
    }
  },

  // 验证字段名是否有效
  isValidFieldName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  },

  // 获取可用的字段类型
  getAvailableTypes(): Array<{ value: JsonSchemaType; label: string }> {
    return [
      { value: 'string', label: '字符串' },
      { value: 'number', label: '数字' },
      { value: 'integer', label: '整数' },
      { value: 'boolean', label: '布尔值' },
      { value: 'array', label: '数组' },
      { value: 'object', label: '对象' }
    ]
  },

  // 根据路径获取字段
  getFieldByPath(schema: JsonSchema, path: string): JsonSchemaField | null {
    if (!path) return schema

    const parts = path.split('.')
    let current: any = schema

    for (const part of parts) {
      if (part.endsWith('[]')) {
        // 数组项
        const fieldName = part.slice(0, -2)
        current = current.properties?.[fieldName]?.items
      } else {
        current = current.properties?.[part]
      }
      
      if (!current) return null
    }

    return current
  },

  // 根据路径设置字段
  setFieldByPath(schema: JsonSchema, path: string, field: JsonSchemaField): JsonSchema {
    const newSchema = JSON.parse(JSON.stringify(schema))
    
    if (!path) {
      return { ...field } as JsonSchema
    }

    const parts = path.split('.')
    let current: any = newSchema

    // 确保根级有 properties
    if (!current.properties) {
      current.properties = {}
    }

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (part.endsWith('[]')) {
        const fieldName = part.slice(0, -2)
        // 确保数组字段存在
        if (!current.properties[fieldName]) {
          current.properties[fieldName] = {
            type: 'array',
            items: { type: 'object', properties: {} }
          }
        }
        current = current.properties[fieldName].items
        // 确保 items 有 properties
        if (!current.properties) {
          current.properties = {}
        }
      } else {
        // 确保对象字段存在
        if (!current.properties[part]) {
          current.properties[part] = {
            type: 'object',
            properties: {}
          }
        }
        current = current.properties[part]
        // 确保对象有 properties
        if (!current.properties) {
          current.properties = {}
        }
      }
    }

    const lastPart = parts[parts.length - 1]
    if (lastPart.endsWith('[]')) {
      const fieldName = lastPart.slice(0, -2)
      // 确保数组字段存在
      if (!current.properties[fieldName]) {
        current.properties[fieldName] = {
          type: 'array',
          items: field
        }
      } else {
        current.properties[fieldName].items = field
      }
    } else {
      current.properties[lastPart] = field
    }

    return newSchema
  },

  // 根据路径删除字段
  deleteFieldByPath(schema: JsonSchema, path: string): JsonSchema {
    const newSchema = JSON.parse(JSON.stringify(schema))
    
    const parts = path.split('.')
    const fieldName = parts[parts.length - 1]
    
    if (parts.length === 1) {
      // 根级字段
      delete newSchema.properties[fieldName]
      newSchema.required = newSchema.required?.filter(f => f !== fieldName) || []
    } else {
      // 嵌套字段
      const parentPath = parts.slice(0, -1).join('.')
      const parent = this.getFieldByPath(newSchema, parentPath)
      
      if (parent?.properties) {
        delete parent.properties[fieldName]
        parent.required = parent.required?.filter(f => f !== fieldName) || []
      }
    }

    return newSchema
  },

  // 向指定路径添加字段
  addFieldToPath(schema: JsonSchema, parentPath: string, fieldName: string, field: JsonSchemaField): JsonSchema {
    const newSchema = JSON.parse(JSON.stringify(schema))
    
    if (!parentPath) {
      // 添加到根级
      if (!newSchema.properties) newSchema.properties = {}
      newSchema.properties[fieldName] = field
    } else {
      // 添加到嵌套路径
      const parent = this.getFieldByPath(newSchema, parentPath)
      if (parent) {
        if (!parent.properties) parent.properties = {}
        parent.properties[fieldName] = field
      }
    }

    return newSchema
  }
}

// Tree 转换器 - 重构版本
export const treeConverter = {
  // Schema → Tree 转换（统一节点结构）
  schemaToTreeData(schema: JsonSchema): TreeNodeData[] {
    const convertNode = (
      fieldName: string, 
      field: JsonSchemaField, 
      path: string, 
      parentRequired: string[] = []
    ): TreeNodeData => {
      // 创建基础节点
      const node: TreeNodeData = {
        id: `${path}_${Date.now()}_${Math.random()}`,
        fieldName,
        fieldPath: path,
        type: field.type,
        items: this.getNodeItems(field),
        isRequired: (field as any)?.required === true || (parentRequired || []).includes(fieldName),
        description: field.description,
        // 复制约束字段
        minimum: field.minimum,
        maximum: field.maximum,
        minLength: field.minLength,
        maxLength: field.maxLength,
        pattern: field.pattern,
        enum: field.enum,
        default: field.default,
        // 🆕 复制 DocParser 扩展字段
        'x-parse': (field as any)['x-parse'],
        'x-export': (field as any)['x-export'],
        children: []
      }
      
      // 🔍 调试日志
      if ((field as any)['x-parse'] || (field as any)['x-export']) {
        console.log('[treeConverter] 发现扩展字段:', {
          fieldName,
          'x-parse': (field as any)['x-parse'],
          'x-export': (field as any)['x-export']
        });
      }

      // 处理子节点（统一items格式）
      if (field.type === 'object' && (field as any).items && typeof (field as any).items === 'object' && !Array.isArray((field as any).items)) {
        // 对象类型：items是键值对字典（扁平字符串映射）
        node.children = Object.keys((field as any).items).map((name: string) => ({
          id: `${path}.${name}_${Date.now()}_${Math.random()}`,
          fieldName: name,
          fieldPath: path ? `${path}.${name}` : name,
          type: 'string',
          items: "",
          isRequired: false,
          description: undefined,
          children: []
        }))
      } else if (field.type === 'array' && (field as any).items && Array.isArray((field as any).items)) {
        // 数组类型：items是子项数组
        node.children = this.convertArrayItems((field as any).items, path, fieldName)
      } else if (field.type === 'object' && field.properties) {
        // 兼容传统properties格式
        node.children = Object.entries(field.properties).map(([name, subField]) =>
          convertNode(name, subField, path ? `${path}.${name}` : name, field.required)
        )
      } else if (field.type === 'array' && field.items && !Array.isArray(field.items)) {
        // 🔥 数组的 items 是对象类型（标准 JSON Schema 格式）
        const itemsField = field.items as JsonSchemaField
        
        // 如果 items 有 properties，递归处理其子字段
        if (itemsField.type === 'object' && itemsField.properties) {
          const itemNode = convertNode('items', itemsField, `${path}[]`, [])
          node.children = [itemNode]
        } else {
          // 简单类型的数组项
          node.children = []
        }
      }

      return node
    }

    // ✅ 修复：支持 array 和 object 两种根节点类型
    if (schema.type === 'array' && schema.items) {
      // 处理根节点为 array 的情况
      const itemsField = schema.items as JsonSchemaField
      
      if (itemsField.type === 'object' && itemsField.properties) {
        // array 的 items 是 object 类型，展开其 properties
        return Object.entries(itemsField.properties).map(([name, field]) =>
          convertNode(name, field, name, itemsField.required)
        )
      } else {
        // array 的 items 是简单类型，创建一个虚拟节点
        return [convertNode('items', itemsField, 'items', [])]
      }
    }
    
    // 处理根节点为 object 的情况
    if (!schema.properties) return []

    return Object.entries(schema.properties).map(([name, field]) =>
      convertNode(name, field, name, schema.required)
    )
  },

  // 获取节点的 items 值（统一处理）
  getNodeItems(field: JsonSchemaField): any {
    // 优先从field.items获取，如果没有则根据类型生成默认值
    if ((field as any).items !== undefined) {
      return (field as any).items
    }
    
    // 默认值生成
    switch (field.type) {
      case 'string':
        return ""
      case 'number':
      case 'integer':
        return 0
      case 'boolean':
        return false
      case 'array':
        return [] // 数组的 items 始终是空数组
      case 'object':
        return {} // 对象的 items 是空对象
      default:
        return ""
    }
  },

  // 转换数组项为子节点（统一items格式）
  convertArrayItems(items: any, parentPath: string, arrayName: string): TreeNodeData[] {
    if (Array.isArray(items)) {
      // items是数组，包含完整的子项定义
      return items.map((item, index) => ({
        id: `${parentPath}[${index}]_${Date.now()}`,
        fieldName: `item${index}`,
        fieldPath: `${parentPath}[${index}]`,
        type: item.type,
        items: item.items, // 直接使用子项的items
        isRequired: item.required || false,
        description: item.description,
        children: item.type === 'object' && item.items && typeof item.items === 'object' && !Array.isArray(item.items)
          ? Object.entries(item.items).map(([name, subField]: [string, any]) =>
              this.convertItemToNode(name, subField, `${parentPath}[${index}].${name}`)
            )
          : []
      }))
    } else {
      // items为空数组或其他，返回空
      return []
    }
  },

  // 转换items字段为TreeNode（新增辅助方法）
  convertItemToNode(fieldName: string, itemData: any, path: string): TreeNodeData {
    return {
      id: `${path}_${Date.now()}_${Math.random()}`,
      fieldName,
      fieldPath: path,
      type: itemData.type,
      items: itemData.items,
      isRequired: itemData.required || false,
      description: itemData.description,
      children: itemData.type === 'object' && itemData.items && typeof itemData.items === 'object'
        ? Object.entries(itemData.items).map(([name, subField]: [string, any]) =>
            this.convertItemToNode(name, subField, `${path}.${name}`)
          )
        : itemData.type === 'array' && Array.isArray(itemData.items)
        ? itemData.items.map((subItem: any, index: number) =>
            this.convertItemToNode(`item${index}`, subItem, `${path}[${index}]`)
          )
        : []
    }
  },

  // 辅助方法：递归转换节点
  convertNode(fieldName: string, field: JsonSchemaField, path: string, parentRequired: string[] = []): TreeNodeData {
    return this.schemaToTreeData({ type: 'object', properties: { [fieldName]: field }, required: parentRequired })[0]
  },

  // Tree → LLM输出模板转换
  treeDataToTemplate(treeData: TreeNodeData[]): Record<string, any> {
    const template: Record<string, any> = {}

    treeData.forEach(node => {
      template[node.fieldName] = this.nodeToTemplateField(node)
    })

    return template
  },

  // 单个节点转换为模板字段（统一使用items）
  nodeToTemplateField(node: TreeNodeData): any {
    const field: any = {
      type: node.type,
      items: node.items
    }

    // 为所有类型自动补齐占位值（避免遗漏）
    if (field.items === undefined) {
      field.items = templateFactory.getTemplateItems(node.type)
    }

    // 添加可选字段
    if (node.description) {
      field.description = node.description
    }
    if (node.isRequired) {
      field.required = true
    }

    // 数组处理：items应存储完整子项定义
    if (node.type === 'array' && node.children && node.children.length > 0) {
      field.items = node.children.map(child => this.nodeToTemplateField(child))
    }
    // 对象处理：items为扁平键值映射 { key: "" }
    else if (node.type === 'object' && node.children && node.children.length > 0) {
      const objectItems: Record<string, string> = {}
      node.children.forEach(child => {
        objectItems[child.fieldName] = ""
      })
      field.items = objectItems
    }

    return field
  },

  // 保持兼容并输出 LLM 模板结构的 Schema（字段内含 required 布尔与 item/items）
  treeDataToSchema(treeData: TreeNodeData[]): JsonSchema {
    const convertNodeToSchemaField = (node: TreeNodeData): JsonSchemaField => {
      // 基础字段（包含模板占位与布尔 required）
      const base: any = this.nodeToTemplateField(node)

      // 对象类型递归 children 为 properties
      if (node.type === 'object' && node.children && node.children.length > 0) {
        const childProps: Record<string, JsonSchemaField> = {}
        node.children.forEach(child => {
          childProps[child.fieldName] = convertNodeToSchemaField(child)
        })
        base.properties = childProps
      }

      return base as JsonSchemaField
    }

    const properties: Record<string, JsonSchemaField> = {}
    treeData.forEach(node => {
      properties[node.fieldName] = convertNodeToSchemaField(node)
    })

    // 根级不再强制输出 required 数组，避免与字段级 required 重复冲突
    const schema: JsonSchema = {
      type: 'object',
      properties
    }
    return schema
  },

  // 节点操作函数
  addChildToNode(parentNode: TreeNodeData, childType: JsonSchemaType, fieldName?: string): TreeNodeData {
    console.log('🔥 [treeConverter] addChildToNode 开始')
    console.log('📝 [treeConverter] 父节点:', JSON.stringify(parentNode, null, 2))
    console.log('📝 [treeConverter] 子节点类型:', childType)
    console.log('📝 [treeConverter] 指定字段名:', fieldName)
    
    if (parentNode.type === 'array') {
      console.log('📋 [treeConverter] 处理数组类型父节点')
      // 数组添加子元素（不指定类型，默认object）
      const index = parentNode.children?.length || 0
      console.log('📊 [treeConverter] 数组当前索引:', index)
      
      const newChild = templateFactory.createArrayItem(parentNode.fieldPath, index, childType)
      console.log('🆕 [treeConverter] 创建的数组子元素:', JSON.stringify(newChild, null, 2))
      
      if (fieldName) {
        newChild.fieldName = fieldName
        newChild.fieldPath = `${parentNode.fieldPath}[${index}]`
        console.log('📝 [treeConverter] 应用了指定字段名:', fieldName)
      }
      
      if (!parentNode.children) parentNode.children = []
      parentNode.children.push(newChild)
      console.log('✅ [treeConverter] 子元素已添加到数组')
      return newChild
      
    } else if (parentNode.type === 'object') {
      console.log('📁 [treeConverter] 处理对象类型父节点')
      // 对象添加属性
      const name = fieldName || `newField${(parentNode.children?.length || 0) + 1}`
      console.log('📝 [treeConverter] 确定使用字段名:', name)
      
      const newChild = templateFactory.createObjectProperty(name, childType, parentNode.fieldPath)
      console.log('🆕 [treeConverter] 创建的对象属性:', JSON.stringify(newChild, null, 2))
      
      if (!parentNode.children) parentNode.children = []
      parentNode.children.push(newChild)
      console.log('✅ [treeConverter] 属性已添加到对象')
      return newChild
    }
    
    console.error('❌ [treeConverter] 无法向此类型节点添加子节点:', parentNode.type)
    throw new Error(`Cannot add child to node of type: ${parentNode.type}`)
  },

  removeChildFromNode(parentNode: TreeNodeData, childId: string): boolean {
    if (!parentNode.children) return false
    
    const index = parentNode.children.findIndex(child => child.id === childId)
    if (index === -1) return false
    
    parentNode.children.splice(index, 1)
    return true
  },

  updateNodeField(node: TreeNodeData, updates: Partial<TreeNodeData>): TreeNodeData {
    return { ...node, ...updates }
  },

  changeNodeType(node: TreeNodeData, newType: JsonSchemaType): TreeNodeData {
    const updatedNode = { ...node }
    updatedNode.type = newType
    updatedNode.items = templateFactory.getTemplateItems(newType)
    
    // 类型改变时清理不适用的字段
    if (newType !== 'object' && newType !== 'array') {
      updatedNode.children = []
    }
    
    return updatedNode
  },

  // 重命名节点并级联更新路径
  renameNodeAndUpdatePath(treeData: TreeNodeData[], targetNodeId: string, newName: string): TreeNodeData[] {
    const recursiveRename = (nodes: TreeNodeData[], parentPath: string = ''): TreeNodeData[] => {
      return nodes.map(node => {
        if (node.id === targetNodeId) {
          // 找到目标节点，更新名称和路径
          const updatedNode = { ...node }
          updatedNode.fieldName = newName
          updatedNode.fieldPath = parentPath ? `${parentPath}.${newName}` : newName
          
          // 递归更新所有子节点的路径
          if (updatedNode.children) {
            updatedNode.children = this.updateChildrenPaths(updatedNode.children, updatedNode.fieldPath)
          }
          
          return updatedNode
        } else {
          // 非目标节点，递归处理子节点
          const updatedNode = { ...node }
          if (updatedNode.children) {
            updatedNode.children = recursiveRename(updatedNode.children, node.fieldPath)
          }
          return updatedNode
        }
      })
    }
    
    return recursiveRename(treeData)
  },

  // 更新所有子节点的路径（级联）
  updateChildrenPaths(children: TreeNodeData[], parentPath: string): TreeNodeData[] {
    return children.map(child => {
      const updatedChild = { ...child }
      updatedChild.fieldPath = `${parentPath}.${child.fieldName}`
      
      if (updatedChild.children) {
        updatedChild.children = this.updateChildrenPaths(updatedChild.children, updatedChild.fieldPath)
      }
      
      return updatedChild
    })
  },

  // 获取节点显示信息
  getNodeDisplayInfo(node: TreeNodeData) {
    // 导入图标组件名称（这些将在组件中解析为实际组件）
    const iconMap = {
      string: 'Document',
      number: 'DataBoard', 
      integer: 'DataBoard',
      boolean: 'Switch',
      array: 'List',
      object: 'Files'
    }

    // 颜色映射
    const colorMap = {
      string: '#409eff',
      number: '#67c23a', 
      integer: '#67c23a',
      boolean: '#e6a23c',
      array: '#f56c6c',
      object: '#909399'
    }

    // 获取类型文本（模板格式显示）
    const getTypeText = (nodeType: JsonSchemaType, items: any): string => {
      if (nodeType === 'array') {
        return 'array[]'  // 数组统一显示为 array[]
      }
      return nodeType
    }

    // 检查是否可以添加子字段
    const canAddChild = node.type === 'object' || node.type === 'array'

    // 检查是否有描述
    const hasDescription = !!(node.description)

    // 检查是否有约束条件
    const hasConstraints = !!(
      node.minimum !== undefined ||
      node.maximum !== undefined ||
      node.minLength !== undefined ||
      node.maxLength !== undefined ||
      node.pattern ||
      node.enum
    )

    // 生成约束文本
    const getConstraintText = (): string => {
      const constraints: string[] = []

      if (node.minimum !== undefined) constraints.push(`min: ${node.minimum}`)
      if (node.maximum !== undefined) constraints.push(`max: ${node.maximum}`)
      if (node.minLength !== undefined) constraints.push(`minLen: ${node.minLength}`)
      if (node.maxLength !== undefined) constraints.push(`maxLen: ${node.maxLength}`)
      if (node.pattern) constraints.push(`pattern: ${node.pattern}`)
      if (node.enum) constraints.push(`enum: [${node.enum.join(', ')}]`)

      return constraints.join(', ')
    }

    // 🆕 检查是否有解析规则
    const hasParseRule = !!(node['x-parse'])
    
    // 🆕 检查是否有导出配置
    const hasExportConfig = !!(node['x-export'])
    
    // 🆕 生成解析规则摘要
    const getParseRuleSummary = (): string => {
      if (!node['x-parse']) return ''
      const parse = node['x-parse']
      const parts: string[] = []
      if (parse.regex) parts.push(`regex: ${parse.regex.substring(0, 30)}...`)
      if (parse.mode) parts.push(`mode: ${parse.mode}`)
      return parts.join(', ')
    }
    
    // 🆕 生成导出配置摘要
    const getExportConfigSummary = (): string => {
      if (!node['x-export']) return ''
      const exp = node['x-export']
      const parts: string[] = []
      if (exp.type) parts.push(`type: ${exp.type}`)
      if (exp.columnName) parts.push(`col: ${exp.columnName}`)
      if (exp.order !== undefined) parts.push(`order: ${exp.order}`)
      return parts.join(', ')
    }

    return {
      icon: iconMap[node.type] || 'Document',
      color: colorMap[node.type] || '#909399',
      typeText: getTypeText(node.type, node.items),
      hasDescription,
      canAddChild,
      hasConstraints,
      constraintText: hasConstraints ? getConstraintText() : '',
      // 🆕 DocParser 扩展信息
      hasParseRule,
      parseRuleSummary: hasParseRule ? getParseRuleSummary() : '',
      hasExportConfig,
      exportConfigSummary: hasExportConfig ? getExportConfigSummary() : ''
    }
  },

  // 兼容性方法别名 - 保持向后兼容
  jsonSchemaToTreeData(schema: JsonSchema): TreeNodeData[] {
    return this.schemaToTreeData(schema)
  }
}

// Schema 生成器
export const schemaGenerator = {
  // 从 JSON 数据生成 Schema
  generateSchemaFromJson(data: any, options: {
    includeDescriptions?: boolean
    includeExamples?: boolean
    strictMode?: boolean
  } = {}): JsonSchema {
    const generateFieldSchema = (value: any): JsonSchemaField => {
      if (value === null || value === undefined) {
        return { type: 'string' }
      }

      if (typeof value === 'string') {
        return { type: 'string' }
      }

      if (typeof value === 'number') {
        return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
      }

      if (typeof value === 'boolean') {
        return { type: 'boolean' }
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          return { type: 'array', items: { type: 'string' } }
        }
        return {
          type: 'array',
          items: generateFieldSchema(value[0])
        }
      }

      if (typeof value === 'object') {
        const properties: Record<string, JsonSchemaField> = {}
        const required: string[] = []

        for (const [key, val] of Object.entries(value)) {
          properties[key] = generateFieldSchema(val)
          if (options.strictMode && val !== null && val !== undefined) {
            required.push(key)
          }
        }

        return {
          type: 'object',
          properties,
          required: required.length > 0 ? required : undefined
        } as JsonSchemaField
      }

      return { type: 'string' }
    }

    const schema = generateFieldSchema(data) as JsonSchema
    schema.required = schema.required || []
    
    return schema
  }
}

