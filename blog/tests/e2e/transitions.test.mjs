import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, firefox, webkit } from 'playwright';

// Production-build smoke checks for the transition router: persistent
// decorations must keep their DOM identity and populations across real
// navigation. Start the blog preview first: npm run preview -- --port 4321
const base = process.env.BLOG_URL ?? 'http://127.0.0.1:4321';
const channel = process.env.LAB_BROWSER ?? 'chrome';
const engine = channel === 'firefox' ? firefox : channel === 'webkit' ? webkit : chromium;

/** Routes exercised through the header's primary navigation. */
const ROUTES = ['/me', '/blog', '/pix', '/tweets', '/nonsense/bash-org', '/others/changelog-credits', '/'];

/** Remembers the entry page's decorative roots inside the page realm. */
function captureDecorations(page) {
	return page.evaluate(() => {
		const record = window.__decorations = {
			walker: document.querySelector('.walker'),
			pendulum: document.querySelector('.site-foreground__pendulum'),
			butterflies: document.querySelector('ambient-butterflies'),
			sakura: document.querySelector('ambient-sakura'),
		};
		// Tags the current swarm so later checks can tell survivors from new spawns.
		document.querySelectorAll('.ambient-butterfly').forEach((butterfly) => butterfly.setAttribute('data-entry', ''));
		return {
			pendulumMounted: record.pendulum?.dataset.mounted === 'true',
			butterflyCount: document.querySelectorAll('.ambient-butterfly').length,
		};
	});
}

/** Compares the current document's decorations against the recorded originals. */
function compareDecorations(page) {
	return page.evaluate(() => {
		const record = window.__decorations;
		return {
			sameWalker: record.walker === document.querySelector('.walker'),
			samePendulum: record.pendulum === document.querySelector('.site-foreground__pendulum'),
			sameButterflies: record.butterflies === document.querySelector('ambient-butterflies'),
			sameSakura: record.sakura === document.querySelector('ambient-sakura'),
			walkerCount: document.querySelectorAll('.walker').length,
			survivingButterflies: document.querySelectorAll('.ambient-butterfly[data-entry]').length,
		};
	});
}

test('decorations persist through production navigation and history', async () => {
	const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel } : {}) });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`${base}/`);
		await page.waitForSelector('.site-foreground__pendulum[data-mounted="true"]');
		const entry = await captureDecorations(page);
		assert.ok(entry.butterflyCount > 0, 'butterflies seeded on entry');

		// Follows every primary navigation link in turn, opening the dropdown first.
		for (const route of ROUTES) {
			if (route.includes('nonsense') || route.includes('others')) await page.click('.nav-dropdown > summary');
			const link = page.locator(`.primary-links a[href="${route}"]`).first();
			await link.click();
			await page.waitForFunction((path) => location.pathname === path, route);
		}

		const after = await compareDecorations(page);
		assert.deepEqual({ ...after, survivingButterflies: undefined }, {
			sameWalker: true,
			samePendulum: true,
			sameButterflies: true,
			sameSakura: true,
			walkerCount: 1,
			survivingButterflies: undefined,
		});
		// Natural flight churn replaces individuals; a reseed would remove them all.
		assert.ok(after.survivingButterflies > 0, 'entry butterflies survived navigation');

		// Back and forward through the same routes retain the same nodes.
		for (let index = 0; index < 3; index += 1) { await page.goBack(); await page.waitForLoadState('load'); }
		for (let index = 0; index < 3; index += 1) { await page.goForward(); await page.waitForLoadState('load'); }
		const historical = await compareDecorations(page);
		assert.equal(historical.samePendulum, true, 'pendulum survived history traversal');
		assert.equal(historical.sameWalker, true, 'walker survived history traversal');
		assert.equal(historical.sameSakura, true, 'sakura survived history traversal');
		assert.deepEqual(errors, []);
	} finally {
		await browser.close();
	}
});

test('content fades while decorations stay live and untouched', async () => {
	const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel } : {}) });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`${base}/`);
		await page.waitForSelector('.site-foreground__pendulum[data-mounted="true"]');
		await captureDecorations(page);

		await page.click('.primary-links a[href="/me"]');
		// Samples the deliberately slow outgoing fade before the swap completes.
		await page.waitForTimeout(600);
		const midFade = await page.evaluate(() => ({
			contentOpacity: Number.parseFloat(getComputedStyle(document.querySelector('[data-fade]')).opacity),
			pendulumOpacity: getComputedStyle(document.querySelector('.site-foreground__pendulum')).opacity,
			walkerOpacity: getComputedStyle(document.querySelector('.walker')).opacity,
		}));
		assert.ok(midFade.contentOpacity < 1, `content mid-fade, got ${midFade.contentOpacity}`);
		assert.equal(midFade.pendulumOpacity, '1', 'pendulum never joins the fade');
		assert.equal(midFade.walkerOpacity, '1', 'walker never joins the fade');

		await page.waitForFunction(() => location.pathname === '/me');
		const after = await compareDecorations(page);
		assert.equal(after.samePendulum, true);
		assert.equal(after.sameWalker, true);
		// The incoming page ends fully visible once the fade settles.
		await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-fade]')).opacity === '1', null, { timeout: 8000 });
		assert.deepEqual(errors, []);
	} finally {
		await browser.close();
	}
});

test('tag filtering and history are router-owned', async () => {
	const browser = await engine.launch({ headless: true, ...(engine === chromium ? { channel } : {}) });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		const errors = [];
		page.on('pageerror', (error) => errors.push(error.message));
		await page.goto(`${base}/blog`);
		await captureDecorations(page);
		const firstTag = page.locator('.tag-filter [data-tag]:not([data-tag=""])').first();
		if ((await firstTag.count()) === 0) {
			test.skip('no tags in the local database');
			return;
		}
		const tag = await firstTag.getAttribute('data-tag');
		await firstTag.click();
		await page.waitForFunction((expected) => new URL(location.href).searchParams.getAll('tag').includes(expected), tag);
		const filtered = await page.evaluate(() => document.querySelectorAll('#published-list > *').length);

		await page.goBack();
		await page.waitForFunction(() => new URL(location.href).searchParams.getAll('tag').length === 0);
		const unfiltered = await page.evaluate(() => document.querySelectorAll('#published-list > *').length);
		assert.ok(filtered <= unfiltered, 'filtered list is a subset');
		const after = await compareDecorations(page);
		assert.equal(after.samePendulum, true, 'pendulum survived filter navigation');
		assert.equal(after.sameWalker, true, 'walker survived filter navigation');
		assert.deepEqual(errors, []);
	} finally {
		await browser.close();
	}
});
