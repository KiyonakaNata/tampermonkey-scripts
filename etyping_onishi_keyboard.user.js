// ==UserScript==
// @name         e-typing - Onishi layout
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  仮想キーボードの表示・次キーハイライト・指ガイドをQWERTY→大西配列に置換(大文字表示)
// @match        *://*.e-typing.ne.jp/app/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_onishi_keyboard.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/etyping_onishi_keyboard.user.js
// ==/UserScript==

(function () {
  'use strict';

  // 大西配列: QWERTYのキー位置クラス → 大西配列でその位置が担う文字
  // 上段: q l u , .   f w r y p   (key_192 の @ 位置はラベルのみ '/' に置換)
  // 中段: e i a o -   k t n s h
  // 下段: z x c v ;   g d m j b
  const ONISHI = {
    key_q: 'q', key_w: 'l', key_e: 'u', key_r: ',', key_t: '.',
    key_y: 'f', key_u: 'w', key_i: 'r', key_o: 'y', key_p: 'p',
    key_192: '/',
    key_a: 'e', key_s: 'i', key_d: 'a', key_f: 'o', key_g: '-',
    key_h: 'k', key_j: 't', key_k: 'n', key_l: 's', key_187: 'h',
    key_z: 'z', key_x: 'x', key_c: 'c', key_v: 'v', key_b: ';',
    key_n: 'g', key_m: 'd', key_comma: 'm', key_dot: 'j', key_191: 'b',
  };

  // 大西で打ちたい文字 → その文字を打つ物理キーのQWERTYクラス(逆引き)
  const CHAR_TO_POS = {};
  for (const [cls, ch] of Object.entries(ONISHI)) CHAR_TO_POS[ch] = cls;

  // QWERTYキークラス → そのキーがQWERTY配列で対応する文字
  const QWERTY_CHAR = {
    key_q: 'q', key_w: 'w', key_e: 'e', key_r: 'r', key_t: 't',
    key_y: 'y', key_u: 'u', key_i: 'i', key_o: 'o', key_p: 'p',
    key_a: 'a', key_s: 's', key_d: 'd', key_f: 'f', key_g: 'g',
    key_h: 'h', key_j: 'j', key_k: 'k', key_l: 'l', key_187: ';',
    key_z: 'z', key_x: 'x', key_c: 'c', key_v: 'v', key_b: 'b',
    key_n: 'n', key_m: 'm', key_comma: ',', key_dot: '.', key_191: '/',
  };

  // -------- ラベル置換(MutationObserverで追従) --------
  // 内部マップは小文字のまま(QWERTY_CHARや判定ロジックの一貫性を保つ)、
  // 表示時のみ toUpperCase()。記号は変化しない。
  function applyLabels(root) {
    for (const [cls, label] of Object.entries(ONISHI)) {
      const display = label.toUpperCase();
      root.querySelectorAll('.' + cls).forEach((el) => {
        if (el.textContent !== display) el.textContent = display;
      });
    }
  }

  // -------- active / 指の付け替え --------
  function findKeyClass(el) {
    if (!el || !el.classList) return null;
    for (const c of el.classList) {
      if (QWERTY_CHAR[c] !== undefined) return c;
    }
    return null;
  }

  function syncFinger(key) {
    const finger = ['little', 'ring', 'middle', 'index', 'thumb']
      .find((f) => key.classList.contains(f));
    const side = ['left', 'right'].find((s) => key.classList.contains(s));
    if (!finger || !side) return;
    const hands = document.getElementById('hands');
    if (!hands) return;
    hands.querySelectorAll('.finger.on').forEach((f) => f.classList.remove('on'));
    const target = hands.querySelector(`.finger.${finger}.${side}`);
    if (target) target.classList.add('on');
  }

  // e-typing が active を立てに来たキー(intendedEl) を、大西配列での物理位置にリダイレクト
  function handleActive(intendedEl) {
    const intendedCls = findKeyClass(intendedEl);
    if (!intendedCls) return;
    const char = QWERTY_CHAR[intendedCls];
    if (!char) return;
    const targetCls = CHAR_TO_POS[char];
    if (!targetCls) return;

    const kb = document.getElementById('full_keyboard');
    if (!kb) return;

    // 過去に自分が付けた redirect を全部撤去(別キーへの移行/同キーへの再来 両対応)
    for (const el of kb.querySelectorAll('[data-onishi-redirected="1"]')) {
      el.classList.remove('active');
      delete el.dataset.onishiRedirected;
    }

    if (intendedCls === targetCls) {
      // 同位置(q/p/z/x/c/v など)→ e-typing の active のまま、指だけ同期
      syncFinger(intendedEl);
      return;
    }

    intendedEl.classList.remove('active');
    const target = kb.querySelector('.' + targetCls);
    if (!target) return;
    target.classList.add('active');
    target.dataset.onishiRedirected = '1';
    syncFinger(target);
  }

  // 指の `on` を、現在の redirect 先キーに合わせて再付与する
  function handleFingerOn() {
    const kb = document.getElementById('full_keyboard');
    if (!kb) return;
    const ourKey = kb.querySelector('[data-onishi-redirected="1"].active');
    if (ourKey) syncFinger(ourKey);
    // redirect していない(同位置)場合は e-typing の指選択が正しいので何もしない
  }

  // -------- jQuery.fn.addClass フック --------
  // MutationObserver では「既に active なキーに addClass('active')」を検知できない
  // (例: 大西の'u'を key_e に redirect 済みの状態で e-typing が次の'e'を key_e に立てに来る)
  // ためフックで確実にイベントを取る。
  // 指の `on` も同様にフック(e-typing が active の後で QWERTY 基準の指を立てて上書きしてくるため)。
  function hookJQuery() {
    const $ = window.jQuery;
    if (!$ || !$.fn || !$.fn.addClass) {
      setTimeout(hookJQuery, 100);
      return;
    }
    if ($.fn.addClass.__onishiHooked) return;
    const origAdd = $.fn.addClass;
    $.fn.addClass = function (value) {
      const result = origAdd.apply(this, arguments);
      try {
        if (typeof value === 'string') {
          if (/\bactive\b/.test(value)) {
            this.each(function () {
              if (findKeyClass(this)) handleActive(this);
            });
          }
          if (/\bon\b/.test(value)) {
            let touched = false;
            this.each(function () {
              if (this.classList && this.classList.contains('finger')) touched = true;
            });
            if (touched) handleFingerOn();
          }
        }
      } catch (_) { /* noop */ }
      return result;
    };
    $.fn.addClass.__onishiHooked = true;
    console.log('[onishi] jQuery addClass hook installed');
  }

  // -------- 起動 --------
  let labelsPending = false;
  function scheduleLabels() {
    if (labelsPending) return;
    labelsPending = true;
    queueMicrotask(() => {
      labelsPending = false;
      applyLabels(document);
    });
  }

  function start() {
    applyLabels(document);
    new MutationObserver(scheduleLabels).observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    hookJQuery();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
