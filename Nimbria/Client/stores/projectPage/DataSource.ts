import { Environment } from '@utils/environment';
import { MockFileAPI } from '@stores/MockData.vite';
import { docParserMockData, addMockSchema, getMockSchemaList } from './docParser/docParser.mock';

// 定义 Nimbria API 接口类型
interface MarkdownAPI {
  readFile?: (filePath: string) => Promise<string>
  writeFile?: (filePath: string, content: string, options?: { createBackup?: boolean }) => Promise<{ success: boolean; error?: string }>
}

interface FileAPI {
  createFile?: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>
}

interface NimbriaAPI {
  markdown?: MarkdownAPI
  file?: FileAPI
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
  async getFileContent(filePath: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.getFileContent(filePath);
    }
    // Electron 环境：使用原有的 markdown.readFile API
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined
    return nimbriaAPI?.markdown?.readFile(filePath);
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
   * 列出Schema文件
   * @param projectPath 项目路径
   * @returns Schema文件路径列表
   */
  async listSchemaFiles(projectPath: string): Promise<string[]> {
    if (Environment.shouldUseMock()) {
      return getMockSchemaList();
    }
    // Electron 环境：读取 .docparser 目录
    // 需要实现：window.nimbria.file.listFiles(projectPath + '/.docparser')
    throw new Error('listSchemaFiles 需要在 Electron 环境中实现');
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
        // 返回默认Schema
        return JSON.stringify(docParserMockData.defaultSchema, null, 2);
      }
      return schema;
    }
    // Electron 环境：使用 markdown.readFile 读取schema
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    const content = await nimbriaAPI?.markdown?.readFile(schemaPath);
    if (!content) {
      throw new Error('Failed to load schema');
    }
    return content;
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
    // Electron 环境：使用 markdown.writeFile 保存
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    const result = await nimbriaAPI?.markdown?.writeFile(schemaPath, schemaContent, {
      createBackup: false
    });
    return result?.success || false;
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
    // Electron 环境：使用 markdown.readFile
    const nimbriaAPI = window.nimbria as NimbriaAPI | undefined;
    const content = await nimbriaAPI?.markdown?.readFile(filePath);
    if (!content) {
      throw new Error('Failed to read document');
    }
    return content;
  }

  /**
   * 保存导出文件
   * @param filePath 导出文件路径
   * @param content 文件内容（Buffer或字符串）
   */
  async saveExportedFile(filePath: string, content: ArrayBuffer | string): Promise<boolean> {
    if (Environment.shouldUseMock()) {
      console.log('[Mock] 导出文件保存:', filePath, '大小:', 
        content instanceof ArrayBuffer ? content.byteLength : content.length);
      return true;
    }
    // Electron 环境：需要实现二进制文件写入
    // 可能需要：window.nimbria.file.writeBuffer(filePath, content)
    throw new Error('saveExportedFile 需要在 Electron 环境中实现');
  }
}

// 导出单例
export default new ProjectPageDataSource();

