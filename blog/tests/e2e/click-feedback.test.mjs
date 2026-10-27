import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

const base = process.env.BLOG_URL ?? 'http://localhost:4321';

/** Presses a navigation link and returns its held visual state. */
async function pressNavigationLink(page, href) {
	const link = page.locator(`.primary-links a[href="${href}"]`).first();
	const bounds = await link.boundingBox();
	assert.ok(bounds, `${href} navigation link is visible`);
	await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
	await page.mouse.down();
	return {
		link,
		state: await link.evaluate((element) => ({
			pressed: element.classList.contains('click-feedback-pressed'),
			scale: getComputedStyle(element).scale,
		})),
	};
}

test('navigation feedback remains active after client-side page swaps', async () => {
	const browser = await chromium.launch({ headless: true, channel: 'chrome' });
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
		await page.goto(`${base}/`);

		for (const href of ['/me', '/blog']) {
			const { link, state } = await pressNavigationLink(page, href);
			assert.equal(state.pressed, true, `${href} receives the held class`);
			assert.notEqual(state.scale, 'none', `${href} receives the held scale`);
			await page.mouse.up();
			const released = await link.evaluate((element) => ({
				popping: element.classList.contains('click-feedback-pop'),
				animation: getComputedStyle(element).animationName,
			}));
			assert.equal(released.popping, true, `${href} receives the release class`);
			assert.equal(released.animation, 'click-feedback-pop', `${href} starts the release animation`);
			await page.waitForFunction((path) => location.pathname === path, href);
		}
	} finally {
		await browser.close();
	}
});
