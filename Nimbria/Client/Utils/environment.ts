/**
 * 环境检测工具
 */
export const Environment = {
  /**
   * 是否为 Electron 环境
   */
  isElectron(): boolean {
    return typeof window !== 'undefined' && 
           window.nimbria !== undefined;
  },

  /**
   * 是否应该使用 Mock 数据
   * 在浏览器环境（非 Electron）下使用 Mock
   */
  shouldUseMock(): boolean {
    return !this.isElectron();
  },

  /**
   * 获取环境名称（用于调试）
   */
  getEnvironmentName(): string {
    if (this.isElectron()) return 'Electron';
    return 'Vite (Mock Data)';
  }
};

