import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../../../public/simplemotion/pendulum-embed.js', import.meta.url), 'utf8')
	.replace(/^import .*;$/gm, '').replace('export async function', 'async function');

/** Runs the animation lifecycle without image downloads or WebAssembly. */
async function setup(reduced = false) {
	class MediaQuery extends EventTarget {
		matches = false;
		set(value: boolean) { this.matches = value; this.dispatchEvent(new Event('change')); }
	}
	const desktop = new MediaQuery();
	desktop.matches = true;
	const motion = new MediaQuery();
	motion.matches = reduced;
	const document = Object.assign(new EventTarget(), { hidden: false });
	const frames = new Map<number, (time: number) => void>();
	let nextFrame = 0;
	let renders = 0;
	let frees = 0;
	const svg = { isConnected: true };
	const globals = {
		URL, AbortController, document, performance,
		window: { location: { href: 'https://example.test/' }, matchMedia: (query: string) => query.includes('min-width') ? desktop : motion },
		init: async () => {}, fetch: async () => ({ text: async () => '{}' }),
		Image: class { async decode() {} },
		PendulumDemo: class {
			iconLabels() { return ['src/SD002/body']; }
			advance() {} commands() { return []; } free() { frees++; }
		},
		SvgAnimationRenderer: class {
			async setInteractiveImage() {} render() { renders++; }
		},
		requestAnimationFrame: (fn: (time: number) => void) => { frames.set(++nextFrame, fn); return nextFrame; },
		cancelAnimationFrame: (id: number) => { frames.delete(id); },
	};
	const mount = runInNewContext(`${source}\nmountPendulum`, globals);
	const dispose = await mount(svg, { jsonUrl: '/sprite.json', imageDirectoryUrl: '/images/', imagePrefix: 'SD002' });
	return { desktop, motion, document, frames, dispose, getRenders: () => renders, getFrees: () => frees };
}

test('draws the pendulum before readiness and pauses while hidden', async () => {
	const player = await setup();
	assert.equal(player.getRenders(), 1);
	assert.equal(player.frames.size, 1);
	player.desktop.set(false);
	assert.equal(player.frames.size, 0);
	player.desktop.set(true);
	assert.equal(player.frames.size, 1);
	player.document.hidden = true;
	player.document.dispatchEvent(new Event('visibilitychange'));
	assert.equal(player.frames.size, 0);
	player.dispose();
});

test('shows a static reduced-motion frame and releases the player exactly once', async () => {
	const player = await setup(true);
	assert.equal(player.getRenders(), 1);
	assert.equal(player.frames.size, 0);
	player.motion.set(false);
	assert.equal(player.frames.size, 1);
	player.dispose();
	player.dispose();
	assert.equal(player.frames.size, 0);
	assert.equal(player.getFrees(), 1);
});

test('does not load the animation module on mobile', () => {
	const component = readFileSync(new URL('../../../src/components/NanamiPendulum.astro', import.meta.url), 'utf8');
	const script = component.match(/<script is:inline type="module">([\s\S]*?)<\/script>/)![1];
	runInNewContext(script, {
		window: { matchMedia: () => ({ matches: false, addEventListener() {} }) },
		document: { addEventListener() {}, querySelector() { assert.fail('Mobile must not attempt to mount'); } },
	});
});
