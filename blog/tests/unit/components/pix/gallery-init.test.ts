import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const component = readFileSync(new URL('../../../../src/components/pix/PixGallery.astro', import.meta.url), 'utf8');
const source = component.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source);
const script = ts.transpile(source.replace(/import .* from .*;/, ''), { target: ts.ScriptTarget.ES2022 });

/** Runs the component bootstrap with controllable navigation and gallery elements. */
function setup(initialGallery: object | null = {}) {
	const events = new EventTarget();
	let gallery = initialGallery;
	const initialized: object[] = [];
	runInNewContext(script, {
		document: {
			querySelector: () => gallery,
			addEventListener: events.addEventListener.bind(events),
		},
		initPixGallery: (element: object) => initialized.push(element),
	});
	return {
		initialized,
		navigate(nextGallery: object | null = gallery) {
			gallery = nextGallery;
			events.dispatchEvent(new Event('astro:page-load'));
		},
	};
}

test('initializes the gallery on a full-page load without a router event', () => {
	const gallery = {};
	assert.deepEqual(setup(gallery).initialized, [gallery]);
});

test('avoids duplicate handlers but initializes a new gallery after navigation', () => {
	const first = {};
	const second = {};
	const page = setup(first);
	page.navigate();
	assert.deepEqual(page.initialized, [first]);
	page.navigate(second);
	assert.deepEqual(page.initialized, [first, second]);
});

test('skips pages without a gallery', () => {
	const page = setup(null);
	page.navigate();
	assert.deepEqual(page.initialized, []);
});
