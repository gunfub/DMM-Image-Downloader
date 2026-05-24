// ==UserScript==
// @name         DMM 图片下载器
// @namespace    dmm-blob-png-zip-downloader
// @author       gunfub
// @version      1.4
// @icon         https://www.google.com/s2/favicons?sz=64&domain=book.dmm.com
// @description  捕获 DMM 中的 Canvas 图片并打包下载为 ZIP
// @match        *://book.dmm.com/streaming/*
// @match        *://book.dmm.co.jp/streaming/*
// @match        *://book.dmm.com/product/*
// @match        *://book.dmm.co.jp/product/*
// @grant        none
// ==/UserScript==

/****************************************
 * DMM Canvas Image ZIP Downloader (UI Enhanced)
 * Draggable modern UI, hook drawImage to capture canvas, zip download
 ****************************************/

(() => {
  'use strict';

  console.log('[DMM-ZIP] script loaded');

  /********************
   * State
   ********************/
  let capturing = false;
  let pageIndex = 1;
  const captured = [];
  let preCapture = null;

  /********************
   * Utils
   ********************/
  const pad3 = n => String(n).padStart(3, '0');

  function canvasToPNGBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), 'image/png');
    });
  }

  async function hashBlob(blob) {
    const buf = await blob.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /********************
   * UI
   ********************/
  const panel = document.createElement('div');
  panel.style.cssText = `
    position: fixed;
    right: 24px;
    bottom: 24px;
    width: 280px;
    background: rgba(20,20,20,0.60);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: #f3f4f6;
    font-family: system-ui, -apple-system, BlinkMacSystemFont;
    font-size: 13px;
    border-radius: 14px;
    box-shadow: 0 16px 40px rgba(0,0,0,.45);
    z-index: 99999;
    user-select: none;
  `;

  const header = document.createElement('div');
  header.textContent = '  DMM 图片下载器';
  header.style.cssText = `
    padding: 10px 12px;
    cursor: move;
    font-weight: 600;
    letter-spacing: .3px;
    color: #e5e7eb;
    background: rgba(255,255,255,0.06);
    border-top-left-radius: 14px;
    border-top-right-radius: 14px;
  `;

  const body = document.createElement('div');
  body.style.cssText = `
    padding: 10px 12px 12px;
  `;

  const btn = document.createElement('button');
  btn.textContent = '开始捕获';
  btn.style.cssText = `
    width: 100%;
    padding: 10px 0;
    margin-bottom: 10px;
    background: #2563eb;
    border: none;
    border-radius: 10px;
    color: white;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  btn.onmouseenter = () => btn.style.background = '#1d4ed8';
  btn.onmouseleave = () => btn.style.background = capturing ? '#dc2626' : '#2563eb';

  const log = document.createElement('textarea');
  log.readOnly = true;
  log.style.cssText = `
    width: 100%;
    height: 160px;
    background: rgba(0,0,0,0.4);
    color: #a7f3d0;
    border: none;
    border-radius: 8px;
    padding: 6px;
    resize: none;
    font-family: ui-monospace, SFMono-Regular, Menlo;
    font-size: 12px;
  `;

  body.append(btn, log);
  panel.append(header, body);
  document.body.appendChild(panel);

  function logLine(text) {
    log.value += text + '\n';
    log.scrollTop = log.scrollHeight;
  }

  /********************
   * Drag
   ********************/
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  header.addEventListener('pointerdown', e => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    header.setPointerCapture(e.pointerId);
  });

  header.addEventListener('pointermove', e => {
    if (!dragging) return;
    panel.style.left = e.clientX - offsetX + 'px';
    panel.style.top = e.clientY - offsetY + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });

  header.addEventListener('pointerup', e => {
    dragging = false;
    header.releasePointerCapture(e.pointerId);
  });

  /********************
   * Capture Hook
   ********************/
  const oldDrawImage = CanvasRenderingContext2D.prototype.drawImage;

  CanvasRenderingContext2D.prototype.drawImage = function(...args) {
    try {
      const src = args[0];

      if (
        src instanceof HTMLCanvasElement &&
        src.width > 1000 &&
        src.height > 1000
      ) {
        canvasToPNGBlob(src).then(blob => {
          if (!blob) return;
          if (capturing) {
            const name = `page_${pad3(pageIndex++)}.png`;
            captured.push({ name, blob });
            logLine(`\u2714 捕获成功：${name}  (${src.width}x${src.height})`);
          } else {
            preCapture = blob;
          }
        }).catch(e => {
          console.warn('[DMM-ZIP] canvas toBlob 失败:', e);
        });
      }
    } catch(e) {
      // 静默忽略，确保原始绘制不受影响
    }

    return oldDrawImage.apply(this, args);
  };

  /********************
   * ZIP
   ********************/
  async function downloadZip() {
    if (!captured.length) {
      alert('没有捕获任何图片');
      return;
    }

    // Hash 去重：保持首次出现顺序
    logLine('\u25B6 正在去重...');
    const seen = new Set();
    const unique = [];
    let dupCount = 0;

    for (const item of captured) {
      const hash = await hashBlob(item.blob);
      if (seen.has(hash)) {
        dupCount++;
      } else {
        seen.add(hash);
        unique.push(item);
      }
    }

    if (dupCount > 0) {
      logLine(`\u26A0 去除 ${dupCount} 张重复图片`);
    }
    logLine(`\u2714 有效图片 ${unique.length} 张`);

    if (!window.JSZip) {
      await new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }

    const zip = new JSZip();
    for (const { name, blob } of unique) {
      zip.file(name, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = 'dmm_pages.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /********************
   * Button
   ********************/
  btn.onclick = async () => {
    capturing = !capturing;

    if (capturing) {
      captured.length = 0;
      pageIndex = 1;
      log.value = '';
      btn.textContent = '结束捕获';
      btn.style.background = '#dc2626';

      if (preCapture) {
        const name = `page_${pad3(pageIndex++)}.png`;
        captured.push({ name, blob: preCapture });
        logLine(`\u2714 捕获成功：${name}  (\u9884\u6355\u83B7)`);
        preCapture = null;
      }

      logLine('\u25B6 开始捕获...');
    } else {
      btn.textContent = '开始捕获';
      btn.style.background = '#2563eb';
      logLine('\u25A0 结束捕获，正在打包...');
      await downloadZip();
      logLine('\u2714 ZIP 下载完成');
    }
  };

})();