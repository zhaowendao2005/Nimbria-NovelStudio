/**
 * Nimbria Electron API 类型声明
 * 在渲染进程中可以通过 window.nimbria 访问这些API
 */

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
        create(projectPath: string): Promise<{success: boolean, message: string}>;
        open(projectPath: string): Promise<{success: boolean, message: string}>;
        getRecent(): Promise<Array<{id: string, name: string, path: string, lastOpened: string}>>;
      };
    };
  }
}

export {};
