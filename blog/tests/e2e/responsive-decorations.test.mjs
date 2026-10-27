import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright';

const siteShell = readFileSync(new URL('../../src/styles/base/site-shell.css', import.meta.url), 'utf8');
const walkerComponent = readFileSync(new URL('../../src/components/walker/Walker.astro', import.meta.url), 'utf8');
const pendulumRule = siteShell.match(/\.site-foreground__pendulum \{[^}]+\}/)?.[0];
const walkerRule = walkerComponent.match(/\.walker \{[^}]+\}/)?.[0];

/** Reads the rendered desktop decoration sizes at one viewport width. */
async function readDecorationSizes(page, width) {
	await page.setViewportSize({ width, height: 900 });
	await page.setContent(`
		<style>${pendulumRule}\n${walkerRule}</style>
		<svg class="site-foreground__pendulum"></svg>
		<img class="walker">
	`);

	return page.evaluate(() => ({
		pendulum: document.querySelector('.site-foreground__pendulum').getBoundingClientRect().height,
		walker: document.querySelector('.walker').getBoundingClientRect().width,
	}));
}

test('desktop decorations shrink with the viewport', async () => {
	const browser = await chromium.launch({ channel: process.env.LAB_BROWSER ?? 'chrome', headless: true });

	try {
		const page = await browser.newPage();
		const large = await readDecorationSizes(page, 1440);
		const compact = await readDecorationSizes(page, 900);

		assert.ok(compact.pendulum < large.pendulum, 'pendulum shrinks on compact desktops');
		assert.ok(compact.walker < large.walker, 'walker shrinks on compact desktops');
	} finally {
		await browser.close();
	}
});
