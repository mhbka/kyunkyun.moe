import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const componentPath = new URL('../../../src/components/Background.astro', import.meta.url);
const stylesheetPath = new URL('../../../src/styles/base/site-shell.css', import.meta.url);

test('keeps the Miku Onion background layer across page navigations', () => {
	const component = readFileSync(componentPath, 'utf8');

	assert.match(component, /transition:persist="site-background"/);
	assert.match(component, /src="\/images\/mikuonion\.gif"/);
});

test('sizes the Miku Onion decoration larger and beyond the lower-right viewport edge', () => {
	const stylesheet = readFileSync(stylesheetPath, 'utf8');

	assert.match(stylesheet, /right: -12rem; bottom: -2rem;[^}]*width: min\(45rem, 63vw\)/);
	assert.match(stylesheet, /@media \(max-width: 800px\)[\s\S]*?\.site-background__mikuonion \{ display: none; \}/);
});
