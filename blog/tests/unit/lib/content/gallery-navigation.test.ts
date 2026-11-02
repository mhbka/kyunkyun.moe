import assert from 'node:assert/strict';
import test from 'node:test';

import { getGalleryNeighbourIndexes, wrapGalleryIndex } from '../../../../src/lib/content/gallery-navigation.ts';

test('wrapGalleryIndex loops past both ends', () => {
	assert.equal(wrapGalleryIndex(-1, 4), 3);
	assert.equal(wrapGalleryIndex(4, 4), 0);
	assert.equal(wrapGalleryIndex(2, 4), 2);
});

test('getGalleryNeighbourIndexes returns the previous and next slides, wrapping around', () => {
	assert.deepEqual(getGalleryNeighbourIndexes(0, 5), [4, 1]);
	assert.deepEqual(getGalleryNeighbourIndexes(4, 5), [3, 0]);
	assert.deepEqual(getGalleryNeighbourIndexes(2, 5), [1, 3]);
});

test('getGalleryNeighbourIndexes avoids duplicates and the current slide in small galleries', () => {
	assert.deepEqual(getGalleryNeighbourIndexes(0, 2), [1]);
	assert.deepEqual(getGalleryNeighbourIndexes(0, 1), []);
});
