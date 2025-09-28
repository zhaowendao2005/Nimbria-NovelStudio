/**
 * This file is used specifically for security reasons.
 * Here you can access Nodejs stuff and inject functionality into
 * the renderer thread (accessible there through the "window" object)
 *
 * WARNING!
 * If you import anything from node_modules, then make sure that the package is specified
 * in package.json > dependencies and NOT in devDependencies
 */

import { contextBridge, ipcRenderer } from 'electron';

// 窗口控制API
contextBridge.exposeInMainWorld('nimbria', {
  window: {
    minimize: () => ipcRenderer.invoke('window-minimize'),
    close: () => ipcRenderer.invoke('window-close'),
    maximize: () => ipcRenderer.invoke('window-maximize'),
    unmaximize: () => ipcRenderer.invoke('window-unmaximize'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  },
  
  // 项目管理API（暂时为空，后续扩展）
  project: {
    create: (projectPath: string) => ipcRenderer.invoke('project-create', projectPath),
    open: (projectPath: string) => ipcRenderer.invoke('project-open', projectPath),
    getRecent: () => ipcRenderer.invoke('project-get-recent'),
  }
});

// 项目接口类型定义
interface ProjectResult {
  success: boolean;
  message: string;
}

interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
}

// 类型声明
declare global {
  interface Window {
    nimbria: {
      window: {
        minimize(): Promise<void>;
        close(): Promise<void>;
        maximize(): Promise<void>;
        unmaximize(): Promise<void>;
        isMaximized(): Promise<boolean>;
      };
      project: {
        create(projectPath: string): Promise<ProjectResult>;
        open(projectPath: string): Promise<ProjectResult>;
        getRecent(): Promise<RecentProject[]>;
      };
    };
  }
}
