import assert from 'node:assert/strict';
import test from 'node:test';
import { getPixImageLoading } from '../../../../src/components/pix/image-loading.ts';

test('prioritizes only the first Pix thumbnail', () => {
	assert.deepEqual(getPixImageLoading(0), { loading: 'eager', fetchPriority: 'high' });
	assert.deepEqual(getPixImageLoading(1), { loading: 'lazy', fetchPriority: 'low' });
	assert.deepEqual(getPixImageLoading(23), { loading: 'lazy', fetchPriority: 'low' });
});
