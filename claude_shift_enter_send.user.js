// ==UserScript==
// @name         Claude Shift+Enter to Send
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Enter で改行、Shift+Enter で送信に変更
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  document.addEventListener(
    'keydown',
    (e) => {
      // 対象: Enter キーのみ（IME変換中は無視）
      if (e.key !== 'Enter' || e.isComposing) return;

      // 入力エリア内かどうか
      const el = e.target;
      const isInput =
        el.matches('[contenteditable="true"]') ||
        el.tagName === 'TEXTAREA' ||
        el.closest('[contenteditable="true"]');
      if (!isInput) return;

      if (e.shiftKey) {
        // Shift+Enter → 送信ボタンをクリック
        e.preventDefault();
        e.stopImmediatePropagation();

        const sendBtn = document.querySelector(
          'button[aria-label="Send Message"]'
        );
        if (sendBtn) {
          sendBtn.click();
        }
      } else {
        // 素の Enter → 改行（デフォルト動作だが、元の送信を潰す）
        e.stopImmediatePropagation();
      }
    },
    true // capture phase で先に横取り
  );
})();
