import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../../../src/components/BaseHead.astro', import.meta.url), 'utf8');
const script = source.match(/<script is:inline>([\s\S]*?)<\/script>/)![1];

/** Exercises the actual untranspiled inline guard with a dirty editor. */
function setup(accept = false) {
	const editor = { dataset: { dirty: 'true' } };
	let prompts = 0;
	let click: (event: object) => void;
	const location = new URL('https://example.test/posts/edit/1');
	class Element {
		href = 'https://example.test/blog';
		target = '';
		closest() { return this; }
		hasAttribute() { return false; }
	}
	runInNewContext(script, {
		URL, Element, HTMLElement: class HTMLElement {},
		document: {
			querySelector: () => editor.dataset.dirty === 'true' ? editor : null,
			addEventListener: (_name: string, listener: typeof click) => { click = listener; },
		},
		window: { location, addEventListener() {}, confirm() { prompts++; return accept; } },
	});
	return {
		editor, getPrompts: () => prompts,
		click(href?: string, modifiers: object = {}) {
			const target = new Element();
			if (href) target.href = href;
			let prevented = false;
			click({ target, button: 0, preventDefault() { prevented = true; }, ...modifiers });
			return prevented;
		},
	};
}

test('cancelling navigation preserves unsaved work', () => {
	const page = setup();
	assert.equal(page.click(), true);
	assert.equal(page.getPrompts(), 1);
	assert.equal(page.editor.dataset.dirty, 'true');
});

test('confirming navigation suppresses a second unload warning', () => {
	const page = setup(true);
	assert.equal(page.click(), false);
	assert.equal(page.editor.dataset.dirty, 'false');
});

test('ignores same-page anchors and modified clicks', () => {
	const page = setup();
	assert.equal(page.click('https://example.test/posts/edit/1#heading'), false);
	assert.equal(page.click(undefined, { ctrlKey: true }), false);
	assert.equal(page.getPrompts(), 0);
});
