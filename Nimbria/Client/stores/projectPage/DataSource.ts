import { Environment } from '@utils/environment';
import { MockFileAPI } from '@stores/MockData.vite';
import { docParserMockData, addMockSchema, getMockSchemaList } from './docParser/docParser.mock';

// 定义 Nimbria API 接口类型
interface MarkdownAPI {
  readFile?: (filePath: string, options?: { forceFullRead?: boolean }) => Promise<string>
  writeFile?: (filePath: string, content: string, options?: { createBackup?: boolean }) => Promise<{ success: boolean; error?: string }>
  getFileInfo?: (filePath: string) => Promise<{ success: boolean; data?: any; error?: string }>
  readFileRange?: (filePath: string, startLine: number, endLine: number) => Promise<{ success: boolean; data?: string; error?: string }>
  searchInFile?: (filePath: string, searchTerm: string, maxResults?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
}

interface FileAPI {
  createFile?: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
}

interface FileWatcherAPI {
  startWatch?: (watchPath: string, options?: any) => Promise<{ success: boolean; watcherId?: string; error?: string }>
  stopWatch?: (watcherId: string) => Promise<{ success: boolean; error?: string }>
  onFileChange?: (callback: (event: any) => void) => void
  removeFileChangeListener?: () => void
}

interface DocParserAPI {
  createSchema?: (projectPath: string, schemaName: string, template?: string) => Promise<string>
  loadSchema?: (schemaPath: string) => Promise<string>
  saveSchema?: (schemaPath: string, content: string) => Promise<boolean>
  listSchemas?: (projectPath: string) => Promise<string[]>
  selectSchemaFile?: (defaultPath?: string) => Promise<{ canceled: boolean; filePaths: string[] }>
  selectDocumentFile?: (defaultPath?: string) => Promise<{ canceled: boolean; filePaths: string[] }>
  selectExportPath?: (defaultPath?: string, fileName?: string) => Promise<{ canceled: boolean; filePath?: string }>
  readDocument?: (filePath: string) => Promise<string>
  saveExport?: (filePath: string, data: Uint8Array, format?: string) => Promise<boolean>
}

interface NimbriaAPI {
  markdown?: MarkdownAPI
  file?: FileAPI
  fileWatcher?: FileWatcherAPI
  docParser?: DocParserAPI
  getCurrentProjectPath?: () => string | null
}

/**
 * ProjectPage 数据源适配器
 * 根据环境自动选择真实后端或 Mock 数据
 * 
 * ⚠️ 注意：Electron 环境下使用 window.nimbria.markdown API（已存在的实现）
 */
class ProjectPageDataSource {
  /**
   * 获取文件树
   * 注意：Electron 环境需要调用 markdown.scanTree
   */
  async getFileTree() {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.getFileTree();
    }
    // Electron 环境：使用 markdown.scanTree（由 markdown.store 调用）
    throw new Error('getFileTree 应通过 markdown.store.initializeFileTree 调用');
  }

  /**
   * 获取文件内容
   */
  async getFileContent(filePath: string, options?: { forceFullRead?: boolean }) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.getFileContent(filePath);
    }
    // Electron 环境：使用原有的 markdown.readFile API
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined
    return nimbriaAPI?.markdown?.readFile(filePath, options);
  }

  /**
   * 🔥 获取文件信息（包含大文件检测）
   */
  async getFileInfo(filePath: string) {
    if (Environment.shouldUseMock()) {
      // Mock 环境返回模拟数据
      return {
        path: filePath,
        size: Math.random() * 10 * 1024 * 1024, // 随机大小
        isLarge: Math.random() > 0.7, // 30% 概率为大文件
        encoding: 'utf-8'
      };
    }
    
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.markdown?.getFileInfo) {
      throw new Error('File info API not available');
    }
    
    const result = await nimbriaAPI.markdown.getFileInfo(filePath);
    if (!result.success) {
      throw new Error(result.error || 'Failed to get file info');
    }
    
    return result.data;
  }

  /**
   * 🔥 读取文件指定范围
   */
  async readFileRange(filePath: string, startLine: number, endLine: number): Promise<string> {
    if (Environment.shouldUseMock()) {
      // Mock 环境返回模拟内容
      const lines = [];
      for (let i = startLine; i <= endLine; i++) {
        lines.push(`Line ${i}: Mock content for ${filePath}`);
      }
      return lines.join('\n');
    }
    
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.markdown?.readFileRange) {
      throw new Error('File range API not available');
    }
    
    const result = await nimbriaAPI.markdown.readFileRange(filePath, startLine, endLine);
    if (!result.success) {
      throw new Error(result.error || 'Failed to read file range');
    }
    
    return result.data || '';
  }

  /**
   * 🔥 在文件中搜索
   */
  async searchInFile(filePath: string, searchTerm: string, maxResults?: number) {
    if (Environment.shouldUseMock()) {
      // Mock 环境返回模拟搜索结果
      return [
        { line: 1, content: `Mock result containing ${searchTerm}`, index: 0 },
        { line: 5, content: `Another ${searchTerm} result`, index: 100 }
      ];
    }
    
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.markdown?.searchInFile) {
      throw new Error('Search API not available');
    }
    
    const result = await nimbriaAPI.markdown.searchInFile(filePath, searchTerm, maxResults);
    if (!result.success) {
      throw new Error(result.error || 'Failed to search in file');
    }
    
    return result.data || [];
  }

  /**
   * 保存文件
   */
  async saveFile(filePath: string, content: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.saveFile(filePath, content);
    }
    // Electron 环境：使用原有的 markdown.writeFile API
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined
    const result = await nimbriaAPI?.markdown?.writeFile(filePath, content, {
      createBackup: false
    });
    return result?.success || false;
  }

  /**
   * 创建文件
   */
  async createFile(path: string, name: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.createFile(path, name);
    }
    // Electron 环境：使用 file.createFile（如果存在）
    const fullPath = `${path}/${name}`;
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined
    const result = await nimbriaAPI?.file?.createFile(fullPath, '');
    if (!result?.success) {
      throw new Error(result?.error || 'Create file failed');
    }
    return {
      id: fullPath,
      name,
      path: fullPath,
      isFolder: false,
      metadata: {
        size: 0,
        mtime: new Date()
      }
    };
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.deleteFile(filePath);
    }
    // Electron 环境：保持原有逻辑（可能需要实现）
    throw new Error('deleteFile 需要在 Electron 环境中实现');
  }

  /**
   * 重命名文件
   */
  async renameFile(filePath: string, newName: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.renameFile(filePath, newName);
    }
    // Electron 环境：保持原有逻辑（可能需要实现）
    throw new Error('renameFile 需要在 Electron 环境中实现');
  }

  /**
   * 移动文件
   */
  async moveFile(filePath: string, targetPath: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.moveFile(filePath, targetPath);
    }
    // Electron 环境：保持原有逻辑（可能需要实现）
    throw new Error('moveFile 需要在 Electron 环境中实现');
  }

  // ==================== DocParser 专用方法 ====================
  
  /**
   * 创建新的 Schema
   * @param projectPath 项目路径
   * @param schemaName Schema 名称
   * @param template 模板类型（默认 'excel'）
   * @returns 创建的 Schema 文件路径
   */
  async createSchema(projectPath: string, schemaName: string, template: string = 'excel'): Promise<string> {
    if (Environment.shouldUseMock()) {
      const schemaPath = `${projectPath}/.docparser/schema/${schemaName}.schema.json`;
      addMockSchema(schemaPath, JSON.stringify(docParserMockData.defaultSchema, null, 2));
      return schemaPath;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.createSchema) {
      throw new Error('DocParser API not available');
    }
    return await nimbriaAPI.docParser.createSchema(projectPath, schemaName, template);
  }

  /**
   * 列出Schema文件
   * @param projectPath 项目路径
   * @returns Schema文件路径列表
   */
  async listSchemaFiles(projectPath: string): Promise<string[]> {
    if (Environment.shouldUseMock()) {
      return getMockSchemaList();
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.listSchemas) {
      throw new Error('DocParser API not available');
    }
    return await nimbriaAPI.docParser.listSchemas(projectPath);
  }

  /**
   * 加载Schema
   * @param schemaPath Schema文件路径
   * @returns Schema JSON字符串
   */
  async loadSchema(schemaPath: string): Promise<string> {
    if (Environment.shouldUseMock()) {
      const schema = docParserMockData.savedSchemas[schemaPath];
      if (!schema) {
        return JSON.stringify(docParserMockData.defaultSchema, null, 2);
      }
      return schema;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.loadSchema) {
      throw new Error('DocParser API not available');
    }
    return await nimbriaAPI.docParser.loadSchema(schemaPath);
  }

  /**
   * 保存Schema
   * @param schemaPath Schema文件路径
   * @param schemaContent Schema JSON字符串
   */
  async saveSchema(schemaPath: string, schemaContent: string): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      addMockSchema(schemaPath, schemaContent);
      return true;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.saveSchema) {
      throw new Error('DocParser API not available');
    }
    return await nimbriaAPI.docParser.saveSchema(schemaPath, schemaContent);
  }
  
  /**
   * 选择 Schema 文件（打开文件选择器）
   * @param defaultPath 默认路径
   * @returns 选中的文件路径，如果取消则返回 null
   */
  async selectSchemaFile(defaultPath?: string): Promise<string | null> {
    if (Environment.shouldUseMock()) {
      // Mock 环境：返回第一个 Schema
      const schemas = getMockSchemaList();
      return schemas.length > 0 ? schemas[0] : null;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.selectSchemaFile) {
      throw new Error('DocParser API not available');
    }
    const result = await nimbriaAPI.docParser.selectSchemaFile(defaultPath);
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  }

  /**
   * 选择待解析文档（打开文件选择器）
   * @param defaultPath 默认路径
   * @returns 选中的文件路径，如果取消则返回 null
   */
  async selectDocumentFile(defaultPath?: string): Promise<string | null> {
    if (Environment.shouldUseMock()) {
      return '/mock/document.txt';
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.selectDocumentFile) {
      throw new Error('DocParser API not available');
    }
    const result = await nimbriaAPI.docParser.selectDocumentFile(defaultPath);
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  }

  /**
   * 选择导出路径（保存文件对话框）
   * @param defaultPath 默认路径
   * @param fileName 默认文件名
   * @returns 选中的文件路径，如果取消则返回 null
   */
  async selectExportPath(defaultPath?: string, fileName: string = 'export.xlsx'): Promise<string | null> {
    if (Environment.shouldUseMock()) {
      return `/mock/exports/${fileName}`;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.selectExportPath) {
      throw new Error('DocParser API not available');
    }
    const result = await nimbriaAPI.docParser.selectExportPath(defaultPath, fileName);
    return result.canceled || !result.filePath ? null : result.filePath;
  }

  /**
   * 读取待解析的文档
   * @param filePath 文档路径
   * @returns 文档内容
   */
  async readDocumentFile(filePath: string): Promise<string> {
    if (Environment.shouldUseMock()) {
      return docParserMockData.sampleDocument;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.readDocument) {
      throw new Error('DocParser API not available');
    }
    return await nimbriaAPI.docParser.readDocument(filePath);
  }

  /**
   * 保存导出文件
   * @param filePath 导出文件路径
   * @param content 文件内容（Buffer或字符串）
   * @param format 文件格式（'xlsx' | 'csv'）
   */
  async saveExportedFile(filePath: string, content: ArrayBuffer | string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] 导出文件保存:', filePath, '格式:', format, '大小:', 
        content instanceof ArrayBuffer ? content.byteLength : content.length);
      return true;
    }
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    if (!nimbriaAPI?.docParser?.saveExport) {
      throw new Error('DocParser API not available');
    }
    // 转换为 Uint8Array
    const uint8Array = content instanceof ArrayBuffer 
      ? new Uint8Array(content) 
      : new TextEncoder().encode(content);
    return await nimbriaAPI.docParser.saveExport(filePath, uint8Array, format);
  }
}

// 导出单例
export default new ProjectPageDataSource();

