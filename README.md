# DMM-Image-Downloader

捕获 DMM 中的 Canvas 图片并打包下载为 ZIP

Capture Canvas images from DMM and package them into a ZIP download



## 安装

该插件以 Tampermonkey 用户脚本形式提供。

需先安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展，然后点击以下链接安装本脚本：

[点此安装 DMM 图片下载器](https://raw.githubusercontent.com/gunfub/DMM-Image-Downloader/main/release/DMMID-1.4--Tampermonkey.user.js)



## 使用

1. 打开 DMM 的漫画/图片浏览页面（支持 `book.dmm.com` / `book.dmm.co.jp` 的 `streaming` 和 `product` 页面）。
2. 页面右下角会出现一个浮动面板，点击 **"开始捕获"** 按钮。
3. 逐页浏览至最后一页或你希望终止的位置。
4. 点击 **"结束捕获"** 按钮，脚本会自动将所有捕获到的图片去重并打包为 ZIP 文件，通过浏览器下载功能提供保存。

> **提示：** 浮动面板支持拖拽，你可以将其移动到页面任意位置，避免遮挡内容。

<img src="https://raw.githubusercontent.com/gunfub/DMM-Image-Downloader/main/pictures/Floating_window_interface.png" style="zoom: 67%;" />

## 功能特性

- **Canvas 劫持捕获**：通过 Hook `CanvasRenderingContext2D.drawImage` 方法拦截高分辨率 Canvas 图像的绘制，无需手动操作。
- **预捕获机制**：在点击"开始捕获"之前，脚本已开始监测页面中的 Canvas 绘制，确保不会遗漏当前已加载的图片。
- **SHA-256 去重**：打包前自动检测重复图片并去除，保证 ZIP 中每张图片唯一。
- **浮动面板 UI**：毛玻璃风格的现代 UI 面板，支持拖拽移动，实时显示捕获日志。
- **自动加载 JSZip**：无需额外依赖，脚本会自动从 CDN 加载 JSZip 库。



## 适用站点

- `https://book.dmm.com/streaming/*`
- `https://book.dmm.co.jp/streaming/*`
- `https://book.dmm.com/product/*`
- `https://book.dmm.co.jp/product/*`



## 许可证

GPL-3.0 license