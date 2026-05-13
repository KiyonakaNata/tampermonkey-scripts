// ==UserScript==
// @name         e-typing - Space to Start/Replay
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.3
// @description  スタート画面/リザルト画面でスペースキーを押してゲーム開始 or リロード
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

  function visible(el) {
    return el && el.offsetParent !== null;
  }

  function handler(e) {
    if (e.key !== ' ' && e.code !== 'Space') return;
    if (e.repeat) return;

    const startBtn = document.getElementById('start_btn');
    const replayBtn = document.getElementById('replay_btn');

    if (visible(startBtn)) {
      // スタート画面: AdGuard 下でも素のクリックは効くことがあるので試す
      console.log(TAG, 'space → click start_btn');
      e.preventDefault();
      e.stopImmediatePropagation();
      startBtn.click();
      return;
    }

    if (visible(replayBtn)) {
      // リザルト画面: サイトの clickReplayButton は AdGuard 等の隔離コンテキスト下で
      // parent.location.reload() がクロスオリジンエラーになり死ぬため、
      // ボタンクリックはせずに自前で reload する。
      console.log(TAG, 'space → location.reload()');
      e.preventDefault();
      e.stopImmediatePropagation();
      location.reload();
      return;
    }

    console.log(TAG, 'space ignored (start/replay btn not visible)');
  }

  // window / document の両方の capture に登録(サイト側ハンドラより先に発火)
  window.addEventListener('keydown', handler, true);
  document.addEventListener('keydown', handler, true);
})();
