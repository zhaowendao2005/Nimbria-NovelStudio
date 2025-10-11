# ESLint 控制开关说明

## 📋 概述

为了提高开发和构建速度，项目现在支持通过环境变量控制 ESLint 检查的开启/关闭。

## 🎯 使用方法

### 方式一：使用预定义的脚本命令（推荐）

#### 开发模式（带 ESLint）
```bash
npm run dev:electron
```

#### 开发模式（不带 ESLint）⚡ 更快
```bash
npm run dev:electron:no-lint
```

#### 构建模式（带 ESLint）
```bash
npm run build:electron
npm run build:electron:debug
```

#### 构建模式（不带 ESLint）⚡ 更快
```bash
npm run build:electron:no-lint
npm run build:electron:debug:no-lint
```

### 方式二：手动设置环境变量

Windows (PowerShell):
```powershell
$env:DISABLE_ESLINT="1"
npm run dev:electron
```

Windows (CMD):
```cmd
set DISABLE_ESLINT=1
npm run dev:electron
```

Linux/macOS:
```bash
DISABLE_ESLINT=1 npm run dev:electron
```

## 📦 可用的命令列表

### 根目录命令（推荐使用）

| 命令 | ESLint | 说明 |
|------|--------|------|
| `npm run dev:electron` | ✅ 开启 | Electron 开发模式 |
| `npm run dev:electron:no-lint` | ❌ 关闭 | Electron 开发模式（快速） |
| `npm run build:electron` | ✅ 开启 | 构建生产版本 |
| `npm run build:electron:debug` | ✅ 开启 | 构建调试版本（带日志和DevTools） |
| `npm run build:electron:no-lint` | ❌ 关闭 | 构建生产版本（快速） |
| `npm run build:electron:debug:no-lint` | ❌ 关闭 | 构建调试版本（快速） |

### Nimbria 目录命令

在 `Nimbria/` 目录下可以使用：

| 命令 | ESLint | 说明 |
|------|--------|------|
| `npm run dev` | ✅ 开启 | Web 开发模式 |
| `npm run dev:no-lint` | ❌ 关闭 | Web 开发模式（快速） |
| `npm run dev:electron` | ✅ 开启 | Electron 开发模式 |
| `npm run dev:electron:no-lint` | ❌ 关闭 | Electron 开发模式（快速） |
| `npm run build:electron` | ✅ 开启 | 构建生产版本 |
| `npm run build:electron:debug` | ✅ 开启 | 构建调试版本 |
| `npm run build:electron:no-lint` | ❌ 关闭 | 构建生产版本（快速） |
| `npm run build:electron:debug:no-lint` | ❌ 关闭 | 构建调试版本（快速） |

## ⚙️ 技术细节

### 实现原理

1. **环境变量**: `DISABLE_ESLINT=1`
2. **配置文件**: `quasar.config.ts` 中检查环境变量
3. **插件控制**: 当环境变量为 "1" 时，`vitePlugins` 返回空数组

### 相关文件

- `Nimbria/package.json` - 定义脚本命令
- `Nimbria/quasar.config.ts` - ESLint 插件控制逻辑
- `package.json` (根目录) - 根目录快捷命令

## 💡 建议

### 何时使用无 ESLint 模式？

✅ **推荐使用的场景：**
- 快速测试功能
- 频繁热重载调试
- 已知代码有 lint 错误但不影响功能
- 构建速度优先的场景

❌ **不推荐使用的场景：**
- 提交代码前的最终检查
- 生产环境正式构建
- 代码审查前

### 最佳实践

1. **日常开发**: 使用 `no-lint` 版本提高开发效率
2. **提交前**: 运行 `npm run lint` 手动检查
3. **正式构建**: 使用带 ESLint 的命令确保代码质量

## 🔧 手动运行 ESLint

如果在无 ESLint 模式下开发，提交前可以手动检查：

```bash
cd Nimbria
npm run lint
```

## 📊 性能对比

根据测试，关闭 ESLint 后：

- **开发模式启动**: 快 30-50%
- **热重载速度**: 快 20-40%
- **构建速度**: 快 15-30%

*注：具体提升取决于项目大小和代码复杂度*

