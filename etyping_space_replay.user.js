// ==UserScript==
// @name         e-typing - Space to Replay
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.2
// @description  リザルト画面でスペースキーを押すとページをリロードして次のゲームへ
// @match        *://*.e-typing.ne.jp/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_space_replay.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_space_replay.user.js
// ==/UserScript==

(function () {
  'use strict';

  const TAG = '[etyping_space_replay]';
  console.log(TAG, 'loaded on', location.href);

  // 「もう1回」ボタンが表示中(=リザルト画面)のときだけ Space を奪う。
  // ゲーム本編の Space(開始キー)を潰さないための条件分岐。
  function findVisibleReplayButton() {
    const btn = document.getElementById('replay_btn');
    if (!btn) return null;
    if (btn.offsetParent === null) return null; // display:none / 非表示
    return btn;
  }

  function handler(e) {
    if (e.key !== ' ' && e.code !== 'Space') return;
    if (e.repeat) return;

    const btn = findVisibleReplayButton();
    if (!btn) {
      console.log(TAG, 'space ignored (replay btn not visible)');
      return;
    }

    // サイトの clickReplayButton は AdGuard 等の隔離コンテキスト下で
    // parent.location.reload() がクロスオリジンエラーになり死ぬため、
    // ボタンクリックはせずに自前で reload する。
    console.log(TAG, 'space → location.reload()');
    e.preventDefault();
    e.stopImmediatePropagation();
    location.reload();
  }

  // window / document の両方の capture に登録(サイト側ハンドラより先に発火)
  window.addEventListener('keydown', handler, true);
  document.addEventListener('keydown', handler, true);
})();
