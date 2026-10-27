import assert from 'node:assert/strict';
import test from 'node:test';

import { finishMediaLoading, startMediaLoading, syncMediaLoading } from '../../../src/scripts/media-loading.ts';

/** Creates the minimal image state needed by the generic loading helpers. */
function createImage(complete: boolean) {
	return { complete, dataset: {} as { loading?: string } };
}

test('starts and finishes the shared loading state', () => {
	const image = createImage(false);
	startMediaLoading(image);
	assert.equal(image.dataset.loading, '');
	finishMediaLoading(image);
	assert.equal(image.dataset.loading, undefined);
});

test('clears server-rendered state for an already complete image', () => {
	const image = createImage(true);
	image.dataset.loading = '';
	syncMediaLoading(image);
	assert.equal(image.dataset.loading, undefined);
});

test('keeps server-rendered state for an image still loading', () => {
	const image = createImage(false);
	image.dataset.loading = '';
	syncMediaLoading(image);
	assert.equal(image.dataset.loading, '');
});
