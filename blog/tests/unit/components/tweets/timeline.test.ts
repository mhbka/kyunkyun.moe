import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_MEDIA_BYTES, MAX_MEDIA_COUNT } from '../../../../src/components/tweets/timeline.ts';

test('tweet attachment constraints match the public composer limits', () => {
	assert.equal(MAX_MEDIA_COUNT, 5);
	assert.equal(MAX_MEDIA_BYTES, 104857600);
});
