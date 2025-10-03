# Reference Page 项目

## 项目简介

这是一个用于快速将想法转换为页面原型的设计项目。每个页面完全独立，构建时会生成单个完整的 HTML 文件（所有 JS、CSS 内联）。

## 项目结构

```
ReferencePage/
├── src/
│   ├── pages/                    # 存放独立页面
│   │   ├── example1/            # 示例页面1
│   │   │   ├── index.html       # 页面HTML入口
│   │   │   ├── main.ts          # 页面JS入口
│   │   │   └── App.vue          # 页面根组件
│   │   └── example2/            # 示例页面2
│   │       ├── index.html
│   │       ├── main.ts
│   │       └── App.vue
│   └── shared/                   # 共享资源目录（组件、工具等）
├── dist/                         # 构建输出目录
├── vite.config.ts               # Vite配置
└── package.json
```

## 核心特性

✅ **单HTML文件输出** - 所有JS、CSS内联到一个HTML文件  
✅ **可选构建** - 可以选择构建特定页面或全部页面  
✅ **完全独立** - 每个页面互不影响，独立运行  
✅ **共享资源** - 通过 `@shared` 别名共享组件和工具  
✅ **素材库支持** - 可包含 Element Plus 等素材库的完整代码  

## 使用方法

### 1. 安装依赖

```bash
npm install
```

**新增依赖说明：**
- `vite-plugin-singlefile` - 将所有资源内联到单个HTML文件
- `fast-glob` - 动态查找页面入口
- `cross-env` - 跨平台环境变量设置

### 2. 开发模式

启动开发服务器：

```bash
# 启动默认开发服务器
npm run dev

# 直接打开 Example 1 页面
npm run dev:example1

# 直接打开 Example 2 页面
npm run dev:example2
```

开发模式下访问：
- Example 1: `http://localhost:5173/src/pages/example1/index.html`
- Example 2: `http://localhost:5173/src/pages/example2/index.html`

### 3. 构建生产版本

```bash
# 构建所有页面
npm run build

# 只构建 Example 1
npm run build:example1

# 只构建 Example 2
npm run build:example2
```

构建输出位置：
- `dist/example1.html` - Example 1 的完整HTML文件
- `dist/example2.html` - Example 2 的完整HTML文件

## 添加新页面

### 步骤1：创建页面目录

在 `src/pages/` 下创建新目录，例如 `my-new-page`：

```
src/pages/my-new-page/
├── index.html
├── main.ts
└── App.vue
```

### 步骤2：创建页面文件

**index.html:**
```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My New Page</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

**main.ts:**
```typescript
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

**App.vue:**
```vue
<template>
  <div class="my-page">
    <h1>{{ title }}</h1>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const title = ref('我的新页面')
</script>

<style scoped>
.my-page {
  /* 你的样式 */
}
</style>
```

### 步骤3：添加构建脚本（可选）

在 `package.json` 中添加：

```json
{
  "scripts": {
    "dev:my-new-page": "vite --open /src/pages/my-new-page/index.html",
    "build:my-new-page": "cross-env BUILD_PAGE=my-new-page vite build"
  }
}
```

## 使用共享资源

### 创建共享组件

在 `src/shared/components/` 下创建组件：

```vue
<!-- src/shared/components/MySharedComponent.vue -->
<template>
  <div class="shared-component">
    <slot></slot>
  </div>
</template>
```

### 在页面中使用

```vue
<script setup lang="ts">
import MySharedComponent from '@shared/components/MySharedComponent.vue'
</script>

<template>
  <MySharedComponent>
    共享组件内容
  </MySharedComponent>
</template>
```

## 添加素材库

### 示例：添加 Element Plus

1. **安装依赖：**
```bash
npm install element-plus
```

2. **在页面的 main.ts 中引入：**
```typescript
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)
app.mount('#app')
```

3. **构建时会自动内联 Element Plus 的完整代码**

## 技术栈

- **Vue 3** - 渐进式前端框架
- **Vite** - 下一代前端构建工具
- **TypeScript** - 类型安全的JavaScript
- **vite-plugin-singlefile** - 单文件构建插件

## 注意事项

⚠️ 构建的单HTML文件可能较大（特别是使用了素材库时）  
⚠️ 所有图片和资源会被 Base64 编码内联  
⚠️ 首次加载时间可能较长  
⚠️ 适合原型设计，不适合大型生产应用  

## 构建原理

1. Vite 使用 `fast-glob` 动态查找所有 `src/pages/*/index.html`
2. 根据 `BUILD_PAGE` 环境变量选择构建目标
3. `vite-plugin-singlefile` 插件将所有资源内联
4. 输出单个完整的 HTML 文件到 `dist/` 目录

## 开发建议

- 每个页面保持独立，避免相互依赖
- 将可复用的代码放在 `src/shared/` 中
- 使用 `@shared` 别名导入共享资源
- 页面较复杂时，可在页面目录下创建 `components/` 子目录
