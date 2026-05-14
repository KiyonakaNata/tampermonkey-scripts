// ==UserScript==
// @name         Claude.ai - Tools
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  Claude.ai 向けの複数機能を1スクリプトに統合 (Hide GDrive / Adaptive Width / Ctrl+Enter Send / Done Beep)。Tampermonkeyメニューから個別ON/OFF
// @match        https://claude.ai/*
// @match        https://*.claude.ai/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_tools.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_tools.user.js
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 機能フラグ + メニュー
  // ============================================================
  const FEATURES = [
    { key: 'hideGDrive',     label: 'Hide GDrive Button', default: true },
    { key: 'adaptiveWidth',  label: 'Adaptive Width',     default: true },
    { key: 'ctrlEnterSend',  label: 'Ctrl+Enter Send',    default: true },
    { key: 'doneBeep',       label: 'Done Beep',          default: true },
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

  console.log('[claude_tools] enabled:', enabled);

  // ============================================================
  // Hide GDrive Button: Google Drive エクスポートボタンを非表示
  // ============================================================
  function setupHideGDrive() {
    const style = document.createElement('style');
    style.textContent = `
      /* Google Drive アイコンを含むボタンを非表示
         - #0066DA はGoogle Driveブランドの青
         - pathのd属性プレフィックスで、このSVG固有の形状にマッチさせ誤爆防止 */
      button:has(> svg path[fill="#0066DA"][d^="M1.84624"]) {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // ============================================================
  // Adaptive Width: アーティファクト非表示時のみチャット幅を拡張
  // ============================================================
  function setupAdaptiveWidth() {
    const WIDE_WIDTH = '960px';
    const styleEl = document.createElement('style');
    styleEl.id = 'claude-adaptive-width';

    function update() {
      const hasArtifact = document.getElementById('wiggle-file-content');
      styleEl.textContent = hasArtifact
        ? ''
        : `.max-w-3xl { max-width: ${WIDE_WIDTH} !important; }`;
    }

    function start() {
      document.head.appendChild(styleEl);
      new MutationObserver(() => requestAnimationFrame(update))
        .observe(document.body, { childList: true, subtree: true });
      update();
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  // ============================================================
  // Ctrl+Enter Send: Enter で改行、Ctrl+Enter で送信
  // ============================================================
  function setupCtrlEnterSend() {
    function findSendButton(fromEl) {
      // 祖先を遡って近い順に探す:
      // 1. aria-label が「送信」または "Send" を含むボタン (メイン入力欄の送信ボタン)
      // 2. text が「保存」または "Save" の submit ボタン (編集モードの保存ボタン)
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

    window.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter' || e.isComposing) return;

        const el = e.target;
        const editable =
          (el.matches && el.matches('[contenteditable="true"], textarea')) ||
          (el.closest && el.closest('[contenteditable="true"]'));
        if (!editable) return;

        if (e.shiftKey) return; // Shift+Enter は素通り(改行)

        if (e.ctrlKey) {
          e.preventDefault();
          e.stopImmediatePropagation();
          const sendBtn = findSendButton(el);
          if (sendBtn) sendBtn.click();
        } else {
          // 素の Enter → 改行(Claudeの送信ハンドラだけ止める)
          e.stopImmediatePropagation();
        }
      },
      true
    );
  }

  // ============================================================
  // Done Beep: 出力完了時に WebAudio で 4C ベル(C E G C↑ G E C)
  // ============================================================
  function setupDoneBeep() {
    const STOP_SELECTOR =
      'button[aria-label="応答を停止"], button[aria-label="Stop Response"], button[aria-label="Stop response"]';
    const CONTINUE_WAIT = 1500; // 「続ける」が出る可能性を考慮した猶予

    let audioCtx = null;
    let stopVisible = false;
    let pendingTimer = null;

    function ensureCtx() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }

    // ブラウザの autoplay policy 対策: ユーザー操作起源で AudioContext を起こしておく。
    // (MutationObserver 経由の resume() は user gesture と認識されず無視されるため)
    ['pointerdown', 'keydown'].forEach((ev) => {
      window.addEventListener(ev, ensureCtx, { capture: true, passive: true });
    });

    // 4C: 7音アーチ (C E G C↑ G E C / Sine / 各50ms間隔)
    // 冒頭にスピーカー起こし用の極小音を200ms流してから本来のチャイムを鳴らす
    // (Bluetooth/USBスピーカーの省電力スリープ対策)
    function playBell() {
      ensureCtx();
      if (!audioCtx) return;
      const ctx = audioCtx;
      const beep = (f, t, d = 0.09, v = 0.32) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(v, ctx.currentTime + t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + d + 0.02);
      };
      const PRELUDE = 0.2; // 200msのスピーカー起こし
      beep(20, 0, PRELUDE, 0.0001); // ほぼ無音(20Hz, 振幅0.0001)
      [1047, 1319, 1568, 2093, 1568, 1319, 1047].forEach((f, i) => beep(f, PRELUDE + i * 0.05));
      console.log('[claude_tools] done beep 🔔');
    }

    function isStopPresent() {
      return !!document.querySelector(STOP_SELECTOR);
    }

    // AutoContinue と同じセレクタで「続ける」「再試行」バナーを検知
    function isContinuePresent() {
      const warning = document.querySelector('[data-testid="message-warning"]');
      if (warning && warning.querySelector('button')) return true;
      const banners = document.querySelectorAll('div[data-color-context="main"]');
      for (const b of banners) {
        if (b.querySelector('svg') && b.querySelector('button')) return true;
      }
      return false;
    }

    function isStillGenerating() {
      return isStopPresent() || isContinuePresent();
    }

    function check() {
      const visible = isStopPresent();
      if (!stopVisible && visible) {
        stopVisible = true;
        ensureCtx();
        if (pendingTimer) {
          clearTimeout(pendingTimer);
          pendingTimer = null;
        }
      } else if (stopVisible && !visible) {
        stopVisible = false;
        if (pendingTimer) clearTimeout(pendingTimer);
        // 「続ける」ボタンが続く可能性があるので少し待ってから判定
        pendingTimer = setTimeout(() => {
          pendingTimer = null;
          if (!isStillGenerating()) playBell();
          else stopVisible = isStopPresent();
        }, CONTINUE_WAIT);
      }
    }

    function start() {
      new MutationObserver(check).observe(document.body, { childList: true, subtree: true });
      setInterval(check, 500);
    }

    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', start, { once: true });
  }

  // ============================================================
  // 起動
  // ============================================================
  if (enabled.hideGDrive)    setupHideGDrive();
  if (enabled.adaptiveWidth) setupAdaptiveWidth();
  if (enabled.ctrlEnterSend) setupCtrlEnterSend();
  if (enabled.doneBeep)      setupDoneBeep();
})();
