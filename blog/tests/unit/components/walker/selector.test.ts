import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const component = readFileSync(new URL('../../../../src/components/WalkerSelector.astro', import.meta.url), 'utf8');
const source = component.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source);
const script = ts.transpile(source.replace(/^\s*import .*;$/gm, ''), { target: ts.ScriptTarget.ES2022 });

/** Runs the selector bootstrap with controllable browser state. */
function setup(savedWalker: string | null) {
	class SelectElement extends EventTarget {
		dataset: Record<string, string> = {};
		value = '';
	}

	const documentEvents = new EventTarget();
	const windowEvents = new EventTarget();
	const selector = new SelectElement();
	const storage = new Map<string, string>();
	if (savedWalker) storage.set('site-walker', savedWalker);

	const selected: string[] = [];
	windowEvents.addEventListener('walkerchange', (event) => {
		if (event instanceof CustomEvent) selected.push(event.detail);
	});

	runInNewContext(script, {
		CustomEvent,
		DEFAULT_WALKER_ID: 'default',
		HTMLSelectElement: SelectElement,
		WALKERS: [{ id: 'default' }, { id: 'saved' }],
		document: {
			querySelector: () => selector,
			addEventListener: documentEvents.addEventListener.bind(documentEvents),
		},
		localStorage: {
			getItem: (key: string) => storage.get(key) ?? null,
			setItem: (key: string, value: string) => storage.set(key, value),
		},
		window: windowEvents,
	});

	return { documentEvents, selected, selector, storage };
}

test('binds on a normal page load and applies walker changes once', () => {
	const page = setup('saved');
	assert.equal(page.selector.value, 'saved');

	page.documentEvents.dispatchEvent(new Event('astro:page-load'));
	page.selector.value = 'default';
	page.selector.dispatchEvent(new Event('change'));

	assert.equal(page.storage.get('site-walker'), 'default');
	assert.deepEqual(page.selected, ['default']);
});
