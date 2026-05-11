// ==UserScript==
// @name         Claude.ai - Adaptive Width
// @namespace    https://github.com/KiyonakaNata/tampermonkey-scripts
// @author       KiyonakaNata
// @version      1.0
// @description  アーティファクト非表示時のみチャット幅を拡張
// @match        https://claude.ai/*
// @grant        GM_addStyle
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_adaptive_width.user.js
// @downloadURL  https://raw.githubusercontent.com/KiyonakaNata/tampermonkey-scripts/main/claude_adaptive_width.user.js
// ==/UserScript==

(function () {
	'use strict';

	const WIDE_WIDTH = '960px';

	const styleEl = document.createElement('style');
	styleEl.id = 'claude-adaptive-width';
	document.head.appendChild(styleEl);

	function updateWidth() {
		const hasArtifact = document.getElementById('wiggle-file-content');

		if (!hasArtifact) {
			styleEl.textContent = `
                .max-w-3xl {
                    max-width: ${WIDE_WIDTH} !important;
                }
            `;
		} else {
			styleEl.textContent = '';
		}
	}

	const observer = new MutationObserver(() => {
		requestAnimationFrame(updateWidth);
	});

	observer.observe(document.body, {
		childList: true,
		subtree: true
	});

	updateWidth();
})();