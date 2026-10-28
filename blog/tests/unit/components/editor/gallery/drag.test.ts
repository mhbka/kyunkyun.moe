import assert from 'node:assert/strict';
import test from 'node:test';

import {
	galleryItemDragType,
	isGalleryItemDrag,
} from '../../../../../src/components/editor/gallery/drag.ts';

test('recognizes active and cross-gallery media drags', () => {
	assert.equal(isGalleryItemDrag(1), true);
	assert.equal(isGalleryItemDrag(null, [galleryItemDragType]), true);
});

test('leaves ProseMirror whole-node drags untouched', () => {
	assert.equal(isGalleryItemDrag(null, ['text/html', 'text/plain']), false);
});
