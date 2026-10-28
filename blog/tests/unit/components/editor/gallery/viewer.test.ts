import assert from 'node:assert/strict';
import test from 'node:test';

import { getGalleryViewerImageUrl } from '../../../../../src/components/editor/gallery/viewer.ts';

const original = 'https://blogmedia.kyunkyun.moe/post-images/post-id/image.jpg';

/** Creates the minimal thumbnail source used by the viewer URL resolver. */
function thumbnail(originalSrc?: string) {
	return {
		dataset: { originalSrc },
		currentSrc: 'https://blogmedia.kyunkyun.moe/cdn-cgi/image/width=320/post-images/post-id/image.jpg',
		src: original,
	};
}

test('opens an optimized large variant from the original gallery image', () => {
	assert.match(getGalleryViewerImageUrl(thumbnail(original)), /width=1920,fit=scale-down,format=auto,quality=85/);
});

test('falls back to the displayed source when no original URL is available', () => {
	const external = 'https://example.com/image.jpg';
	assert.equal(getGalleryViewerImageUrl({ dataset: {}, currentSrc: external, src: external }), external);
});
