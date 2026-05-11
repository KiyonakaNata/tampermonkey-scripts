// ==UserScript==
// @name         Claude.ai - Hide GDrive Button
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  Claudeのファイル生成カードに表示されるGoogle Driveエクスポートボタンを非表示化
// @match        https://claude.ai/*
// @match        https://*.claude.ai/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_hide_gdrive_button.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_hide_gdrive_button.user.js
// ==/UserScript==

(() => {
  'use strict';

  const css = `
    /* Google Drive アイコンを含むボタンを非表示
       - #0066DA はGoogle Driveブランドの青
       - pathのd属性プレフィックスで、このSVG固有の形状にマッチさせ誤爆防止 */
    button:has(> svg path[fill="#0066DA"][d^="M1.84624"]) {
      display: none !important;
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;

  // document-start で動くので head がまだ無いケースに備える
  (document.head || document.documentElement).appendChild(style);
})();