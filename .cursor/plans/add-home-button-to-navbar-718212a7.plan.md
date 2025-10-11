<!-- 718212a7-5b2d-44f7-a4ab-770a2b5edd45 e54f8ba3-a492-43e7-8d27-6ae7391611c0 -->
# 添加Home按钮到项目导航栏

## 实现步骤

### 1. 添加IPC处理器：显示/聚焦主窗口

**文件**: `Nimbria/src-electron/core/app-manager.ts`

在 `registerIpcHandlers()` 方法中添加新的IPC处理器（大约在第540行）：

```typescript
ipcMain.handle('window:show-main', () => {
  if (!this.windowManager) {
    return { success: false, error: 'Window manager not ready' }
  }

  let mainProcess = this.windowManager.getMainProcess()
  
  // 如果主窗口不存在，则创建它
  if (!mainProcess) {
    mainProcess = this.windowManager.createMainWindow()
    logger.info('Main window created from show-main request')
  }
  
  // 显示并聚焦主窗口
  if (mainProcess.window.isMinimized()) {
    mainProcess.window.restore()
  }
  mainProcess.window.show()
  mainProcess.window.focus()
  
  logger.info('Main window shown and focused')
  return { success: true }
})
```

### 2. 更新IPC类型定义

**文件**: `Nimbria/src-electron/types/ipc.ts`

在 `IPCChannelMap` 接口中添加新的IPC通道（大约在第53行，其他窗口操作之后）：

```typescript
'window:show-main': { 
  request: void
  response: WindowOperationResult 
}
```

### 3. 在Preload脚本中暴露API

**文件**: `Nimbria/src-electron/core/project-preload.ts`

在window API对象中添加 showMain 方法（找到window API部分并添加）：

```typescript
window: {
  // ... 现有方法
  showMain: () => channelInvoke('window:show-main', undefined)
}
```

### 4. 更新TypeScript类型定义

**文件**: `Nimbria/Client/types/core/window.d.ts`

在window API接口中添加 showMain 方法（大约在第54行，focus方法之后）：

```typescript
window: {
  /** 最小化当前窗口 */
  minimize(): Promise<void>
  /** 关闭当前窗口 */
  close(): Promise<void>
  /** 最大化当前窗口 */
  maximize(): Promise<void>
  /** 取消最大化当前窗口 */
  unmaximize(): Promise<void>
  /** 检查当前窗口是否已最大化 */
  isMaximized(): Promise<boolean>
  /** 将焦点设置到当前窗口 */
  focus(): Promise<void>
  /** 显示并聚焦主窗口 */
  showMain(): Promise<void>
}
```

### 5. 导入Home图标

**文件**: `Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar/ProjectNavbar.vue`

更新图标导入（第48行）：

```typescript
import { Folder, Search, Calendar, Setting, HomeFilled } from '@element-plus/icons-vue'
```

### 6. 在导航栏组件中添加Home按钮

**文件**: `Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar/ProjectNavbar.vue`

在模板中添加Home按钮作为第一个按钮（在第2行之后，文件浏览器按钮之前）：

```vue
<!-- Home按钮 -->
<el-tooltip content="主页" placement="right" :show-after="500">
  <button 
    class="nav-icon-btn"
    @click="handleClick('home')"
  >
    <el-icon class="nav-icon"><HomeFilled /></el-icon>
  </button>
</el-tooltip>
```

### 7. 实现Home按钮处理函数

**文件**: `Nimbria/Client/GUI/components/ProjectPage.Shell/Navbar/ProjectNavbar.vue`

更新 handleClick 函数（大约在第56行）以处理home操作：

```typescript
const handleClick = async (type: string) => {
  console.log('Navbar clicked:', type)
  
  if (type === 'home') {
    try {
      await window.nimbria.window.showMain()
      console.log('Main window shown and focused')
    } catch (error) {
      console.error('Failed to show main window:', error)
    }
    return
  }
  
  // TODO: 实现其他导航逻辑
}
```

## 技术说明

- 实现遵循多窗口系统中现有的窗口管理模式
- IPC处理器会检查主窗口是否存在，如果不存在则创建
- 窗口在聚焦前会从最小化状态恢复
- 前端按钮处理器中包含错误处理
- Home按钮放置在导航栏的第一位，方便访问
- 使用Element Plus的 `HomeFilled` 图标，与Obsidian风格的UI匹配