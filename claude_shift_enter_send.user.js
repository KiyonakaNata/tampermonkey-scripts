// ==UserScript==
// @name         Claude Shift+Enter to Send
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Enter で改行、Shift+Enter で送信に変更
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  function findSendButton(fromEl) {
    // 祖先を遡って最初に見つかる type="submit" ボタンを使う
    // (メイン入力は form 内、編集モードは form なしのため form 依存だと取れない)
    let node = fromEl;
    while (node && node !== document.body) {
      const btn = node.querySelector('button[type="submit"]:not([disabled])');
      if (btn) return btn;
      node = node.parentElement;
    }
    return null;
  }

  // window-capture に登録。@run-at document-start で Claude 側より先に登録される。
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;

      const el = e.target;
      const editable =
        (el.matches && el.matches('[contenteditable="true"], textarea')) ||
        (el.closest && el.closest('[contenteditable="true"]'));
      if (!editable) return;

      if (e.shiftKey) {
        // Shift+Enter → 送信
        e.preventDefault();
        e.stopImmediatePropagation();
        const sendBtn = findSendButton(el);
        if (sendBtn) sendBtn.click();
      } else {
        // 素の Enter → 改行（textarea / contenteditable のデフォルトに任せる）
        // Claude 側の送信ハンドラを止めるため stopImmediatePropagation を呼ぶ
        e.stopImmediatePropagation();
      }
    },
    true
  );
})();
