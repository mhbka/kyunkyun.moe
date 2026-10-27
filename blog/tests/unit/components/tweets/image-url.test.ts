import assert from 'node:assert/strict';
import test from 'node:test';

import { getTweetPortalUrl, getTweetThumbnailSources, getTweetThumbnailUrl } from '../../../../src/components/tweets/image-url.ts';

const original = 'https://tweetmedia.kyunkyun.moe/media/image-id.png';

test('builds a cropped Tweet thumbnail URL', () => {
	assert.equal(
		getTweetThumbnailUrl(original, 320),
		'https://tweetmedia.kyunkyun.moe/cdn-cgi/image/width=320,height=320,fit=cover,format=auto,quality=75/media/image-id.png',
	);
});

test('provides responsive Tweet thumbnail sources', () => {
	const thumbnail = getTweetThumbnailSources(original);

	assert.equal(thumbnail.src, getTweetThumbnailUrl(original, 320));
	assert.equal(thumbnail.srcSet, `${getTweetThumbnailUrl(original, 320)} 320w, ${getTweetThumbnailUrl(original, 640)} 640w`);
	assert.equal(thumbnail.sizes, '(max-width: 800px) 50vw, 12rem');
});

test('builds a bounded portal URL and leaves other hosts unchanged', () => {
	assert.equal(
		getTweetPortalUrl(original),
		'https://tweetmedia.kyunkyun.moe/cdn-cgi/image/width=1920,height=1920,fit=scale-down,format=auto,quality=85/media/image-id.png',
	);
	assert.equal(getTweetPortalUrl('https://example.com/media/image.png'), 'https://example.com/media/image.png');
});
