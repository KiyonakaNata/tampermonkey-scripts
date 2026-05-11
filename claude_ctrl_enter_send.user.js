// ==UserScript==
// @name         Claude.ai - Ctrl+Enter to Send
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.2
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
    // 祖先を遡って近い順に探す:
    // 1. aria-label が「送信」または "Send" を含むボタン (メイン入力欄の送信ボタン)
    // 2. text が「保存」または "Save" の submit ボタン (編集モードの保存ボタン)
    //
    // 注: メイン入力欄の「送信」ボタンは type="button" で、aria-label="メッセージを送信"。
    // 同階層に type="submit" の他ボタン(プロジェクト選択等)が居るため type だけでは誤爆する。
    let node = fromEl;
    while (node && node !== document.body) {
      const send = node.querySelector(
        'button[aria-label*="送信"]:not([disabled]), button[aria-label*="Send" i]:not([disabled])'
      );
      if (send) return send;

      const submits = node.querySelectorAll('button[type="submit"]:not([disabled])');
      for (const btn of submits) {
        const text = (btn.textContent || '').trim();
        if (text === '保存' || text === 'Save') return btn;
      }

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
