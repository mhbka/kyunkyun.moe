import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdown } from '../../../../src/lib/content/markdown.ts';
import type { PostMedia, PostMediaMap } from '../../../../src/lib/models/media.ts';

const imageId = '550e8400-e29b-41d4-a716-446655440000';
const videoId = '550e8400-e29b-41d4-a716-446655440001';

/** Builds one ready media item for Markdown rendering tests. */
function postMedia(overrides: Partial<PostMedia>): PostMedia {
	return {
		id: imageId,
		postId: 'post-id',
		mediaKind: 'image',
		status: 'ready',
		publicUrl: 'https://blogmedia.kyunkyun.moe/post-images/post-id/image.webp',
		videoPosterId: null,
		posterUrl: null,
		contentType: 'image/webp',
		width: 1600,
		height: 900,
		createdAt: '2026-10-30T00:00:00Z',
		...overrides,
	};
}

const managedMedia: PostMediaMap = {
	[imageId]: postMedia({}),
	[videoId]: postMedia({
		id: videoId,
		mediaKind: 'video',
		publicUrl: 'https://blogmedia.kyunkyun.moe/post-images/post-id/video.mp4',
		posterUrl: 'https://blogmedia.kyunkyun.moe/post-images/post-id/poster.webp',
		contentType: 'video/mp4',
		width: 1920,
		height: 1080,
	}),
};

test('renders backend Markdown as HTML', async () => {
	const html = await renderMarkdown('# Hello\n\nA **blog post**.');

	assert.match(html, /<h1 id="hello">Hello<\/h1>/);
	assert.match(html, /<strong>blog post<\/strong>/);
});

test('adds responsive sources to blog media images only', async () => {
	const html = await renderMarkdown(
		'![Stored](https://blogmedia.kyunkyun.moe/post-images/post-id/image.jpg)\n\n' +
		'![External](https://example.com/image.jpg)',
	);

	assert.match(html, /src="https:\/\/blogmedia\.kyunkyun\.moe\/cdn-cgi\/image\/width=640/);
	assert.match(html, /srcset="[^"]+ 640w, [^"]+ 1280w, [^"]+ 1920w"/);
	assert.match(html, /sizes="\(max-width: 800px\) 100vw, 70vw"/);
	assert.match(html, /class="media-loadable"/);
	assert.match(html, /data-loading=""/);
	assert.match(html, /data-original-src="https:\/\/blogmedia\.kyunkyun\.moe\/post-images\/post-id\/image\.jpg"/);
	assert.match(html, /loading="lazy"/);
	assert.match(html, /<img src="https:\/\/example\.com\/image\.jpg" alt="External">/);
});

test('resolves managed images with responsive sources and intrinsic dimensions', async () => {
	const html = await renderMarkdown(`![Managed](media:${imageId})`, managedMedia);

	assert.doesNotMatch(html, /media:550e8400/);
	assert.match(html, /src="https:\/\/blogmedia\.kyunkyun\.moe\/cdn-cgi\/image\/width=640/);
	assert.match(html, /width="1600"/);
	assert.match(html, /height="900"/);
	assert.match(html, /alt="Managed"/);
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

test('adds responsive sources to blog media gallery images without changing videos', async () => {
	const html = await renderMarkdown(
		':::gallery\n' +
		'::pic{src="https://blogmedia.kyunkyun.moe/post-images/post-id/image.png"}\n' +
		'::pic{src="https://blogmedia.kyunkyun.moe/post-images/post-id/clip.mp4"}\n' +
		':::',
	);

	assert.match(html, /<img class="media-loadable" data-loading="" src="https:\/\/blogmedia\.kyunkyun\.moe\/cdn-cgi\/image\/width=640/);
	assert.match(html, /data-original-src="https:\/\/blogmedia\.kyunkyun\.moe\/post-images\/post-id\/image\.png"/);
	assert.match(html, /<video src="https:\/\/blogmedia\.kyunkyun\.moe\/post-images\/post-id\/clip\.mp4"/);
	assert.doesNotMatch(html, /cdn-cgi\/media/);
});

test('renders video directives as video players', async () => {
	const html = await renderMarkdown('::video{src="https://x/clip.mp4" caption="Clip"}');

	assert.match(html, /<figure class="video"><video src="https:\/\/x\/clip.mp4"/);
	assert.match(html, /<figcaption class="video__caption">Clip<\/figcaption>/);
});

test('resolves managed gallery media and standalone video posters', async () => {
	const html = await renderMarkdown(
		`:::gallery\n::pic{src="media:${imageId}" alt="Managed"}\n::pic{src="media:${videoId}"}\n:::\n\n` +
		`::video{src="media:${videoId}" caption="Clip"}`,
		managedMedia,
	);

	assert.match(html, /<img class="media-loadable"[^>]*width="1600" height="900"[^>]*alt="Managed"/);
	assert.match(html, /<video src="https:\/\/blogmedia\.kyunkyun\.moe\/post-images\/post-id\/video\.mp4" poster="https:\/\/blogmedia\.kyunkyun\.moe\/post-images\/post-id\/poster\.webp" width="1920" height="1080"/);
	assert.doesNotMatch(html, /media:550e8400/);
});

test('renders unavailable managed media as a safe placeholder', async () => {
	const pending = { ...managedMedia[videoId], status: 'pending' as const, publicUrl: null };
	const html = await renderMarkdown(
		`![Missing](media:00000000-0000-0000-0000-000000000000)\n\n::video{src="media:${videoId}"}`,
		{ ...managedMedia, [videoId]: pending },
	);

	assert.equal((html.match(/class="media-unavailable"/g) ?? []).length, 2);
	assert.doesNotMatch(html, /src="media:/);
});

test('renders a ready raw video before optimization completes', async () => {
	const rawVideo = { ...managedMedia[videoId], posterUrl: null };
	const html = await renderMarkdown(`::video{src="media:${videoId}"}`, {
		...managedMedia,
		[videoId]: rawVideo,
	});

	assert.match(html, /<video src="https:\/\/blogmedia\.kyunkyun\.moe\/post-images\/post-id\/video\.mp4"/);
	assert.doesNotMatch(html, /media-unavailable/);
});

test('does not render an image reference as a standalone video', async () => {
	const html = await renderMarkdown(`::video{src="media:${imageId}"}`, managedMedia);

	assert.match(html, /class="media-unavailable"/);
	assert.doesNotMatch(html, /<figure class="video"><img/);
});

test('ignores non-gallery directives', async () => {
	const html = await renderMarkdown(':::note\nNot a gallery.\n:::');

	assert.equal(html.includes('class="gallery"'), false);
});
