import assert from 'node:assert/strict';
import test from 'node:test';
import { createClickFeedback, findFeedbackTarget, resolveSoundName } from '../../../src/scripts/handlers/click-feedback.ts';

/** Minimal fake DOM covering the selectors the feedback module matches against. */
class FakeElement {
	tag: string;
	attrs: Record<string, string>;
	parent: FakeElement | null = null;
	children: FakeElement[] = [];

	constructor(tag: string, attrs: Record<string, string> = {}) {
		this.tag = tag;
		this.attrs = attrs;
	}

	append(child: FakeElement) {
		child.parent = this;
		this.children.push(child);
		return child;
	}

	matches(selector: string): boolean {
		return selector.split(',').some((part) => {
			const simple = part.trim();
			if (simple.startsWith('.')) return (this.attrs.class ?? '').split(' ').includes(simple.slice(1));
			const attr = simple.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);
			if (attr) {
				const value = this.attrs[attr[1]];
				return value !== undefined && (attr[2] === undefined || value === attr[2]);
			}
			return this.tag === simple;
		});
	}

	closest(selector: string): FakeElement | null {
		let node: FakeElement | null = this;
		while (node) {
			if (node.matches(selector)) return node;
			node = node.parent;
		}
		return null;
	}

	getAttribute(name: string): string | null {
		return this.attrs[name] ?? null;
	}

	querySelector(selector: string): FakeElement | null {
		for (const child of this.children) {
			if (child.matches(selector)) return child;
			const match = child.querySelector(selector);
			if (match) return match;
		}
		return null;
	}

	contains(other: FakeElement): boolean {
		let node: FakeElement | null = other;
		while (node) {
			if (node === this) return true;
			node = node.parent;
		}
		return false;
	}
}

class FakeButtonElement extends FakeElement {
	disabled = false;
}

const g = globalThis as Record<string, unknown>;
g.Element = FakeElement;
g.HTMLButtonElement = FakeButtonElement;

function asElement(fake: FakeElement): Element {
	return fake as unknown as Element;
}

function setup(muted = false) {
	g.localStorage = { getItem: () => (muted ? 'true' : null) };
	const played: string[] = [];
	const effects: Element[] = [];
	const handler = createClickFeedback({
		playSound: (sound) => played.push(sound.src),
		playEffect: (element) => effects.push(element),
	});
	const click = (target: FakeElement, event: Record<string, unknown> = {}) =>
		handler({ target: asElement(target), button: 0, defaultPrevented: false, ...event } as unknown as MouseEvent);
	return { played, effects, click };
}

test('clicking inside a button feeds back on the button', () => {
	const { played, effects, click } = setup();
	const button = new FakeElement('button');
	const label = button.append(new FakeElement('span'));
	click(label);
	assert.equal(findFeedbackTarget(asElement(label)), asElement(button));
	assert.deepEqual(played, ['/sfx/confirm_soft.wav']);
	assert.deepEqual(effects, [asElement(button)]);
});

test('plain prose links and non-interactive targets stay silent', () => {
	const { played, effects, click } = setup();
	const article = new FakeElement('article');
	const link = article.append(new FakeElement('a', { href: '/blog' }));
	const text = article.append(new FakeElement('p'));
	click(link);
	click(text);
	assert.equal(findFeedbackTarget(asElement(link)), null);
	assert.deepEqual(played, []);
	assert.deepEqual(effects, []);
});

test('data-sfx opts a subtree out or picks a sound', () => {
	const { played, click } = setup();
	const off = new FakeElement('div', { 'data-sfx': 'none' });
	const silenced = off.append(new FakeElement('button'));
	click(silenced);
	assert.equal(findFeedbackTarget(asElement(silenced)), null);
	assert.deepEqual(played, []);

	const custom = new FakeElement('div', { 'data-sfx': 'confirm' });
	click(custom);
	assert.equal(resolveSoundName(asElement(custom)), 'confirm');
	assert.deepEqual(played, ['/sfx/confirm_soft.wav']);

	const unknown = new FakeElement('div', { 'data-sfx': 'explosion' });
	assert.equal(resolveSoundName(asElement(unknown)), 'confirm');
});

test('guard conditions skip feedback entirely', () => {
	const { played, effects, click } = setup();
	const button = new FakeButtonElement('button');
	click(button, { defaultPrevented: true });
	click(button, { button: 1 });
	click(button, { ctrlKey: true });
	button.disabled = true;
	click(button);
	assert.deepEqual(played, []);
	assert.deepEqual(effects, []);
});

test('mute suppresses only the sound, not the animation', () => {
	const { played, effects, click } = setup(true);
	click(new FakeElement('button'));
	assert.deepEqual(played, []);
	assert.equal(effects.length, 1);
});
