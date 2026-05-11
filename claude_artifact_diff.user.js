// ==UserScript==
// @name         Claude.ai - Artifact Diff Viewer
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  アーティファクト更新時に前バージョンとのDiffをブラウザ内で表示（外部依存なし）
// @match        https://claude.ai/*
// @grant        GM_addStyle
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_artifact_diff.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_artifact_diff.user.js
// ==/UserScript==

(function () {
  'use strict';

  console.log('[ArtifactDiff] v0.5 起動');

  // ── Simple line diff (no external lib) ──
  function diffLines(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // LCS-based diff
    const m = oldLines.length;
    const n = newLines.length;

    // For very large files, fall back to simple comparison
    if (m * n > 2000000) {
      return simpleDiff(oldLines, newLines);
    }

    // Build LCS table
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to get diff
    const result = [];
    let i = m, j = n;
    const stack = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        stack.push({ type: 'context', text: oldLines[i - 1] });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        stack.push({ type: 'added', text: newLines[j - 1] });
        j--;
      } else {
        stack.push({ type: 'removed', text: oldLines[i - 1] });
        i--;
      }
    }

    stack.reverse();

    // Merge consecutive same-type entries
    const merged = [];
    for (const entry of stack) {
      const last = merged.length > 0 ? merged[merged.length - 1] : null;
      if (last && last.type === entry.type) {
        last.lines.push(entry.text);
      } else {
        merged.push({ type: entry.type, lines: [entry.text] });
      }
    }

    return merged;
  }

  function simpleDiff(oldLines, newLines) {
    // Fallback for huge files: just show removed then added
    return [
      { type: 'removed', lines: oldLines },
      { type: 'added', lines: newLines }
    ];
  }

  // ── CSS ──
  GM_addStyle(`
    #diff-btn {
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 99999;
      background: hsl(0 0% 15%);
      color: #eee;
      border: 1px solid hsl(0 0% 30%);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,.3);
      display: none;
      font-family: system-ui, sans-serif;
    }
    #diff-btn:hover { background: hsl(0 0% 25%); }
    #diff-btn.has-diff { display: block; }

    #diff-panel-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 100000;
      display: none;
    }
    #diff-panel-overlay.open { display: flex; align-items: center; justify-content: center; }

    #diff-panel {
      background: hsl(0 0% 10%);
      color: #ddd;
      border-radius: 12px;
      width: 85vw;
      max-width: 1000px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,.5);
      font-family: system-ui, sans-serif;
    }
    #diff-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid hsl(0 0% 20%);
    }
    #diff-panel-header h3 { margin: 0; font-size: 14px; font-weight: 600; }
    #diff-panel-close {
      background: none; border: none; color: #aaa; font-size: 20px;
      cursor: pointer; padding: 0 4px; line-height: 1;
    }
    #diff-panel-close:hover { color: #fff; }

    #diff-panel-body {
      overflow: auto;
      padding: 16px;
      font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
      font-size: 12.5px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .diff-added {
      background: rgba(46, 160, 67, .2);
      color: #7ee787;
    }
    .diff-removed {
      background: rgba(248, 81, 73, .2);
      color: #ffa198;
      text-decoration: line-through;
    }
    .diff-context { color: #8b949e; }
    .diff-line {
      display: flex;
    }
    .diff-linenum {
      display: inline-block;
      min-width: 4ch;
      text-align: right;
      padding-right: 1.2ch;
      color: #484f58;
      user-select: none;
      flex-shrink: 0;
    }
    .diff-added .diff-linenum { color: #3d6e42; }
    .diff-removed .diff-linenum { color: #6e3b3b; }
    .diff-linecontent { flex: 1; min-width: 0; }
    .diff-collapsed {
      color: #6e7681;
      font-style: italic;
      display: block;
      padding: 2px 0;
    }

    #diff-version-info {
      padding: 8px 16px;
      border-top: 1px solid hsl(0 0% 20%);
      font-size: 11px;
      color: #8b949e;
      display: flex;
      justify-content: space-between;
    }

    #diff-debug {
      position: fixed;
      bottom: 120px;
      right: 20px;
      z-index: 99999;
      background: hsl(0 0% 10%);
      color: #7ee787;
      border: 1px solid hsl(0 0% 25%);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-family: monospace;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s;
    }
    #diff-debug.show { opacity: 1; }
  `);

  // ── State ──
  const MAX_HISTORY_PER_FILE = 5;
  const POLL_INTERVAL = 2000;
  const STABLE_THRESHOLD = 4000;

  let fileHistory = {};
  let lastSeenText = null;
  let lastSeenName = null;
  let lastChangeTime = 0;
  let snapshotPending = false;

  // ── UI ──
  const btn = document.createElement('button');
  btn.id = 'diff-btn';
  btn.textContent = 'Diff';
  document.body.appendChild(btn);

  const debugEl = document.createElement('div');
  debugEl.id = 'diff-debug';
  document.body.appendChild(debugEl);

  const overlay = document.createElement('div');
  overlay.id = 'diff-panel-overlay';
  overlay.innerHTML = `
    <div id="diff-panel">
      <div id="diff-panel-header">
        <h3>Artifact Diff</h3>
        <button id="diff-panel-close">&times;</button>
      </div>
      <div id="diff-panel-body"></div>
      <div id="diff-version-info">
        <span id="diff-info-old"></span>
        <span id="diff-info-new"></span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('diff-panel-close').addEventListener('click', () => {
    overlay.classList.remove('open');
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
  btn.addEventListener('click', showDiff);

  // ── Debug flash ──
  let debugTimer = null;
  function flashDebug(msg) {
    console.log('[ArtifactDiff]', msg);
    debugEl.textContent = msg;
    debugEl.classList.add('show');
    clearTimeout(debugTimer);
    debugTimer = setTimeout(() => debugEl.classList.remove('show'), 3000);
  }

  // ── Get current artifact filename ──
  function getArtifactName() {
    const contentEl = document.getElementById('wiggle-file-content');
    if (!contentEl) return null;

    const panel = contentEl.closest('[aria-hidden]');
    if (panel) {
      const h2 = panel.querySelector('h2');
      if (h2) {
        const titleText = h2.textContent.trim();
        return titleText.replace(/\s*·\s*\w+$/, '').trim();
      }
    }
    return '_unknown_';
  }

  // ── Artifact text extraction ──
  function getArtifactText() {
    const el = document.getElementById('wiggle-file-content');
    if (!el) return null;
    return el.innerText;
  }

  // ── Snapshot logic ──
  function takeSnapshot(name, text) {
    if (!name || !text || text.trim().length === 0) return;

    if (!fileHistory[name]) {
      fileHistory[name] = [];
    }

    const versions = fileHistory[name];
    const last = versions.length > 0 ? versions[versions.length - 1] : null;
    if (last && last.text === text) return;

    versions.push({
      text,
      timestamp: new Date().toLocaleTimeString('ja-JP')
    });

    if (versions.length > MAX_HISTORY_PER_FILE) {
      versions.shift();
    }

    flashDebug(`snapshot: ${name} (v${versions.length})`);
    updateButton();
  }

  // ── Button visibility ──
  function updateButton() {
    const name = getArtifactName();
    if (!name) {
      btn.classList.remove('has-diff');
      return;
    }
    const versions = fileHistory[name];
    if (versions && versions.length >= 2) {
      btn.classList.add('has-diff');
      btn.textContent = `Diff (${name})`;
    } else {
      btn.classList.remove('has-diff');
    }
  }

  // ── Polling loop ──
  setInterval(() => {
    const text = getArtifactText();
    const name = getArtifactName();

    if (!text || !name) {
      lastSeenText = null;
      lastSeenName = null;
      snapshotPending = false;
      updateButton();
      return;
    }

    // File switched
    if (name !== lastSeenName) {
      if (snapshotPending && lastSeenName && lastSeenText) {
        takeSnapshot(lastSeenName, lastSeenText);
      }
      lastSeenName = name;
      lastSeenText = text;
      snapshotPending = false;
      takeSnapshot(name, text);
      updateButton();
      return;
    }

    // Text changed
    if (text !== lastSeenText) {
      lastSeenText = text;
      lastChangeTime = Date.now();
      snapshotPending = true;
      return;
    }

    // Stable
    if (snapshotPending && (Date.now() - lastChangeTime) >= STABLE_THRESHOLD) {
      snapshotPending = false;
      takeSnapshot(name, text);
    }

  }, POLL_INTERVAL);

  // ── Diff display ──
  function showDiff() {
    const name = getArtifactName();
    if (!name) return;

    const versions = fileHistory[name];
    if (!versions || versions.length < 2) return;

    const oldVer = versions[versions.length - 2];
    const newVer = versions[versions.length - 1];

    const diff = diffLines(oldVer.text, newVer.text);
    const body = document.getElementById('diff-panel-body');
    body.innerHTML = '';

    const title = document.querySelector('#diff-panel-header h3');
    title.textContent = `Diff: ${name}`;

    // Track line numbers: old (removed/context) and new (added/context)
    let oldLineNum = 1;
    let newLineNum = 1;

    function makeLine(cls, leftNum, rightNum, text) {
      const div = document.createElement('div');
      div.className = `diff-line ${cls}`;

      const numSpan = document.createElement('span');
      numSpan.className = 'diff-linenum';
      const left = leftNum != null ? String(leftNum) : '';
      const right = rightNum != null ? String(rightNum) : '';
      numSpan.textContent = left ? `${left}` : `  +${right}`;
      if (left && right && left !== right) {
        numSpan.textContent = `${left}→${right}`;
      } else if (left && right) {
        numSpan.textContent = `${left}`;
      }

      const contentSpan = document.createElement('span');
      contentSpan.className = 'diff-linecontent';
      contentSpan.textContent = text;

      div.appendChild(numSpan);
      div.appendChild(contentSpan);
      return div;
    }

    const CONTEXT_LINES = 5;

    diff.forEach(part => {
      if (part.type === 'removed') {
        part.lines.forEach(line => {
          body.appendChild(makeLine('diff-removed', oldLineNum, null, line));
          oldLineNum++;
        });
      } else if (part.type === 'added') {
        part.lines.forEach(line => {
          body.appendChild(makeLine('diff-added', null, newLineNum, line));
          newLineNum++;
        });
      } else {
        // Context: collapse if too long
        const lines = part.lines;
        const threshold = CONTEXT_LINES * 2 + 2;

        if (lines.length > threshold) {
          // Show first N
          lines.slice(0, CONTEXT_LINES).forEach(line => {
            body.appendChild(makeLine('diff-context', oldLineNum, newLineNum, line));
            oldLineNum++; newLineNum++;
          });

          // Collapsed indicator
          const skipped = lines.length - CONTEXT_LINES * 2;
          const collapseDiv = document.createElement('div');
          collapseDiv.className = 'diff-collapsed';
          collapseDiv.textContent = `  ··· ${skipped} lines unchanged ···`;
          body.appendChild(collapseDiv);
          oldLineNum += skipped;
          newLineNum += skipped;

          // Show last N
          lines.slice(-CONTEXT_LINES).forEach(line => {
            body.appendChild(makeLine('diff-context', oldLineNum, newLineNum, line));
            oldLineNum++; newLineNum++;
          });
        } else {
          lines.forEach(line => {
            body.appendChild(makeLine('diff-context', oldLineNum, newLineNum, line));
            oldLineNum++; newLineNum++;
          });
        }
      }
    });

    document.getElementById('diff-info-old').textContent = `前: ${oldVer.timestamp}`;
    document.getElementById('diff-info-new').textContent = `後: ${newVer.timestamp}`;

    overlay.classList.add('open');
  }

  // ── Keyboard shortcut ──
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (overlay.classList.contains('open')) {
        overlay.classList.remove('open');
      } else {
        showDiff();
      }
    }
  });

  // Initial snapshot after page load
  setTimeout(() => {
    const text = getArtifactText();
    const name = getArtifactName();
    if (text && name) {
      takeSnapshot(name, text);
      flashDebug(`init: ${name}`);
    }
  }, 3000);

})();