import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const componentPath = new URL('../../../src/components/Background.astro', import.meta.url);
const stylesheetPath = new URL('../../../src/styles/base/site-shell.css', import.meta.url);

test('keeps the hanging-out foreground decoration across page navigations', () => {
	const component = readFileSync(componentPath, 'utf8');

	assert.match(component, /transition:persist="site-foreground-hangingout"/);
	assert.match(component, /src="\/images\/hangingout\.png"/);
});

test('uses the blurred Summer Pockets image as the site background', () => {
	const stylesheet = readFileSync(stylesheetPath, 'utf8');

	assert.match(stylesheet, /\.site-background::before[^}]*summer_pockets\.png[^}]*filter: blur\(0\.4rem\)/);
});

test('places the hanging-out decoration at the top centre-right foreground', () => {
	const stylesheet = readFileSync(stylesheetPath, 'utf8');

	assert.match(stylesheet, /\.site-foreground__hangingout[^}]*z-index: 2; top: 0; left: 60%;[^}]*pointer-events: none; transform: translateX\(-50%\)/);
});
