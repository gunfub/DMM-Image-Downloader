# retired/ — 归档脚本演进说明

本目录存放 DMM 图片下载器用户脚本开发过程中的三个关键版本，记录了从失败到成功找到技术路径的完整探索过程。

---

## 文件概览

| 文件 | 状态 | 捕获内容 | 尺寸 | 核心问题 |
|------|------|----------|------|----------|
| `1.user.js` | ❌ 失败 | 空白图片 | 显示尺寸正确 | 画布被污染（tainted），`toBlob()` 返回空数据 |
| `2.user.js` | ⚠️ 部分可用 | 有图像内容 | **缩小** | 捕获的是显示层画布而非原始纹理，且混入阅读器 UI 背景 |
| `test.user.js` | ✅ 技术验证成功 | 完整图像 | **原始尺寸** | 缺少去重、UI 界面、ZIP 打包，不适合最终用户 |

---

## 各版本详细分析

### 1. `1.user.js` — 首次尝试：CSS 选择器定位显示画布

**技术思路：**
- 通过固定的 CSS 选择器（`#renderer .currentScreen canvas.default` 等）直接查找页面上的可见 `<canvas>` 元素
- 使用 `canvas.toBlob()` 导出 PNG 并触发浏览器下载

**失败原因：**
DMM 阅读器使用 WebGL 渲染，显示层画布的图像数据来自跨域加载的纹理图集（texture atlas）。浏览器出于安全策略将此类画布标记为 **"tainted"（被污染）**，调用 `toBlob()` / `toDataURL()` 时会抛出安全错误或返回空白数据。因此虽然 `canvas.width` / `canvas.height` 尺寸信息正确，导出的图片文件却是空的。

**优点：**
- 有简单的浮动按钮 UI

---

### 2. `2.user.js` — 改进查找策略 + 点选模式

**技术改进：**
- 不再依赖固定 CSS 选择器，改用 `findLikelyCanvas()` 遍历所有 `<canvas>` 元素，按 `getBoundingClientRect()` 面积 + 可见性筛选，提高了不同阅读模式的兼容性
- 增加"点选画布"交互模式：用户可手动点击页面区域，脚本沿 DOM 树向上查找最近的 `<canvas>` 元素进行保存

**部分成功的原因：**
- DMM 阅读器在特定渲染模式下，部分画布可能未被标记为 tainted，或使用了不触发安全策略的渲染路径
- 因此某些情况下能导出**有图像内容**的 PNG

**仍存在的问题：**
- 捕获的是**显示层画布**（即用户屏幕可见的那个 `<canvas>`），该画布由阅读器将原始大图缩放绘制而成，尺寸受视口限制（通常远小于原始分辨率）
- 显示层画布还包含阅读器的 UI 元素（页码、按钮等），导致导出的图片混入了背景杂讯
- 无 ZIP 打包、无去重

---

### 3. `test.user.js` — 关键突破：Hook `drawImage` 拦截原始纹理

**技术思路（核心创新）：**
```javascript
CanvasRenderingContext2D.prototype.drawImage = function(...args) {
    const src = args[0];
    if (src instanceof HTMLCanvasElement && src.width > 1000 && src.height > 1000) {
        saveCanvas(src);  // 保存的是 src（原始大图），而非 this（显示层目标画布）
    }
    return oldDrawImage.apply(this, args);
};
```

- **Hook 了 `CanvasRenderingContext2D.prototype.drawImage`**——这是 Canvas 2D API 中将图像/画布绘制到另一个画布的核心方法
- 每次 DMM 阅读器调用 `drawImage` 将原始纹理画布绘制到显示层画布时，脚本拦截该调用并保存**源画布**（`src`）
- `src.width > 1000 && src.height > 1000` 作为启发式过滤器，区分原始高清纹理和 UI 小图标

**为什么此方案成功：**

DMM 阅读器的渲染管线大致为：

```
[服务器图片数据] → [解码 → 原始尺寸 Canvas (离屏)] → [drawImage 缩放] → [显示层 Canvas]
                                                    ↑
                                          test.user.js 在此处拦截源画布
```

`1.user.js` 和 `2.user.js` 试图从管线末端（显示层）获取数据，而 `test.user.js` 从管线中间截获原始数据——此时图像尚未被缩放，也没有混入 UI 元素，且源画布通常未被 tainted。

**缺失功能（不适合直接发布的原因）：**
- **无去重**：同一张源画布可能在多次 `drawImage` 调用中被重复绘制（例如阅读器在不同帧/模式下反复使用同一纹理），导致大量重复下载
- **无 UI 界面**：没有任何按钮或控制面板，用户无法控制脚本行为
- **无 ZIP 打包**：每张图片单独触发浏览器下载，翻页时会弹出大量保存对话框
- **无条件触发**：阅读器初始化阶段也会触发 `drawImage`，可能导致启动时下载大量无关图片

---

## 技术演进总结

```
1.user.js ──→ 2.user.js ──→ test.user.js
   │              │               │
   │ 定位显示画布  │  遍历 + 点选  │  Hook drawImage
   │ toBlob()     │  toBlob()     │  拦截源画布
   │              │               │
   ▼              ▼               ▼
 空白图片       缩小 + 有背景     原始尺寸 ✅
```

`test.user.js` 的 Hook `drawImage` 方案是项目的最关键技术验证，后续的 `DMM-Image-Downloader.user.js`（根目录下的正式版）正是在此基础上增加了去重逻辑、UI 控制面板、ZIP 打包功能后完成的最终用户版本。

---

## 备注

- 所有脚本均针对 DMM 在线漫画/书籍阅读器（`book.dmm.com` / `book.dmm.co.jp`）设计
- `test.user.js` 的 `@description` 写的是 "Hook texImage2D"，但实际 Hook 的是 `drawImage`，属于注释与实际代码不一致的小瑕疵
- `1.user.js` 和 `2.user.js` 虽然声明了 `@require jszip` 和 `@require FileSaver.js`，但代码中并未使用这两个库（未实现 ZIP 打包功能）