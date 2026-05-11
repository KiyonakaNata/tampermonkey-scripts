// ==UserScript==
// @name         Claude.ai - Auto Continue
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  「続ける」「再試行」ボタンを自動クリック（個別ON/OFF対応）
// @match        https://claude.ai/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_auto_continue.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_auto_continue.user.js
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    pollInterval: 10000,
    clickDelay: 1000,
    debounceMs: 3000,
    maxAutoClicks: 20,
    maxRetries: 3,
    enabled: true,

    // --- 個別フラグ ---
    autoContinue: true,   // 「続ける」を自動クリック
    autoRetry: false,     // 「再試行」を自動クリック
  };

  // テキスト → カテゴリのマッピング
  const BUTTON_MAP = {
    '続ける': 'continue',
    'Continue': 'continue',
    'Continue generation': 'continue',
    '再試行': 'retry',
    'Retry': 'retry',
  };

  let clickCount = 0;
  let retryCount = 0;
  let lastMessageId = null;
  let debounceTimer = null;
  let pollTimer = null;
  let isTabVisible = !document.hidden;

  function log(msg) {
    console.log(`[AutoContinue] ${msg}`);
  }

  // フラグチェック
  function isTargetEnabled(category) {
    if (category === 'continue') return CONFIG.autoContinue;
    if (category === 'retry') return CONFIG.autoRetry;
    return false;
  }

  // ============================
  // ボタン検索
  // ============================
  function findTargetButton() {
    // 1. message-warning 内
    const warning = document.querySelector('[data-testid="message-warning"]');
    if (warning) {
      const btn = warning.querySelector('button');
      if (btn) {
        const text = btn.textContent.trim();
        const cat = BUTTON_MAP[text];
        if (cat && isTargetEnabled(cat)) {
          log(`ボタン発見 [message-warning]: "${text}"`);
          return btn;
        }
      }
    }

    // 2. data-color-context="main" の警告バナー内
    const banners = document.querySelectorAll('div[data-color-context="main"]');
    for (const banner of banners) {
      if (!banner.querySelector('svg')) continue;
      const btn = banner.querySelector('button');
      if (btn) {
        const text = btn.textContent.trim();
        const cat = BUTTON_MAP[text];
        if (cat && isTargetEnabled(cat)) {
          log(`ボタン発見 [banner]: "${text}"`);
          return btn;
        }
      }
    }

    return null;
  }

  // ============================
  // クリック戦略（3段階）
  // ============================
  function strategy1_reactFiber(el) {
    const fiberKey = Object.keys(el).find(
      k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return false;

    let fiber = el[fiberKey];
    for (let i = 0; i < 20 && fiber; i++) {
      const props = fiber.memoizedProps || fiber.pendingProps;
      if (props && typeof props.onClick === 'function') {
        log('戦略1: React Fiber onClick 直接呼び出し');
        props.onClick({ preventDefault() {}, stopPropagation() {} });
        return true;
      }
      fiber = fiber.return;
    }
    return false;
  }

  function strategy2_keyboard(el) {
    log('戦略2: focus + Enter キー');
    el.focus();
    const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true };
    el.dispatchEvent(new KeyboardEvent('keydown', opts));
    el.dispatchEvent(new KeyboardEvent('keypress', opts));
    el.dispatchEvent(new KeyboardEvent('keyup', opts));
    return true;
  }

  function strategy3_nativeEvents(el) {
    log('戦略3: ネイティブ pointer/mouse イベント');
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = {
      bubbles: true, cancelable: true, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y,
    };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    return true;
  }

  const strategies = [strategy1_reactFiber, strategy2_keyboard, strategy3_nativeEvents];

  // ============================
  // メッセージID
  // ============================
  function getCurrentMessageId() {
    const msgs = document.querySelectorAll('[data-testid*="message"]');
    return msgs.length ? msgs[msgs.length - 1].getAttribute('data-testid') : null;
  }

  // ============================
  // メイン処理
  // ============================
  function check() {
    if (!CONFIG.enabled) return;

    const currentId = getCurrentMessageId();
    if (currentId !== lastMessageId) {
      lastMessageId = currentId;
      clickCount = 0;
      retryCount = 0;
    }

    if (clickCount >= CONFIG.maxAutoClicks) return;

    const btn = findTargetButton();
    if (!btn) {
      retryCount = 0;
      return;
    }

    if (retryCount >= strategies.length) {
      log(`全${strategies.length}戦略が失敗 → スキップ`);
      return;
    }

    const btnText = btn.textContent.trim();
    log(`「${btnText}」→ ${CONFIG.clickDelay}ms 後に戦略${retryCount + 1}を実行`);
    const currentRetry = retryCount;

    setTimeout(() => {
      const freshBtn = findTargetButton();
      if (!freshBtn) {
        clickCount++;
        retryCount = 0;
        log(`✔ ボタン自然消滅（通算${clickCount}回）`);
        return;
      }

      strategies[currentRetry](freshBtn);
      retryCount++;

      setTimeout(() => {
        if (!findTargetButton()) {
          clickCount++;
          retryCount = 0;
          log(`✔ クリック成功（通算${clickCount}回）`);
        } else {
          log(`戦略${currentRetry + 1} 失敗、次回は戦略${currentRetry + 2}を試行`);
        }
      }, 2000);
    }, CONFIG.clickDelay);
  }

  // --- デバウンス ---
  function debouncedCheck() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(check, CONFIG.debounceMs);
  }

  // --- MutationObserver ---
  const observer = new MutationObserver(() => debouncedCheck());
  observer.observe(document.body, { childList: true, subtree: true });

  // --- ポーリング ---
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(check, CONFIG.pollInterval);
  }
  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    if (isTabVisible) {
      log('タブがアクティブに → ポーリング再開');
      startPolling();
      check();
    } else {
      log('タブがバックグラウンドに → ポーリング停止（Observer継続）');
      stopPolling();
    }
  });

  if (isTabVisible) startPolling();
  log(`v7 起動 ✔（続ける:${CONFIG.autoContinue} / 再試行:${CONFIG.autoRetry}）`);

  // ============================================================
  // コンソール操作リファレンス（F12 → Console から実行）
  // ============================================================
  // claudeAutoContinue.enable()          … スクリプト全体を有効化
  // claudeAutoContinue.disable()         … スクリプト全体を無効化
  // claudeAutoContinue.reset()           … クリックカウンタをリセット
  // claudeAutoContinue.setContinue(true) … 「続ける」の自動クリックを ON
  // claudeAutoContinue.setContinue(false)… 「続ける」の自動クリックを OFF
  // claudeAutoContinue.setRetry(true)    … 「再試行」の自動クリックを ON
  // claudeAutoContinue.setRetry(false)   … 「再試行」の自動クリックを OFF
  // claudeAutoContinue.status()          … 現在の設定・状態を一覧表示
  // ============================================================
  window.claudeAutoContinue = {
    enable()  { CONFIG.enabled = true;  log('有効化'); },
    disable() { CONFIG.enabled = false; log('無効化'); },
    reset()   { clickCount = 0; retryCount = 0; log('カウンタリセット'); },
    setContinue(v) { CONFIG.autoContinue = !!v; log(`続ける: ${CONFIG.autoContinue}`); },
    setRetry(v)    { CONFIG.autoRetry = !!v;    log(`再試行: ${CONFIG.autoRetry}`); },
    status()  { console.table({ ...CONFIG, clickCount, retryCount, isTabVisible }); },
  };
})();