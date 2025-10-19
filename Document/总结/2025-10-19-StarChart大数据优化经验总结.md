# StarChart 大数据（10000节点）优化经验总结

**日期**：2025-10-19  
**目标**：优化 10000 节点场景下的 StarChart 初始化性能，避免主线程阻塞

---

## ✅ 有效的优化（已保留）

### 1. **Worker 异步计算** ⭐⭐⭐⭐⭐
**实现位置**：
- `Client/Service/starChart/InitializationManager.ts`
- `Client/workers/starchartInit.worker.ts`
- `Client/stores/projectPage/starChart/plugins/MultiRootRadialPlugin/InitializationOptimizer.ts`

**效果**：
- Worker 耗时：175ms（9892节点）
- 主线程完全无阻塞
- 可实时显示进度条

**关键代码**：
```typescript
// 主线程
const manager = new InitializationManager()
await manager.startInitialization({
  pluginName: 'multi-root-radial',
  graphData: data,
  // ...
})

// Worker 中
const optimizer = plugin.initializeOptimized(data, options, onProgress)
```

**结论**：✅ **必须保留**，这是大数据场景的核心优化。

---

### 2. **零碰撞预分配布局算法** ⭐⭐⭐⭐⭐
**实现位置**：
- `Client/stores/projectPage/starChart/plugins/MultiRootRadialPlugin/layout.ts`

**效果**：
- 布局耗时：83ms（9892节点）
- 从 O(N²) 降至 O(N)
- 无需迭代碰撞检测

**关键思路**：
1. 统计每个根节点的子节点数
2. 按子节点数预分配角度空间
3. 在分配的扇区内均匀分布子节点
4. 一次到位，零碰撞

**关键代码**：
```typescript
// 预分配角度空间
const anglePerChild = allocatedAngle / (childCount || 1)
for (let i = 0; i < childCount; i++) {
  const angle = startAngle + i * anglePerChild
  // 计算位置，保证不重叠
}
```

**结论**：✅ **必须保留**，显著提升布局性能。

---

### 3. **G6 animation: false** ⭐⭐⭐⭐⭐
**实现位置**：
- `StarChartViewport.vue` line 353

**效果**：
- 避免 10000 个节点的动画 Tween 计算
- 这是 G6 官方大数据 demo 的标配

**关键代码**：
```typescript
preloadedGraphInstance = new Graph({
  container: containerRef.value!,
  animation: false,  // 🔥 关键：禁用动画系统
  // ...
})
```

**结论**：✅ **必须保留**，G6 大数据渲染的黄金法则。

---

### 4. **一次性数据加载（setData）** ⭐⭐⭐⭐
**实现位置**：
- `StarChartViewport.vue` `loadDataOnce` 函数

**效果**：
- 避免多次触发渲染流水线
- 比分批加载更高效

**关键代码**：
```typescript
async function loadDataOnce(graph, layoutResult, onProgress) {
  await scheduleIdle(() => {
    void graph.clear()
    graph.setData(layoutResult)  // 一次性加载
  })
  onProgress()
}
```

**结论**：✅ **必须保留**，符合 G6 最佳实践。

---

### 5. **单次渲染（render）** ⭐⭐⭐⭐
**实现位置**：
- `StarChartViewport.vue` `renderOnce` 函数

**效果**：
- 单次调用 GPU 渲染
- 避免多帧渲染的开销

**关键代码**：
```typescript
async function renderOnce(graph, onProgress) {
  await scheduleIdle(async () => {
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        void graph.render()  // 单次渲染
        onProgress()
        resolve()
      })
    })
  })
}
```

**结论**：✅ **必须保留**，GPU 加速的正确用法。

---

### 6. **进度条系统** ⭐⭐⭐⭐
**实现位置**：
- `Client/GUI/components/ProjectPage.Shell/Navbar.content/Writing/panels/InitProgressPanel.vue`
- `Client/stores/projectPage/starChart/starChart.store.ts` (progressState)

**效果**：
- 多阶段进度可视化
- 用户体验友好

**结论**：✅ **必须保留**，提升用户体验。

---

## ❌ 无效的优化（已清理或需清理）

### 1. **手动 WebGL 优化代码** ⭐
**实现位置**（已注释）：
- `StarChartViewport.vue` `applyWebGLOptimizations` 函数

**问题**：
- 手动遍历 10000 节点设置 LOD、Culling
- 同步阻塞主线程
- G6 内置优化已足够

**教训**：
> **不要重复造轮子**。G6 的 WebGL 引擎已经内置了实例化渲染、视锥剔除、LOD等优化。手动实现只会画蛇添足，增加主线程负担。

**结论**：❌ **已清理**，G6 内置优化已足够。

---

### 2. **WebGL 优化配置面板** ⭐
**实现位置**（已禁用）：
- `WritingPanel.vue` WebGL Optimization 部分

**问题**：
- 所有开关都是摆设
- 手动优化代码已注释
- 占用 UI 空间

**结论**：❌ **需清理**，配置无实际作用。

---

### 3. **分批加载（chunkArray）** ⭐
**实现位置**：
- 已删除

**问题**：
- 增加复杂度
- 多次触发渲染流水线
- 不如一次性加载

**教训**：
> 对于 GPU 渲染，**批量处理不一定更快**。一次性提交数据，让 GPU 并行处理，比分批提交多次要高效。

**结论**：❌ **已清理**。

---

### 4. **分帧渲染（renderInFrames）** ⭐
**实现位置**：
- 已删除

**问题**：
- WebGL 本身就是异步的
- 分帧反而增加开销

**结论**：❌ **已清理**。

---

### 5. **preloadGraphInstance 反复调用** ⭐
**问题**：
- 在 `runMainThreadPipeline` 结尾又调用一次
- 同步创建新 G6 实例导致卡顿

**修复**：
- 已注释掉末尾的重复调用
- 只在 `onMounted` 预热一次

**结论**：❌ **已修复**。

---

## ⚠️ 未解决的问题

### 1. **behaviors 初始化阻塞** ⭐⭐⭐
**现象**：
- 日志显示渲染完成
- 但 UI 卡在 `initRuntime @ graph.ts:1162`
- `behaviors` 为 10000 节点创建事件监听，同步阻塞

**潜在解决方案**（未实现）：
1. 创建 Graph 时 `behaviors: []`（纯渲染模式）
2. 渲染完成后，异步添加 behaviors
```typescript
await graph.render()
await scheduleIdle(() => {
  graph.setBehaviors(['drag-canvas', 'zoom-canvas', 'drag-element'])
})
```

**状态**：❌ **未实现**，用户要求停止优化。

---

## 📊 最终性能数据

### 9892 节点场景
| 阶段 | 耗时 | 说明 |
|------|------|------|
| 数据适配 | 4ms | Worker |
| 布局计算 | 83ms | Worker（零碰撞） |
| 样式生成 | 45ms | Worker |
| **Worker 总计** | **175ms** | ✅ 主线程无阻塞 |
| 数据加载 | 87ms | 主线程（setData） |
| GPU 渲染 | <50ms | 主线程（render） |
| **behaviors 初始化** | **未知（阻塞）** | ❌ 当前瓶颈 |

---

## 🎯 核心经验

### 1. **信任框架的内置优化**
- G6 的 WebGL 引擎已经高度优化
- 不要尝试"优化"框架，只会适得其反

### 2. **异步是王道**
- 所有重计算都应在 Worker 中进行
- 主线程只负责：接收数据 → GPU 渲染 → 完成

### 3. **一次到位 > 渐进式**
- 对于 GPU：一次性提交数据 > 分批提交
- 对于布局：零碰撞预分配 > 迭代碰撞检测

### 4. **动画系统是大杀器**
- `animation: true` 在大数据场景下是性能杀手
- 10000 节点 × 动画 Tween = 主线程死亡
- 关闭它是第一优先级

### 5. **behaviors 也是同步阻塞源**
- 事件监听器的创建不是免费的
- 延迟初始化是可行的优化方向

---

## 📝 代码清理清单

### 需要清理的文件
- [x] `StarChartViewport.vue`：删除 `applyWebGLOptimizations` 函数
- [ ] `WritingPanel.vue`：删除 WebGL 优化配置面板
- [ ] `starChart.config.types.ts`：删除 `WebGLOptimizationConfig`
- [ ] `starChart.config.store.ts`：删除 `webglOptimization` 相关代码
- [ ] `worker.types.ts`：删除 `WebGLOptimizationConfig` 导入

### 需要保留的文件
- ✅ `InitializationManager.ts`
- ✅ `starchartInit.worker.ts`
- ✅ `InitializationOptimizer.ts`
- ✅ `layout.ts`（零碰撞算法）
- ✅ `InitProgressPanel.vue`
- ✅ `starChart.store.ts`（进度管理）

---

## 🚀 未来优化方向

1. **延迟初始化 behaviors**（当前瓶颈）
2. **虚拟化渲染**：只渲染可视区域内的节点
3. **Canvas 分层**：静态层 + 交互层
4. **WebGL Instanced Drawing**：G6 可能需要更新

---

**总结**：Worker + 零碰撞 + animation:false + 信任 G6 = 正确的优化路线。  
**教训**：不要过度设计，不要重复造轮子。

