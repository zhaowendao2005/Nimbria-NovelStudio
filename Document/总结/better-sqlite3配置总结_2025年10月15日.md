# Better-SQLite3 在 Electron 项目中的配置总结

**文档日期**: 2025年10月15日  
**项目**: Nimbria-NovelStudio  
**问题**: better-sqlite3原生模块在Electron中的编译和版本兼容性问题  
**最终方案**: 降级Electron + 锁定版本 + 自动预编译包下载

---

## 📋 问题背景

### 遇到的问题

1. **NODE_MODULE_VERSION不匹配**
   ```
   Error: The module was compiled against a different Node.js version using
   NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 139.
   ```

2. **编译环境缺失**
   - 路径包含空格导致node-gyp编译失败
   - 缺少Visual Studio构建工具（需要几GB空间）
   - `electron-rebuild`和`@electron/rebuild`都失败

3. **预编译包不可用**
   ```
   prebuild-install warn install No prebuilt binaries found (target=38.1.0 runtime=electron)
   ```

### 根本原因

- **better-sqlite3**是原生Node.js模块，需要为特定的Electron版本编译
- **Electron 38.1.0**需要`NODE_MODULE_VERSION 139`
- **better-sqlite3@12.2.0**官方未提供Electron 38.x的预编译包
- 本地编译需要Visual Studio构建工具且路径不能有空格

---

## ✅ 最终解决方案

### 方案选择：降级Electron到有预编译包的版本

**选择Electron 37.2.6的原因**：
1. ✅ better-sqlite3官方提供预编译包
2. ✅ 无需本地编译环境
3. ✅ 版本足够新，功能完整
4. ✅ 稳定性好

---

## 🔧 具体配置步骤

### 1. 修改 `package.json`

#### 锁定版本（移除^符号）

```json
{
  "dependencies": {
    "better-sqlite3": "12.2.0"  // ✅ 精确版本
  },
  "devDependencies": {
    "@electron/rebuild": "^4.0.1",
    "@types/better-sqlite3": "^7.6.12",
    "electron": "37.2.6",  // ✅ 精确版本
    "electron-rebuild": "^3.2.9"
  }
}
```

**重要**：移除`^`符号，确保版本精确匹配！

#### 添加自动rebuild脚本

```json
{
  "scripts": {
    "postinstall": "quasar prepare && npm run rebuild:sqlite",
    "rebuild": "npx @electron/rebuild",
    "rebuild:sqlite": "cd node_modules/better-sqlite3 && prebuild-install --runtime electron --target 37.2.6 || echo 'Prebuild install completed'"
  }
}
```

**说明**：
- `postinstall`: 在`npm install`后自动执行
- `rebuild:sqlite`: 使用`prebuild-install`下载预编译包
- `|| echo`: 容错处理，即使失败也不中断

### 2. 创建 `.npmrc` 配置

**文件路径**: `Nimbria/.npmrc`

```ini
# 确保better-sqlite3使用预编译包
build-from-source=false

# Electron相关配置
runtime=electron
target=37.2.6
disturl=https://electronjs.org/headers

# better-sqlite3预编译包配置
better_sqlite3_binary_host_mirror=https://github.com/WiseLibs/better-sqlite3/releases/download/
```

**作用**：
- `build-from-source=false`: 强制使用预编译包，不进行本地编译
- `runtime=electron`: 指定运行时为Electron
- `target=37.2.6`: 指定目标Electron版本

### 3. 安装依赖

```powershell
cd Nimbria

# 1. 安装正确版本的Electron
npm install electron@37.2.6 --save-dev

# 2. 删除旧的better-sqlite3
Remove-Item -Recurse -Force node_modules/better-sqlite3

# 3. 重新安装依赖（会触发postinstall）
npm install

# 4. 验证预编译包
dir node_modules\better-sqlite3\build\Release\better_sqlite3.node
```

### 4. 验证安装

检查编译文件是否存在：

```powershell
Test-Path "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
# 应该返回: True
```

---

## 🎯 工作原理

### npm install 执行流程

```
npm install
  ↓
1. 安装所有依赖
   - better-sqlite3@12.2.0 (精确版本)
   - electron@37.2.6 (精确版本)
  ↓
2. 执行 postinstall 脚本
   - quasar prepare
   - npm run rebuild:sqlite
  ↓
3. rebuild:sqlite 执行
   - cd node_modules/better-sqlite3
   - prebuild-install --runtime electron --target 37.2.6
   - 下载预编译的 .node 文件
  ↓
4. ✅ 完成！better_sqlite3.node 已就位
```

### 版本对应关系

| Electron版本 | NODE_MODULE_VERSION | better-sqlite3预编译包 |
|-------------|---------------------|---------------------|
| 37.x        | 136                 | ✅ 可用              |
| 38.x        | 139                 | ❌ 不可用            |
| 39.x        | 140                 | ❌ 不可用            |

---

## 🛡️ 防止覆盖的保护机制

### 1. 版本锁定
- 精确版本号（无`^`）确保不会意外升级
- `package-lock.json`锁定依赖树

### 2. 自动重建
- `postinstall`钩子确保每次安装后自动下载预编译包
- 即使`better-sqlite3`被删除重装，也会自动恢复

### 3. `.npmrc`配置
- 强制使用预编译包，避免触发本地编译
- 指定正确的Electron版本

### 4. 手动重建脚本
如果需要手动重建：
```powershell
npm run rebuild:sqlite
```

---

## 📝 常见问题和解决方案

### Q1: npm install后还是报NODE_MODULE_VERSION错误？

**原因**: 预编译包下载失败或版本不匹配

**解决**:
```powershell
# 删除并重新下载
Remove-Item -Recurse -Force node_modules/better-sqlite3/build
npm run rebuild:sqlite

# 验证
dir node_modules\better-sqlite3\build\Release\better_sqlite3.node
```

### Q2: prebuild-install报错找不到预编译包？

**原因**: 网络问题或Electron版本不支持

**解决**:
```powershell
# 方法1: 使用代理
$env:HTTPS_PROXY = "http://your-proxy:port"
npm run rebuild:sqlite

# 方法2: 手动下载
# 访问: https://github.com/WiseLibs/better-sqlite3/releases
# 下载对应版本的预编译包
```

### Q3: 路径有空格导致编译失败？

**原因**: node-gyp不支持路径中的空格

**解决**: 使用预编译包（已通过配置解决）
```ini
# .npmrc
build-from-source=false  # 关键配置
```

### Q4: 想升级到Electron 38怎么办？

**两个选择**:

**选择A: 等待官方预编译包**
```powershell
# 定期检查是否有新的预编译包
prebuild-install --runtime electron --target 38.1.0
```

**选择B: 安装Visual Studio构建工具**
```powershell
# 安装VS Build Tools (需要管理员权限)
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"

# 然后可以本地编译
npm install electron@38.1.0 --save-dev
npx electron-rebuild -f -w better-sqlite3
```

### Q5: 如何从其他项目复制预编译包？

**前提**: 两个项目使用相同的Electron版本

```powershell
# 删除当前项目的better-sqlite3
Remove-Item -Recurse -Force node_modules/better-sqlite3

# 从其他项目复制
Copy-Item -Recurse "D:\other-project\node_modules\better-sqlite3" node_modules/

# 验证版本是否匹配
cd node_modules/better-sqlite3
npm view . version
```

---

## 🔍 调试技巧

### 检查Electron版本

```powershell
# 查看安装的Electron版本
npx electron --version

# 查看NODE_MODULE_VERSION
node -e "console.log(process.versions.modules)"
```

### 查看better-sqlite3版本

```powershell
cd node_modules/better-sqlite3
npm view . version
```

### 检查预编译包

```powershell
# 列出build目录
dir node_modules\better-sqlite3\build\Release

# 查看.node文件详情
Get-Item node_modules\better-sqlite3\build\Release\better_sqlite3.node | Format-List
```

### 清理并重装

```powershell
# 完全清理
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 重新安装
npm install
```

---

## 📊 性能影响

### 使用Electron 37.2.6 vs 38.1.0

| 项目 | Electron 37.2.6 | Electron 38.1.0 |
|------|-----------------|-----------------|
| 安装时间 | ~2分钟 | 需要编译，10-20分钟 |
| 磁盘空间 | ~200MB | 需要VS工具，额外3-5GB |
| 稳定性 | ✅ 稳定 | ✅ 稳定 |
| 功能差异 | 完整功能 | 新特性（大部分用不到） |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**结论**: 对于大多数项目，Electron 37.2.6已经足够。

---

## 🎓 学到的经验

### 1. 原生模块的版本匹配非常重要
- 必须确保NODE_MODULE_VERSION匹配
- 不同Electron版本需要不同的编译版本

### 2. 优先使用预编译包
- 避免本地编译的各种问题
- 节省时间和磁盘空间
- 更稳定可靠

### 3. 版本锁定是必须的
- 移除`^`符号，使用精确版本
- 通过`postinstall`确保一致性
- 使用`.npmrc`强化配置

### 4. 自动化很重要
- `postinstall`脚本确保每次都正确
- 减少人工操作，减少出错

### 5. 文档和总结是必要的
- 问题复杂，容易忘记
- 记录解决方案，方便后续参考
- 分享给团队成员

---

## 📚 参考资料

1. **better-sqlite3官方文档**
   - https://github.com/WiseLibs/better-sqlite3

2. **Electron版本和NODE_MODULE_VERSION对应表**
   - https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules

3. **prebuild-install文档**
   - https://github.com/prebuild/prebuild-install

4. **electron-rebuild文档**
   - https://github.com/electron/rebuild

5. **相关Issue**
   - [better-sqlite3 #65: Spaces in path](https://github.com/nodejs/node-gyp/issues/65)
   - [Electron版本升级问题](https://github.com/WiseLibs/better-sqlite3/issues)

---

## 🔄 后续升级路径

### 短期方案（当前）
- ✅ 使用Electron 37.2.6
- ✅ 使用预编译包
- ✅ 稳定可靠

### 中期方案（等待官方支持）
- 关注better-sqlite3更新
- 等待Electron 38/39的预编译包发布
- 定期检查：`prebuild-install --runtime electron --target 38.1.0`

### 长期方案（如果必须升级）
1. **安装构建环境**
   ```powershell
   choco install visualstudio2022buildtools
   ```

2. **移动项目到无空格路径**
   ```powershell
   # 从: D:\code\Large-scale integrated projec\
   # 到:   D:\code\Nimbria-NovelStudio\
   ```

3. **使用electron-rebuild编译**
   ```powershell
   npx electron-rebuild -f -w better-sqlite3
   ```

---

## ✅ 检查清单

使用本配置前，请确认：

- [ ] `package.json`中better-sqlite3版本为`12.2.0`（无^）
- [ ] `package.json`中electron版本为`37.2.6`（无^）
- [ ] 存在`postinstall`脚本
- [ ] 存在`rebuild:sqlite`脚本
- [ ] 创建了`.npmrc`文件
- [ ] 执行了`npm install`
- [ ] 验证了`better_sqlite3.node`文件存在
- [ ] 启动Electron测试数据库功能正常

---

**配置完成日期**: 2025年10月15日  
**最后验证**: 数据库系统成功初始化并创建数据库文件

> 本文档将随着项目发展持续更新。如有问题，请参考本文档或查看相关Issue。

