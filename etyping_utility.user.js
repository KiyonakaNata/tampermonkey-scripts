// ==UserScript==
// @name         e-typing - Utility (all-in-one)
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  e-typing用ユーティリティ詰め合わせ。Tampermonkeyメニューから個別ON/OFF (新タブ / Spaceリプレイ / ダーク配色 / カラムスタッカード)
// @match        *://*.e-typing.ne.jp/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_utility.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_utility.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 機能フラグ + メニュー
  // ============================================================
  const FEATURES = [
    { key: 'newTab',          label: 'New Tab',          default: true },
    { key: 'spaceReplay',     label: 'Space Replay',     default: true },
    { key: 'darkMode',        label: 'Dark Mode',        default: true },
    { key: 'columnStaggered', label: 'Column Staggered', default: true },
  ];

  const enabled = {};
  for (const f of FEATURES) enabled[f.key] = GM_getValue(f.key, f.default);

  for (const f of FEATURES) {
    GM_registerMenuCommand(
      `${f.label}: ${enabled[f.key] ? 'ON' : 'OFF'}`,
      () => {
        GM_setValue(f.key, !enabled[f.key]);
        location.reload();
      }
    );
  }

  console.log('[etyping_utility] enabled:', enabled);

  // ============================================================
  // 新タブ: 練習リンクをモーダル(iframe)ではなく新タブで開く
  // ============================================================
  function setupNewTab() {
    function rewrite(a) {
      if (a.dataset.etypingRewritten === '1') return;
      const url = a.dataset.appUrl;
      if (!url) return;
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.dataset.etypingRewritten = '1';
    }

    function rewriteAll(root) {
      root.querySelectorAll('a[data-app-url]').forEach(rewrite);
    }

    document.addEventListener(
      'click',
      (e) => {
        const a = e.target.closest && e.target.closest('a[data-app-url]');
        if (!a) return;
        e.stopImmediatePropagation();
      },
      true
    );

    function start() {
      rewriteAll(document);
      new MutationObserver((muts) => {
        for (const m of muts) {
          for (const n of m.addedNodes) {
            if (n.nodeType !== 1) continue;
            if (n.matches && n.matches('a[data-app-url]')) rewrite(n);
            else if (n.querySelectorAll) rewriteAll(n);
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  // ============================================================
  // Space Replay: スタート画面/リザルト画面でSpaceで開始 or リロード
  // ============================================================
  function setupSpaceReplay() {
    function visible(el) {
      return el && el.offsetParent !== null;
    }

    function handler(e) {
      if (e.key !== ' ' && e.code !== 'Space') return;
      if (e.repeat) return;

      const startBtn = document.getElementById('start_btn');
      const replayBtn = document.getElementById('replay_btn');

      if (visible(startBtn)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        startBtn.click();
        return;
      }

      if (visible(replayBtn)) {
        // サイトの clickReplayButton は AdGuard 等の隔離コンテキスト下で
        // parent.location.reload() がクロスオリジンエラーになり死ぬため、
        // ボタンクリックはせずに自前で reload する。
        e.preventDefault();
        e.stopImmediatePropagation();
        location.reload();
        return;
      }
    }

    window.addEventListener('keydown', handler, true);
    document.addEventListener('keydown', handler, true);
  }

  // ============================================================
  // Dark Mode: タイピングアプリ画面全体をダーク配色
  // (selectorが /app/ 配下にしか存在しないものが大半なので、
  //  トップページに当ててもほぼ無害)
  // ============================================================
  function setupDarkMode() {
    function inject() {
      if (document.getElementById('etyping-dark-style')) return;
      const style = document.createElement('style');
      style.id = 'etyping-dark-style';
      style.textContent = `
        html, body { background: #1a1d23 !important; color: #d0d0d0 !important; }
        #app { background-color: #1a1d23 !important; }

        #start_view .title, #start_view .explain { color: #d0d0d0 !important; }
        #start_view #func_view {
          background-color: #2c313a !important;
          border-color: #3a3f48 !important;
          color: #d0d0d0 !important;
        }

        #example_container, .long_typing #second_container {
          background: #21252b !important;
          border-color: #3a3f48 !important;
        }
        #exampleText, #kanaText, #sentenceText { color: #d0d0d0 !important; }
        #sentenceText > div u { color: #4a5560 !important; }
        #example_container .entered, #example_container .entered u { color: #ffd0a6 !important; }
        #start_msg, #start_msg p { color: #d0d0d0 !important; }
        #countdown { color: #ff9c00 !important; }

        #result #current, #result #prev, #result #comment, #result #exampleList {
          background: #21252b !important;
          border-color: #3a3f48 !important;
        }
        #result h1, #result li, #result .container, #result #exampleList ul li { color: #d0d0d0 !important; }
        #result #current h1 { color: #4aa3ff !important; }
        #result .result_data { background-color: #21252b !important; }
        #result .result_data ul li { border-bottom-color: #3a3f48 !important; }
        #result .result_data ul li .data { color: #4aa3ff !important; }
        #result .result_data ul li .title { color: #d0d0d0 !important; }
        #result #close_btn { color: #d0d0d0 !important; background-color: #2c313a !important; }

        #error_view .title { color: #d0d0d0 !important; }
        #error_view #back_btn { color: #d0d0d0 !important; background-color: #2c313a !important; }

        #dialog #dialog_btns .closeBtn { color: #d0d0d0 !important; background-color: #2c313a !important; }

        #virtual_keyboard #vk_container #full_keyboard div,
        #virtual_keyboard #vk_container #ten_keyboard div {
          background-color: #2c313a !important;
          color: #e6e6e6 !important;
          border-color: #3a3f48 !important;
          text-shadow: none !important;
        }
        #virtual_keyboard #vk_container #full_keyboard.home_position div.little.left,
        #virtual_keyboard #vk_container #full_keyboard.home_position div.little.right {
          background-color: #1d3a1d !important; border-color: #3a6a3a !important; color: #6dd06b !important;
        }
        #virtual_keyboard #vk_container #full_keyboard.home_position div.ring.left,
        #virtual_keyboard #vk_container #full_keyboard.home_position div.ring.right {
          background-color: #1d3a32 !important; border-color: #3a6a5a !important; color: #6ad0b0 !important;
        }
        #virtual_keyboard #vk_container #full_keyboard.home_position div.middle.left,
        #virtual_keyboard #vk_container #full_keyboard.home_position div.middle.right {
          background-color: #1d3236 !important; border-color: #3a606a !important; color: #6acdd0 !important;
        }
        #virtual_keyboard #vk_container #full_keyboard.home_position div.index.left {
          background-color: #1d2c3a !important; border-color: #3a546a !important; color: #6a9bd0 !important;
        }
        #virtual_keyboard #vk_container #full_keyboard.home_position div.index.right {
          background-color: #3a1d3a !important; border-color: #6a3a6a !important; color: #d06ad0 !important;
        }
        #virtual_keyboard #vk_container #full_keyboard div.active,
        #virtual_keyboard #vk_container #ten_keyboard div.active {
          background-color: #ff9c00 !important;
          border-color: #ff9c00 !important;
          color: #fff !important;
        }

        #hands .finger { background-color: #2c313a !important; }
        #hands .finger.on { background-color: #ff9c00 !important; }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    inject();
    if (!document.body) document.addEventListener('DOMContentLoaded', inject, { once: true });
  }

  // ============================================================
  // Column Staggered: 仮想キーボードの段ごとの横ズレを排除
  // ============================================================
  function setupColumnStaggered() {
    function inject() {
      if (document.getElementById('etyping-colstag-style')) return;
      const style = document.createElement('style');
      style.id = 'etyping-colstag-style';
      style.textContent = `
        /* 数字段 (key_189(-)は原位置のまま。move すると key_222 と衝突するため) */
        #virtual_keyboard #vk_container #full_keyboard div.key_49 { left: 61px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_50 { left: 102px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_51 { left: 143px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_52 { left: 184px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_53 { left: 225px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_54 { left: 266px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_55 { left: 307px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_56 { left: 348px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_57 { left: 389px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_48 { left: 430px !important; }

        /* ホーム段 */
        #virtual_keyboard #vk_container #full_keyboard div.key_a { left: 61px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_s { left: 102px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_d { left: 143px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_f { left: 184px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_g { left: 225px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_h { left: 266px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_j { left: 307px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_k { left: 348px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_l { left: 389px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_187 { left: 430px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_186 { left: 471px !important; }

        /* 下段 */
        #virtual_keyboard #vk_container #full_keyboard div.key_z { left: 61px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_x { left: 102px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_c { left: 143px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_v { left: 184px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_b { left: 225px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_n { left: 266px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_m { left: 307px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_comma { left: 348px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_dot { left: 389px !important; }
        #virtual_keyboard #vk_container #full_keyboard div.key_191 { left: 430px !important; }

        #virtual_keyboard #vk_container #full_keyboard div.key_shift_left { width: 56px !important; }
        #virtual_keyboard #vk_container #full_keyboard div#key_20 { width: 56px !important; }
      `;
      (document.head || document.documentElement).appendChild(style);
    }

    inject();
    if (!document.body) document.addEventListener('DOMContentLoaded', inject, { once: true });
  }

  // ============================================================
  // 起動
  // ============================================================
  if (enabled.newTab)          setupNewTab();
  if (enabled.spaceReplay)     setupSpaceReplay();
  if (enabled.darkMode)        setupDarkMode();
  if (enabled.columnStaggered) setupColumnStaggered();
})();
