import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform();

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let mainWindow: BrowserWindow | undefined;

async function createWindow() {
  /**
   * Initial window options
   */
  console.log('🏗️ 创建主窗口...');
  mainWindow = new BrowserWindow({
    icon: path.resolve(currentDir, 'icons/icon.png'), // tray icon
    width: 1024,     // 更大的默认宽度
    height: 720,     // 更大的默认高度
    minWidth: 900,   // 最小宽度限制
    minHeight: 620,  // 最小高度限制
    maxWidth: 1120,  // 最大宽度限制（固定窗口范围）
    maxHeight: 820,  // 最大高度限制
    resizable: false, // 固定大小，不允许调整
    useContentSize: true,
    frame: false,    // 无边框窗口
    titleBarStyle: 'hidden', // 隐藏标题栏
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !!(process.env.DEV || process.env.DEBUGGING), // 明确启用开发者工具
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.resolve(
        currentDir,
        path.join(process.env.QUASAR_ELECTRON_PRELOAD_FOLDER, 'electron-preload' + process.env.QUASAR_ELECTRON_PRELOAD_EXTENSION)
      ),
    },
  });

  console.log('✅ 主窗口创建完成');

  if (process.env.DEV) {
    await mainWindow.loadURL(process.env.APP_URL);
  } else {
    await mainWindow.loadFile('index.html');
  }

  // 调试信息：输出环境变量状态
  console.log('🔍 Debug Info:');
  console.log('  DEV:', process.env.DEV);
  console.log('  DEBUGGING:', process.env.DEBUGGING);
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  devTools enabled:', process.env.DEV || process.env.DEBUGGING);

  if (process.env.DEV || process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    console.log('🛠️ 开发模式：自动打开开发者工具');
    mainWindow.webContents.openDevTools();
  } else {
    // we're on production; no access to devtools pls
    console.log('🔒 生产模式：禁用开发者工具');
    mainWindow.webContents.on('devtools-opened', () => {
      console.log('⚠️ 尝试打开开发者工具，但被阻止');
      mainWindow?.webContents.closeDevTools();
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  // 注册F12快捷键用于开发者工具
  if (process.env.DEV || process.env.DEBUGGING) {
    console.log('🎹 尝试注册F12快捷键...');
    const registered = globalShortcut.register('F12', () => {
      console.log('⚡ F12 按键被触发!');
      if (mainWindow) {
        const isOpen = mainWindow.webContents.isDevToolsOpened();
        console.log('  当前开发者工具状态:', isOpen ? '已打开' : '已关闭');
        if (isOpen) {
          console.log('  关闭开发者工具...');
          mainWindow.webContents.closeDevTools();
        } else {
          console.log('  打开开发者工具...');
          mainWindow.webContents.openDevTools();
        }
      } else {
        console.log('⚠️ mainWindow不存在');
      }
    });
    
    if (registered) {
      console.log('✅ F12快捷键注册成功');
    } else {
      console.log('❌ F12快捷键注册失败 - 可能被其他应用占用');
      console.log('💡 尝试注册备用快捷键 Ctrl+Shift+I...');
      const backupRegistered = globalShortcut.register('Ctrl+Shift+I', () => {
        console.log('⚡ 备用快捷键 Ctrl+Shift+I 被触发!');
        if (mainWindow) {
          const isOpen = mainWindow.webContents.isDevToolsOpened();
          if (isOpen) {
            mainWindow.webContents.closeDevTools();
          } else {
            mainWindow.webContents.openDevTools();
          }
        }
      });
      
      if (backupRegistered) {
        console.log('✅ 备用快捷键 Ctrl+Shift+I 注册成功');
      } else {
        console.log('❌ 备用快捷键 Ctrl+Shift+I 也注册失败');
      }
    }
  } else {
    console.log('🚫 不在开发模式，跳过F12快捷键注册');
  }

  // 监听开发者工具状态变化
  mainWindow.webContents.on('devtools-opened', () => {
    console.log('📖 开发者工具已打开');
  });

  mainWindow.webContents.on('devtools-closed', () => {
    console.log('📕 开发者工具已关闭');
  });

  mainWindow.webContents.on('devtools-focused', () => {
    console.log('🎯 开发者工具获得焦点');
  });

  // 添加窗口事件监听
  mainWindow.on('focus', () => {
    console.log('🔷 主窗口获得焦点');
  });

  mainWindow.on('blur', () => {
    console.log('🔹 主窗口失去焦点');
  });

  // 备用方案：监听网页内的键盘事件
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && (process.env.DEV || process.env.DEBUGGING) && mainWindow) {
      console.log('🔄 备用方案：检测到F12按键事件');
      event.preventDefault();
      const isOpen = mainWindow.webContents.isDevToolsOpened();
      if (isOpen) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools();
      }
    }
  });
}

// 设置IPC处理器
function setupIpcHandlers() {
  // 窗口控制处理器
  ipcMain.handle('window-minimize', () => {
    console.log('📉 窗口最小化请求');
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window-close', () => {
    console.log('❌ 窗口关闭请求');
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window-maximize', () => {
    console.log('📈 窗口最大化请求');
    if (mainWindow) {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window-unmaximize', () => {
    console.log('📉 窗口还原请求');
    if (mainWindow) {
      mainWindow.unmaximize();
    }
  });

  ipcMain.handle('window-is-maximized', () => {
    console.log('❓ 检查窗口是否最大化');
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // 项目管理处理器（暂时为空实现）
  ipcMain.handle('project-create', (event, projectPath: string) => {
    console.log('🏗️ 创建项目请求:', projectPath);
    // TODO: 实现项目创建逻辑
    return { success: true, message: '项目创建功能尚未实现' };
  });

  ipcMain.handle('project-open', (event, projectPath: string) => {
    console.log('📂 打开项目请求:', projectPath);
    // TODO: 实现项目打开逻辑
    return { success: true, message: '项目打开功能尚未实现' };
  });

  ipcMain.handle('project-get-recent', () => {
    console.log('📋 获取最近项目列表请求');
    // TODO: 实现最近项目获取逻辑
    return [];
  });

  console.log('✅ IPC处理器设置完成');
}

void app.whenReady().then(() => {
  console.log('🚀 Electron应用启动完成');
  setupIpcHandlers();  // 设置IPC处理器
  void createWindow();
});

app.on('window-all-closed', () => {
  // 清理全局快捷键
  console.log('🧹 清理全局快捷键...');
  const shortcuts = globalShortcut.isRegistered('F12');
  console.log('F12快捷键是否仍注册:', shortcuts);
  globalShortcut.unregisterAll();
  
  if (platform !== 'darwin') {
    console.log('💤 应用即将退出');
    app.quit();
  }
});

app.on('will-quit', () => {
  console.log('🔚 应用即将退出，清理资源...');
  globalShortcut.unregisterAll();
});

app.on('activate', () => {
  if (mainWindow === undefined) {
    void createWindow();
  }
});
