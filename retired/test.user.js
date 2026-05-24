// ==UserScript==
// @name         DMM 图片下载器 - 实验版 v1
// @namespace    dmm-blob-png-zip-downloader-experiment-v1
// @author       gunfub
// @version      0.1
// @icon         https://www.google.com/s2/favicons?sz=64&domain=book.dmm.com
// @description  Hook texImage2D下载DMM图片
// @match        *://book.dmm.com/streaming/*
// @match        *://book.dmm.co.jp/streaming/*
// @match        *://book.dmm.com/product/*
// @match        *://book.dmm.co.jp/product/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const oldDrawImage =
        CanvasRenderingContext2D.prototype.drawImage;

    let saveIndex = 0;

    function saveCanvas(canvas) {

        try {

            canvas.toBlob(blob => {

                if (!blob) return;

                const a = document.createElement("a");

                a.href = URL.createObjectURL(blob);

                a.download =
                    `raw_${saveIndex++}_${canvas.width}x${canvas.height}.png`;

                a.click();

            });

        } catch(e) {
            console.log(e);
        }
    }

    CanvasRenderingContext2D.prototype.drawImage =
        function(...args) {

            try {

                const src = args[0];

                if (
                    src instanceof HTMLCanvasElement &&
                    src.width > 1000 &&
                    src.height > 1000
                ) {

                    console.log(
                        "[捕获canvas]",
                        src.width,
                        src.height,
                        src
                    );

                    saveCanvas(src);
                }

                if (
                    src instanceof HTMLImageElement
                ) {

                    console.log(
                        "[捕获img]",
                        src.src
                    );
                }

            } catch(e) {}

            return oldDrawImage.apply(this, args);
        };

})();