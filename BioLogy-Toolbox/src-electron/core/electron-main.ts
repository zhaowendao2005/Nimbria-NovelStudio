import { app, BrowserWindow, globalShortcut } from 'electron';
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
    width: 1000,
    height: 600,
    useContentSize: true,
  webPreferences: {
    contextIsolation: true,
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

void app.whenReady().then(() => {
  console.log('🚀 Electron应用启动完成');
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
