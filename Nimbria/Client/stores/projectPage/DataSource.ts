import { Environment } from '@utils/environment';
import { MockFileAPI } from '@stores/MockData.vite';

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
    return (window.nimbria as any)?.markdown?.readFile(filePath);
  }

  /**
   * 保存文件
   */
  async saveFile(filePath: string, content: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.saveFile(filePath, content);
    }
    // Electron 环境：使用原有的 markdown.writeFile API
    const result = await (window.nimbria as any)?.markdown?.writeFile(filePath, content, {
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
    const result = await (window.nimbria as any)?.file?.createFile(fullPath, '');
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
}

// 导出单例
export default new ProjectPageDataSource();

