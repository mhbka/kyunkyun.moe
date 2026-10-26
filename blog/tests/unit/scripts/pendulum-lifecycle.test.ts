import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const component = readFileSync(new URL('../../../src/components/NanamiPendulum.astro', import.meta.url), 'utf8');
const script = component
	.match(/<script is:inline type="module">([\s\S]*?)<\/script>/)![1]
	// Substitutes the embed module so tests control when and how mounting settles.
	.replace("await import('/simplemotion/pendulum-embed.js')", 'await loadEmbed()');

/** Runs the component script with a controllable desktop query and SVG presence. */
function setup(desktopMatches = true) {
	class MediaQuery extends EventTarget {
		matches = desktopMatches;
		set(value: boolean) { this.matches = value; this.dispatchEvent(new Event('change')); }
	}
	class FakeSvg {
		dataset: Record<string, string | undefined> = {};
		isConnected = true;
	}
	const media = new MediaQuery();
	const documentEvents = new EventTarget();
	let currentSvg: FakeSvg | null = new FakeSvg();
	const mounts: FakeSvg[] = [];
	const disposals: FakeSvg[] = [];
	const warnings: unknown[][] = [];
	const frames: (() => void)[] = [];
	let gate: { resolve: (module: object) => void; reject: (error: Error) => void } | undefined;
	let loadCalls = 0;
	runInNewContext(script, {
		Event, SVGSVGElement: FakeSvg,
		console: { warn: (...args: unknown[]) => warnings.push(args) },
		window: {
			matchMedia: () => media,
			dispatchEvent: () => true,
		},
		document: {
			querySelector: () => currentSvg,
			addEventListener: documentEvents.addEventListener.bind(documentEvents),
		},
		requestAnimationFrame: (callback: () => void) => frames.push(callback),
		loadEmbed: () => {
			loadCalls += 1;
			return new Promise((resolve, reject) => {
				gate = { resolve, reject };
			});
		},
	});

	const mountPendulum = async (svg: FakeSvg) => {
		mounts.push(svg);
		return () => disposals.push(svg);
	};

	/** Flushes pending microtasks, the mount chain, and the readiness frame. */
	async function settle() {
		for (let index = 0; index < 6; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
		frames.splice(0).forEach((callback) => callback());
	}

	return {
		media, documentEvents, mounts, disposals, warnings,
		FakeSvg,
		getSvg: () => currentSvg,
		replaceSvg() { const next = new FakeSvg(); currentSvg = next; return next; },
		removeSvg() { currentSvg = null; },
		loads: () => loadCalls,
		resolveLoad: () => gate!.resolve({ mountPendulum }),
		rejectLoad: (error: Error) => gate!.reject(error),
		settle,
	};
}

test('does not load the animation module on mobile', async () => {
	const page = setup(false);
	assert.equal(page.loads(), 0);
	await page.settle();
	assert.equal(page.mounts.length, 0);
});

test('mounts once and keeps the player across persisted navigation', async () => {
	const page = setup();
	page.resolveLoad();
	await page.settle();
	assert.equal(page.mounts.length, 1);

	page.documentEvents.dispatchEvent(new Event('astro:page-load'));
	await page.settle();
	assert.equal(page.mounts.length, 1);
	assert.equal(page.disposals.length, 0);
});

test('releases the player only when its SVG was genuinely removed', async () => {
	const page = setup();
	page.resolveLoad();
	await page.settle();
	const removed = page.getSvg()!;
	removed.isConnected = false;
	const replacement = page.replaceSvg();
	page.documentEvents.dispatchEvent(new Event('astro:page-load'));
	page.resolveLoad();
	await page.settle();
	assert.deepEqual(page.disposals, [removed]);
	assert.deepEqual(page.mounts, [removed, replacement]);
});

test('clears the mounted marker after failure so the next visit retries', async () => {
	const page = setup();
	page.rejectLoad(new Error('wasm failed'));
	await page.settle();
	assert.equal(page.warnings.length, 1);
	assert.equal(page.getSvg()!.dataset.mounted, undefined);

	page.documentEvents.dispatchEvent(new Event('astro:page-load'));
	page.resolveLoad();
	await page.settle();
	assert.equal(page.mounts.length, 1);
	assert.equal(page.disposals.length, 0);
});

test('does not mount twice while assets are still loading', async () => {
	const page = setup();
	page.documentEvents.dispatchEvent(new Event('astro:page-load'));
	page.media.set(false);
	page.media.set(true);
	page.resolveLoad();
	await page.settle();
	assert.equal(page.loads(), 1);
	assert.equal(page.mounts.length, 1);
});

test('disposes a late-completing mount whose SVG was removed and mounts the replacement', async () => {
	const page = setup();
	const removed = page.getSvg()!;
	removed.isConnected = false;
	const replacement = page.replaceSvg();
	page.documentEvents.dispatchEvent(new Event('astro:page-load'));
	page.resolveLoad();
	await page.settle();
	// Completing the removed SVG's mount disposes it and serves the waiting replacement.
	assert.deepEqual(page.disposals, [removed]);
	page.resolveLoad();
	await page.settle();
	assert.deepEqual(page.mounts, [removed, replacement]);
});
