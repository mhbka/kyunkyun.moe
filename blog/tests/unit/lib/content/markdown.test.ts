import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdown } from '../../../../src/lib/content/markdown.ts';

test('renders backend Markdown as HTML', async () => {
	const html = await renderMarkdown('# Hello\n\nA **blog post**.');

	assert.match(html, /<h1 id="hello">Hello<\/h1>/);
	assert.match(html, /<strong>blog post<\/strong>/);
});

test('combines directly adjacent unordered lists', async () => {
	const html = await renderMarkdown('<ul>\n<li>First</li>\n</ul>\n\n<ul>\n<li>Second</li>\n</ul>');

	assert.equal((html.match(/<ul>/g) ?? []).length, 1);
	assert.match(html, /<li>First<\/li>\s*<li>Second<\/li>/);
});

test('keeps unordered lists separated by content distinct', async () => {
	const html = await renderMarkdown('- First\n\nBetween lists.\n\n- Second');

	assert.equal((html.match(/<ul>/g) ?? []).length, 2);
});

test('renders gallery directives as an image carousel', async () => {
	const html = await renderMarkdown(
		':::gallery{caption="Trip"}\n' +
		'::pic{src="https://x/1.jpg" caption="One"}\n' +
		'::pic{src="https://x/2.jpg" alt="Two"}\n' +
		':::',
	);

	assert.match(html, /<figure class="gallery"/);
	assert.match(html, /<figcaption class="gallery__caption">Trip<\/figcaption>/);
	assert.match(html, /<div class="gallery__viewport">/);
	assert.match(html, /<img src="https:\/\/x\/1.jpg">/);
	assert.match(html, /<img src="https:\/\/x\/2.jpg" alt="Two" loading="lazy">/);
	assert.match(html, /data-gallery-prev/);
	assert.match(html, /data-gallery-next/);
});

test('ignores non-gallery directives', async () => {
	const html = await renderMarkdown(':::note\nNot a gallery.\n:::');

	assert.equal(html.includes('class="gallery"'), false);
});
