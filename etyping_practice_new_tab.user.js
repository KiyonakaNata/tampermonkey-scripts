// ==UserScript==
// @name         e-typing - Practice link to new tab
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  練習選択リンクをモーダル(iframe)ではなく新しいタブで開く
// @match        *://*.e-typing.ne.jp/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_practice_new_tab.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_practice_new_tab.user.js
// ==/UserScript==

(function () {
  'use strict';

  const TAG = '[etyping_practice_new_tab]';

  // href は iframe 表示用URL (?iframe=true&width=...) なので、
  // data-app-url(素のアプリURL)に差し替え + target=_blank 化する。
  function rewrite(a) {
    if (a.dataset.etypingRewritten === '1') return;
    const url = a.dataset.appUrl;
    if (!url) return;
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener'; // 元の rel="typingApp" を潰してサイトのデリゲートを外す
    a.dataset.etypingRewritten = '1';
  }

  function rewriteAll(root) {
    root.querySelectorAll('a[data-app-url]').forEach(rewrite);
  }

  // 直接バインドされているサイト側ハンドラ(モーダル展開)を capture で抑止。
  // preventDefault はしない → ブラウザの素の挙動で新タブが開く(中クリックも同様)。
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
    console.log(TAG, 'ready');
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
