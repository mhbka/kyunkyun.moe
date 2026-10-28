import assert from 'node:assert/strict';
import test from 'node:test';

import {
	parseGalleryNodeAttrs,
	serializeGalleryNodeAttrs,
} from '../../../../../src/components/editor/gallery/clipboard.ts';

test('round-trips gallery data used by native node dragging', () => {
	const attrs = {
		caption: 'Trip',
		images: [{ src: 'one.jpg', caption: 'One' }, { src: 'two.jpg', alt: 'Two' }],
	};

	assert.deepEqual(parseGalleryNodeAttrs(serializeGalleryNodeAttrs(attrs)), attrs);
});

test('rejects malformed gallery drag data', () => {
	assert.equal(parseGalleryNodeAttrs(null), false);
	assert.equal(parseGalleryNodeAttrs('{'), false);
	assert.equal(parseGalleryNodeAttrs(JSON.stringify({ caption: '', images: [{}] })), false);
});
