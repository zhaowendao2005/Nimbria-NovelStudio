import { Environment } from '@utils/environment';
import { MockFileAPI } from '@stores/MockData.vite';

/**
 * ProjectPage 数据源适配器
 * 根据环境自动选择真实后端或 Mock 数据
 */
class ProjectPageDataSource {
  /**
   * 获取文件树
   * 注意：此方法需要后端实现，这里提供 Mock 支持
   */
  async getFileTree() {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.getFileTree();
    }
    // TODO: 实现真实的文件树获取逻辑，使用 window.nimbria.fs.readDir 递归构建
    throw new Error('getFileTree 需要在 Electron 环境中实现');
  }

  /**
   * 获取文件内容
   */
  async getFileContent(filePath: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.getFileContent(filePath);
    }
    return window.nimbria.fs.readFile(filePath);
  }

  /**
   * 保存文件
   */
  async saveFile(filePath: string, content: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.saveFile(filePath, content);
    }
    await window.nimbria.fs.writeFile(filePath, content);
    return true;
  }

  /**
   * 创建文件
   */
  async createFile(path: string, name: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.createFile(path, name);
    }
    const fullPath = `${path}/${name}`;
    await window.nimbria.fs.writeFile(fullPath, '');
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
    await window.nimbria.fs.delete(filePath);
    return true;
  }

  /**
   * 重命名文件
   * 注意：通过移动实现重命名
   */
  async renameFile(filePath: string, newName: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.renameFile(filePath, newName);
    }
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    const newPath = `${dir}/${newName}`;
    await window.nimbria.fs.move(filePath, newPath);
    return true;
  }

  /**
   * 移动文件
   */
  async moveFile(filePath: string, targetPath: string) {
    if (Environment.shouldUseMock()) {
      return MockFileAPI.moveFile(filePath, targetPath);
    }
    await window.nimbria.fs.move(filePath, targetPath);
    return true;
  }
}

// 导出单例
export default new ProjectPageDataSource();

