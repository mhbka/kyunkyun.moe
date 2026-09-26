import assert from 'node:assert/strict';
import test from 'node:test';

import { addTag, normalizeTag, readTagFilters, toggleTagUrl } from '../../../src/lib/tags.ts';

test('normalizes tags to lowercase without spacing', () => {
	assert.equal(normalizeTag('Java Script'), 'javascript');
});

test('adds a normalized tag once and ignores empty or duplicate tags', () => {
	assert.deepEqual(addTag(['astro'], 'MilkDown'), ['astro', 'milkdown']);
	assert.deepEqual(addTag(['astro'], 'ASTRO'), ['astro']);
	assert.deepEqual(addTag(['astro'], '   '), ['astro']);
});


test('reads multiple filters and preserves punctuation in tags', () => {
	assert.deepEqual(readTagFilters(new URLSearchParams('tag=Astro&tag=Java+Script&tag=astro&tag=a%2Cb')), ['astro', 'javascript', 'a,b']);
});

test('tag links toggle individual filters and clear all filters', () => {
	assert.equal(toggleTagUrl('/blog/', ['astro'], 'pix'), '/blog/?tag=astro&tag=pix');
	assert.equal(toggleTagUrl('/blog/', ['astro', 'pix'], 'astro'), '/blog/?tag=pix');
	assert.equal(toggleTagUrl('/pix/', ['astro'], 'astro'), '/pix/');
	assert.equal(toggleTagUrl('/blog/', ['astro', 'pix'], ''), '/blog/');
});
