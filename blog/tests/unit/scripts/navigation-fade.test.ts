import assert from 'node:assert/strict';
import test from 'node:test';

import { bindNavigationFade, NAVIGATION_FADE_CLASS } from '../../../src/scripts/navigation-fade.ts';

class FakeDocument {
	listeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();

	// Registers handlers so navigation lifecycle events can be replayed in tests.
	addEventListener(eventName: string, listener: (event: Record<string, unknown>) => void) {
		const listeners = this.listeners.get(eventName) ?? [];
		listeners.push(listener);
		this.listeners.set(eventName, listeners);
	}

	// Dispatches a lifecycle event to its registered handlers.
	dispatch(eventName: string, event: Record<string, unknown> = {}) {
		for (const listener of this.listeners.get(eventName) ?? []) listener(event);
	}
}

class FakeRoot {
	classes = new Set<string>();

	classList = {
		add: (className: string) => this.classes.add(className),
		remove: (className: string) => this.classes.delete(className),
	};
}

test('starts fading before the next page is prepared', () => {
	const documentRef = new FakeDocument();
	const root = new FakeRoot();
	bindNavigationFade(documentRef, root);

	documentRef.dispatch('astro:before-preparation');

	assert.equal(root.classes.has(NAVIGATION_FADE_CLASS), true);
});

test('waits for the outgoing fade while the next page loads', async () => {
	const documentRef = new FakeDocument();
	const root = new FakeRoot();
	let finishFade: () => void = () => {};
	const fadeFinished = new Promise<void>((resolve) => {
		finishFade = resolve;
	});
	let loaderRan = false;
	const event = {
		loader: async () => {
			loaderRan = true;
		},
	};

	bindNavigationFade(documentRef, root, () => fadeFinished);
	documentRef.dispatch('astro:before-preparation', event);
	const preparation = event.loader();
	await Promise.resolve();

	assert.equal(loaderRan, true);
	assert.equal(root.classes.has(NAVIGATION_FADE_CLASS), true);

	finishFade();
	await preparation;
});

test('clears the fade when the new page swaps or loads', () => {
	const documentRef = new FakeDocument();
	const root = new FakeRoot();
	bindNavigationFade(documentRef, root);

	documentRef.dispatch('astro:before-preparation');
	documentRef.dispatch('astro:before-swap');
	assert.equal(root.classes.has(NAVIGATION_FADE_CLASS), false);

	documentRef.dispatch('astro:before-preparation');
	documentRef.dispatch('astro:page-load');
	assert.equal(root.classes.has(NAVIGATION_FADE_CLASS), false);
});
