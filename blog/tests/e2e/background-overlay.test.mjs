import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const base = process.env.BLOG_URL ?? 'http://localhost:4321';

test('background overlay remains visible across client-side navigation', async () => {
	const browser = await chromium.launch({ headless: true, channel: process.env.LAB_BROWSER ?? 'chrome' });
	try {
		const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
		await page.goto(`${base}/`);

		for (const path of ['/me', '/blog', '/pix', '/', '/tweets', '/blog', '/']) {
			await page.locator(`.main-nav-item[href="${path}"]`).first().click();
			await page.waitForURL((url) => url.pathname === path);
			const overlay = page.locator('.background-overlay--azularp');
			const state = await overlay.evaluate((element) => ({
				connected: element.isConnected,
				loaded: element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
				source: element instanceof HTMLImageElement ? element.currentSrc : '',
				width: element.getBoundingClientRect().width,
			}));
			assert.equal(state.connected, true, `${path} keeps the overlay connected`);
			assert.equal(state.loaded, true, `${path} keeps the overlay image loaded`);
			assert.match(state.source, /\/images\/bg_overlays\/azularp\.webp$/, `${path} uses Azularp's generated WebP`);
			assert.ok(state.width > 0, `${path} keeps the overlay sized`);
		}

		const navigationOverlay = page.locator('.navigation-background-overlay--tenshin-ranman');
		const navigationState = await navigationOverlay.evaluate((element) => {
			const image = element.querySelector('img');
			return {
				loaded: image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
				mask: getComputedStyle(element).maskImage,
				source: image instanceof HTMLImageElement ? image.currentSrc : '',
			};
		});
		assert.equal(navigationState.loaded, true, 'navigation overlay image loads');
		assert.notEqual(navigationState.mask, 'none', 'navigation overlay extends through the nav fade');
		assert.match(navigationState.source, /\/images\/nav_overlays\/tenshin%20ranman%20larp\.webp$/, 'navigation overlay uses its generated WebP');

		await page.setViewportSize({ width: 800, height: 900 });
		assert.equal(await page.locator('.background-overlay').isVisible(), false, 'mobile hides background overlays');
		assert.equal(await navigationOverlay.isVisible(), false, 'mobile hides navigation overlays');
	} finally {
		await browser.close();
	}
});
