import assert from 'node:assert/strict';
import test from 'node:test';

import {
	getBlogImageEditorThumbnailUrl,
	getBlogImagePortalUrl,
	getBlogImageSources,
	isBlogImageUrl,
} from '../../../../src/lib/content/blog-media.ts';

const original = 'https://blogmedia.kyunkyun.moe/post-images/post-id/image.jpg';

test('recognizes only images from the configured blog media path', () => {
	assert.equal(isBlogImageUrl(original), true);
	assert.equal(isBlogImageUrl('https://blogmedia.kyunkyun.moe/other/image.jpg'), false);
	assert.equal(isBlogImageUrl('https://example.com/post-images/image.jpg'), false);
	assert.equal(isBlogImageUrl('/post-images/image.jpg'), false);
});

test('builds responsive blog image variants', () => {
	const sources = getBlogImageSources(original);
	assert.ok(sources);
	assert.equal(sources.originalSrc, original);
	assert.match(sources.src, /\/cdn-cgi\/image\/width=640,fit=scale-down,format=auto,quality=80\/post-images\//);
	assert.match(sources.srcSet, / 640w, .*width=1280.* 1280w, .*width=1920.* 1920w$/);
	assert.equal(sources.sizes, '(max-width: 800px) 100vw, 70vw');
});

test('builds a compact editor thumbnail and leaves external images alone', () => {
	assert.match(getBlogImageEditorThumbnailUrl(original), /width=320,fit=scale-down,format=auto,quality=75/);
	assert.equal(getBlogImageEditorThumbnailUrl('https://example.com/image.jpg'), 'https://example.com/image.jpg');
});

test('builds a larger portal variant and leaves external images alone', () => {
	assert.match(getBlogImagePortalUrl(original), /width=1920,fit=scale-down,format=auto,quality=85/);
	assert.equal(getBlogImagePortalUrl('https://example.com/image.jpg'), 'https://example.com/image.jpg');
});
