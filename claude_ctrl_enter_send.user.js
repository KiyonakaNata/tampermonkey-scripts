// ==UserScript==
// @name         Claude.ai - Ctrl+Enter to Send
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.1
// @description  Enter / Shift+Enter で改行、Ctrl+Enter で送信に変更
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_ctrl_enter_send.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_ctrl_enter_send.user.js
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

      // Shift+Enter は素通り(Claudeデフォルトの改行に任せる)
      if (e.shiftKey) return;

      if (e.ctrlKey) {
        // Ctrl+Enter → 送信
        e.preventDefault();
        e.stopImmediatePropagation();
        const sendBtn = findSendButton(el);
        if (sendBtn) sendBtn.click();
      } else {
        // 素の Enter → 改行(Claudeの送信ハンドラを止めるだけ。defaultの改行はそのまま)
        e.stopImmediatePropagation();
      }
    },
    true
  );
})();
