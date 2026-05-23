// ==UserScript==
// @name         DMM 图片下载器
// @namespace    dmm-blob-png-zip-downloader
// @author       gunfub
// @version      1.0
// @icon         https://raw.githubusercontent.com/gunfub/DLsite-Play-Image-Downloader/refs/heads/main/source/Dlsite-Play-Image-Downloader--Chrome/icons/icon48.png
// @description  捕获 DMM Viewer 中的 blob 图片并打包下载为 ZIP
// @match        *://book.dmm.com/streaming/*
// @grant        none
// ==/UserScript==

/****************************************
 * Cloudreve Blob PNG ZIP Downloader (UI Enhanced)
 *Draggable modern UI, capture visible blob images, zip download
****************************************/


(() => {
  'use strict';

  console.log('[BlobZIP] script loaded');

  /********************
   * State
   ********************/
  let capturing = false;
  let pageIndex = 1;
  const captured = new Map();

  /********************
   * Utils
   ********************/
  const pad3 = n => String(n).padStart(3, '0');

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    const vw = innerWidth;
    const vh = innerHeight;
    return (
      r.width > 100 &&
      r.height > 100 &&
      r.bottom > vh * 0.1 &&
      r.top < vh * 0.9 &&
      r.right > vw * 0.1 &&
      r.left < vw * 0.9
    );
  }

  function imgToPNGBlob(img) {
    return new Promise(resolve => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => resolve(b), 'image/png');
    });
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
  header.textContent = '  DLsite Play 图片下载器';
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
   * Capture
   ********************/
  async function scan() {
    if (!capturing) return;

    const imgs = document.querySelectorAll('img[src^="blob:"]');

    for (const img of imgs) {
      if (!isVisible(img)) continue;
      if (captured.has(img.src)) continue;

      const name = `page_${pad3(pageIndex++)}.png`;
      const blob = await imgToPNGBlob(img);

      captured.set(img.src, { name, blob });
      logLine(`✔ 捕获成功：${name}`);
    }
  }

  setInterval(scan, 500);

  /********************
   * ZIP
   ********************/
  async function downloadZip() {
    if (!captured.size) {
      alert('没有捕获任何图片');
      return;
    }

    if (!window.JSZip) {
      await new Promise(resolve => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        s.onload = resolve;
        document.head.appendChild(s);
      });
    }

    const zip = new JSZip();
    for (const { name, blob } of captured.values()) {
      zip.file(name, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zipBlob);
    a.download = 'pages.zip';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /********************
   * Button
   ********************/
  btn.onclick = async () => {
    capturing = !capturing;

    if (capturing) {
      captured.clear();
      pageIndex = 1;
      log.value = '';
      btn.textContent = '结束捕获';
      btn.style.background = '#dc2626';
      logLine('▶ 开始捕获...');
    } else {
      btn.textContent = '开始捕获';
      btn.style.background = '#2563eb';
      logLine('■ 结束捕获，正在打包...');
      await downloadZip();
      logLine('✔ ZIP 下载完成');
    }
  };

})();
