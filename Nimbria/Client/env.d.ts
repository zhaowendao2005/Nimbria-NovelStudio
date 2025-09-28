declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

declare interface NimbriaWindowAPI {
  window: {
    minimize(): Promise<void>;
    close(): Promise<void>;
    maximize(): Promise<void>;
    unmaximize(): Promise<void>;
    isMaximized(): Promise<boolean>;
  };
  project: {
    create(projectPath: string): Promise<{ success: boolean; message: string }>;
    open(projectPath: string): Promise<{ success: boolean; message: string }>;
    getRecent(): Promise<Array<{ id: string; name: string; path: string; lastOpened: string }>>;
  };
}

declare interface Window {
  nimbria?: NimbriaWindowAPI;
}