import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const head = readFileSync(new URL('../../../src/components/layout/BaseHead.astro', import.meta.url), 'utf8');
const script = head.match(/<script is:inline id="initial-page-reveal">([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);

/** Runs the early head script with controllable readiness and timeout events. */
function setup(matches = true) {
	const classes = new Set<string>();
	const events = new EventTarget();
	const documentEvents = new EventTarget();
	let timeout: (() => void) | undefined;
	runInNewContext(script!, {
		document: {
			documentElement: { classList: {
				add(value: string) { classes.add(value); },
				remove(...values: string[]) { values.forEach((value) => classes.delete(value)); },
				replace(before: string, after: string) {
					if (classes.delete(before)) classes.add(after);
				},
			} },
			addEventListener: documentEvents.addEventListener.bind(documentEvents),
			removeEventListener: documentEvents.removeEventListener.bind(documentEvents),
		},
		window: {
			matchMedia: () => ({ matches }),
			setTimeout(callback: () => void, delay: number) {
				assert.equal(delay, 5000);
				timeout = callback;
				return 1;
			},
			clearTimeout() { timeout = undefined; },
			addEventListener: events.addEventListener.bind(events),
			removeEventListener: events.removeEventListener.bind(events),
		},
	});
	return { classes, events, documentEvents, getTimeout: () => timeout };
}

test('reveals the page when the pendulum settles and cancels the timeout', () => {
	const page = setup();
	assert.ok(page.classes.has('page-loading'));
	page.events.dispatchEvent(new Event('nanami-pendulum-ready'));
	assert.deepEqual([...page.classes], ['page-entering']);
	assert.equal(page.getTimeout(), undefined);
});

test('reveals the page if the animation never signals readiness', () => {
	const page = setup();
	page.getTimeout()!();
	assert.deepEqual([...page.classes], ['page-entering']);
	page.events.dispatchEvent(new Event('nanami-pendulum-ready'));
	assert.deepEqual([...page.classes], ['page-entering']);
});

test('skips waiting when the desktop motion query does not match', () => {
	const page = setup(false);
	assert.equal(page.classes.size, 0);
	assert.equal(page.getTimeout(), undefined);
});

test('a client-side swap settles the pending reveal without touching the next page', () => {
	const page = setup();
	assert.ok(page.classes.has('page-loading'));
	page.documentEvents.dispatchEvent(new Event('astro:before-swap'));
	assert.equal(page.classes.size, 0);
	assert.equal(page.getTimeout(), undefined);
	// Readiness arriving after the swap must not replay the reveal.
	page.events.dispatchEvent(new Event('nanami-pendulum-ready'));
	assert.equal(page.classes.size, 0);
});
