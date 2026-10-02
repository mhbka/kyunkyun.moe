import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const globalStylesPath = new URL('../../../src/styles/global.css', import.meta.url);
const tokenStylesPath = new URL('../../../src/styles/base_tokens.css', import.meta.url);
const baseHeadPath = new URL('../../../src/components/BaseHead.astro', import.meta.url);
const headerPath = new URL('../../../src/components/Header.astro', import.meta.url);
const postEditorPath = new URL('../../../src/components/editor/PostEditor.astro', import.meta.url);
const themeSelectorPath = new URL('../../../src/components/ThemeSelector.astro', import.meta.url);

// Keeps the site on one shared token entry point rather than a selectable theme system.
test('loads shared base tokens without theme imports', () => {
	const globalStyles = readFileSync(globalStylesPath, 'utf8');
	const tokenStyles = readFileSync(tokenStylesPath, 'utf8');

	assert.match(globalStyles, /@import '\.\/base_tokens\.css';/);
	assert.doesNotMatch(globalStyles, /themes/);
	assert.match(tokenStyles, /:root\s*\{/);
	assert.match(tokenStyles, /--color-accent:/);
	assert.match(tokenStyles, /--color-overlay-surface:/);
});

// Prevents the removed client-side theme picker and stored preference from returning.
test('does not ship selectable theme controls or persistence', () => {
	const baseHead = readFileSync(baseHeadPath, 'utf8');
	const header = readFileSync(headerPath, 'utf8');
	const postEditor = readFileSync(postEditorPath, 'utf8');

	assert.equal(existsSync(themeSelectorPath), false);
	assert.doesNotMatch(baseHead, /site-theme|data-theme|localStorage/);
	assert.doesNotMatch(header, /ThemeSelector/);
	assert.doesNotMatch(postEditor, /theme\/nord\.css/);
});
