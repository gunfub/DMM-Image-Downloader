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

    let pickerActive = false;
    let originalCursor = '';

    // 创建浮动按钮面板
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '20px';
    panel.style.right = '20px';
    panel.style.zIndex = '999999';
    panel.style.display = 'flex';
    panel.style.gap = '10px';
    panel.style.backgroundColor = 'rgba(0,0,0,0.7)';
    panel.style.padding = '8px 12px';
    panel.style.borderRadius = '40px';
    panel.style.backdropFilter = 'blur(8px)';
    panel.style.fontFamily = 'sans-serif';

    // 保存按钮
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '📸 保存当前页';
    saveBtn.style.padding = '6px 12px';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '20px';
    saveBtn.style.backgroundColor = '#2c3e50';
    saveBtn.style.color = 'white';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontWeight = 'bold';

    // 点选按钮
    const pickBtn = document.createElement('button');
    pickBtn.textContent = '🔍 点选画布';
    pickBtn.style.padding = '6px 12px';
    pickBtn.style.border = 'none';
    pickBtn.style.borderRadius = '20px';
    pickBtn.style.backgroundColor = '#16a085';
    pickBtn.style.color = 'white';
    pickBtn.style.cursor = 'pointer';
    pickBtn.style.fontWeight = 'bold';

    panel.appendChild(saveBtn);
    panel.appendChild(pickBtn);
    document.body.appendChild(panel);

    // 保存指定 canvas
    function saveCanvas(canvas, filename = null) {
        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            alert('无效的画布对象');
            return false;
        }
        try {
            const timestamp = new Date().toISOString().slice(0,19).replace(/:/g, '-');
            const name = filename || `canvas_${timestamp}.png`;
            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
            return true;
        } catch(e) {
            alert('保存失败：' + e.message);
            return false;
        }
    }

    // 自动查找当前最可能显示内容的画布（兜底）
    function findLikelyCanvas() {
        // 查找所有可见且尺寸较大的画布
        const canvases = Array.from(document.querySelectorAll('canvas'));
        let best = null;
        let maxArea = 0;
        for (let c of canvases) {
            const rect = c.getBoundingClientRect();
            const area = rect.width * rect.height;
            if (area > 10000 && area > maxArea && c.width > 0 && c.height > 0) {
                // 检查是否在视口内可见（透明度为1，display不为none）
                const style = getComputedStyle(c);
                if (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0) {
                    maxArea = area;
                    best = c;
                }
            }
        }
        return best;
    }

    // 保存当前页（自动模式）
    saveBtn.addEventListener('click', () => {
        const canvas = findLikelyCanvas();
        if (!canvas) {
            alert('未找到有效的画布，请尝试使用“点选画布”功能手动选择。');
            return;
        }
        saveCanvas(canvas);
    });

    // 点选模式：点击页面任意位置，捕获该位置的画布
    function onDocumentClick(e) {
        if (!pickerActive) return;
        e.preventDefault();
        e.stopPropagation();

        // 获取点击位置下的元素
        let el = document.elementFromPoint(e.clientX, e.clientY);
        // 向上查找 canvas 元素
        while (el && !(el instanceof HTMLCanvasElement)) {
            el = el.parentElement;
        }
        if (!el) {
            alert('未点击到 canvas 元素，请点击页面上显示图片的区域。');
            deactivatePicker();
            return;
        }
        // 确认保存
        if (confirm(`是否保存此画布？\n尺寸：${el.width} x ${el.height}`)) {
            saveCanvas(el);
        }
        deactivatePicker();
    }

    function deactivatePicker() {
        pickerActive = false;
        document.body.style.cursor = originalCursor;
        document.removeEventListener('click', onDocumentClick, true);
        pickBtn.style.backgroundColor = '#16a085';
        pickBtn.textContent = '🔍 点选画布';
    }

    function activatePicker() {
        if (pickerActive) {
            deactivatePicker();
            return;
        }
        pickerActive = true;
        originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'crosshair';
        pickBtn.style.backgroundColor = '#e67e22';
        pickBtn.textContent = '✓ 点击页面区域';
        document.addEventListener('click', onDocumentClick, true);
        // 5秒后自动取消点选模式
        setTimeout(() => {
            if (pickerActive) deactivatePicker();
        }, 5000);
    }

    pickBtn.addEventListener('click', activatePicker);

    // 小提示：控制台可用 window.__NFBR_SAVE_CANVAS = saveCanvas 方便调试
    window.__NFBR_SAVE_CANVAS = saveCanvas;
})();