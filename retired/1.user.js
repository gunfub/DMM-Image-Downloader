// ==UserScript==
// @name         DMM 图片下载器-t2
// @namespace    dmm-blob-png-zip-downloader-t2
// @author       gunfub
// @version      2.0
// @icon         https://www.google.com/s2/favicons?sz=64&domain=book.dmm.com
// @description  捕获 DMM Viewer 中的图片原始尺寸并打包下载为 ZIP
// @match        *://book.dmm.com/streaming/*
// @match        *://book.dmm.co.jp/streaming/*
// @match        *://book.dmm.com/product/*
// @match        *://book.dmm.co.jp/product/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成（阅读器脚本通常需要一点时间）
    window.addEventListener('load', function() {
        // 添加浮动按钮
        let btn = document.createElement('div');
        btn.textContent = '📸 保存当前页';
        btn.style.position = 'fixed';
        btn.style.bottom = '20px';
        btn.style.right = '20px';
        btn.style.zIndex = '999999';
        btn.style.backgroundColor = '#2c3e50';
        btn.style.color = '#ecf0f1';
        btn.style.padding = '12px 20px';
        btn.style.borderRadius = '40px';
        btn.style.fontFamily = 'sans-serif';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = 'bold';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        btn.style.border = 'none';
        btn.style.userSelect = 'none';
        btn.style.transition = 'background 0.2s';
        btn.onmouseenter = () => btn.style.backgroundColor = '#1e2b38';
        btn.onmouseleave = () => btn.style.backgroundColor = '#2c3e50';
        document.body.appendChild(btn);

        // 查找当前显示的主画布（支持单页/双页/宽屏模式）
        function getCurrentCanvas() {
            // 优先：普通模式下的当前屏幕画布
            let canvas = document.querySelector('#renderer .currentScreen canvas.default');
            if (canvas && canvas.width > 0) return canvas;

            // 其次：宽屏模式下的画布（取当前可视区域内的第一个画布）
            let wideCanvas = document.querySelector('#viewportW .canvasRoot canvas.default');
            if (wideCanvas && wideCanvas.width > 0) return wideCanvas;

            // 兜底：任意可见的画布
            canvas = document.querySelector('#renderer canvas, #viewport0 canvas');
            if (canvas && canvas.width > 0) return canvas;

            return null;
        }

        // 保存画布为 PNG 文件
        function saveCanvas(canvas) {
            const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nfbr_page_${timestamp}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }

        // 按钮点击事件
        btn.addEventListener('click', () => {
            const canvas = getCurrentCanvas();
            if (!canvas) {
                alert('未找到当前页的画布，请稍后再试或翻页后重试。');
                return;
            }
            saveCanvas(canvas);
        });
    });
})();