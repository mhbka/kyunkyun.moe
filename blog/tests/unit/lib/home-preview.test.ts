import assert from 'node:assert/strict';
import test from 'node:test';

import { truncatePreviewText } from '../../../src/lib/home-preview.ts';

test('normalizes whitespace in preview text', () => {
	assert.equal(truncatePreviewText('  hello\n\nthere  '), 'hello there');
});

test('truncates long preview text at a word boundary', () => {
	assert.equal(truncatePreviewText('one two three four', 10), 'one two…');
});

test('handles a single word that exceeds the preview length', () => {
	assert.equal(truncatePreviewText('longword', 4), 'long…');
});
