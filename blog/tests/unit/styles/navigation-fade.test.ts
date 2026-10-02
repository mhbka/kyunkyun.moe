import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const stylesheetPath = new URL('../../../src/styles/base/site-shell.css', import.meta.url);

test('keeps page transition properties after navigation fading ends', () => {
	const stylesheet = readFileSync(stylesheetPath, 'utf8');

	assert.match(stylesheet, /\.page-content,[\s\S]*?transition: opacity 750ms ease-out/);
	assert.match(stylesheet, /@keyframes navigation-page-fade-in\s*\{\s*from \{ opacity: 0; \}/);
	assert.doesNotMatch(
		stylesheet,
		/html\.is-navigating \.page-content,[\s\S]*?transition: opacity 750ms ease-out/,
	);
});
