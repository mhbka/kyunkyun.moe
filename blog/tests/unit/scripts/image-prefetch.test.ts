import assert from 'node:assert/strict';
import test from 'node:test';

import { createImagePrefetcher } from '../../../src/scripts/image-prefetch.ts';

test('prefetches each non-empty image URL once', () => {
	const requested: string[] = [];
	const prefetch = createImagePrefetcher(() => ({
		set src(url: string) { requested.push(url); },
		get src() { return requested.at(-1) ?? ''; },
	}));

	prefetch('https://example.test/image.jpg');
	prefetch('https://example.test/image.jpg');
	prefetch('');
	prefetch('https://example.test/other.jpg');

	assert.deepEqual(requested, [
		'https://example.test/image.jpg',
		'https://example.test/other.jpg',
	]);
});
