import assert from 'node:assert/strict';
import test from 'node:test';
import { getPixPortalUrl, getPixThumbnailSources, getPixThumbnailUrl } from '../../../../src/components/pix/image-url.ts';

const original = 'https://pix.example.test/images/image-id.jpg';

test('builds a cropped same-origin Cloudflare thumbnail URL', () => {
	assert.equal(
		getPixThumbnailUrl(original, 320),
		'https://pix.example.test/cdn-cgi/image/width=320,height=320,fit=cover,format=auto,quality=75/images/image-id.jpg',
	);
});

test('provides bounded responsive thumbnail sources', () => {
	const thumbnail = getPixThumbnailSources(original);
	assert.equal(thumbnail.src, getPixThumbnailUrl(original, 320));
	assert.equal(
		thumbnail.srcSet,
		`${getPixThumbnailUrl(original, 320)} 320w, ${getPixThumbnailUrl(original, 640)} 640w`,
	);
	assert.equal(thumbnail.sizes, '(max-width: 800px) 50vw, 20vw');
});

test('builds a non-cropped portal URL that does not upscale small images', () => {
	assert.equal(
		getPixPortalUrl(original),
		'https://pix.example.test/cdn-cgi/image/width=1920,height=1920,fit=scale-down,format=auto,quality=85/images/image-id.jpg',
	);
});
