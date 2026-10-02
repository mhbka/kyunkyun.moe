import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const componentPath = new URL('../../../src/components/PageLayout.astro', import.meta.url);

test('animates the changing page shell into view after a navigation', () => {
	const component = readFileSync(componentPath, 'utf8');

	assert.match(component, /new: \{ name: 'navigation-page-fade-in', duration: '750ms'/);
	assert.match(component, /class="page-content" transition:animate=\{pageTransition\}/);
	assert.match(component, /site-sidebar-right" aria-label="page navigation" transition:animate=\{pageTransition\}/);
	assert.match(component, /site-header-persist" transition:name="site-header" transition:persist="site-header"/);
	assert.doesNotMatch(component, /class="site-layout" transition:animate=/);
});
