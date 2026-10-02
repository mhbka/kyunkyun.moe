import assert from 'node:assert/strict';
import test from 'node:test';

import { bindNavigationFade, NAVIGATION_FADE_CLASS } from '../../../src/scripts/navigation-fade.ts';

class FakeDocument {
	listeners = new Map<string, Array<() => void>>();

	// Registers handlers so navigation lifecycle events can be replayed in tests.
	addEventListener(eventName: string, listener: () => void) {
		const listeners = this.listeners.get(eventName) ?? [];
		listeners.push(listener);
		this.listeners.set(eventName, listeners);
	}

	// Dispatches a lifecycle event to its registered handlers.
	dispatch(eventName: string) {
		for (const listener of this.listeners.get(eventName) ?? []) listener();
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
