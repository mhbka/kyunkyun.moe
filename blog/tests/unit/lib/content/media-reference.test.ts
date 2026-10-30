import assert from 'node:assert/strict';
import test from 'node:test';

import {
	createMediaReference,
	isMediaReference,
	parseMediaReference,
	resolveMediaDisplayUrl,
	resolveMediaReference,
} from '../../../../src/lib/content/media-reference.ts';
import type { PostMedia, PostMediaMap } from '../../../../src/lib/models/media.ts';

const mediaId = '550e8400-e29b-41d4-a716-446655440000';
const item: PostMedia = {
	id: mediaId,
	postId: 'post-id',
	mediaKind: 'image',
	status: 'ready',
	publicUrl: 'https://media.example.test/image.webp',
	videoPosterId: null,
	posterUrl: null,
	contentType: 'image/webp',
	width: 1600,
	height: 900,
	createdAt: '2026-10-30T00:00:00Z',
};
const media: PostMediaMap = { [mediaId]: item };

test('builds and parses stable media references', () => {
	const reference = createMediaReference(mediaId);

	assert.equal(reference, `media:${mediaId}`);
	assert.equal(parseMediaReference(reference), mediaId);
	assert.equal(isMediaReference(reference), true);
});

test('rejects malformed references without treating ordinary URLs as managed media', () => {
	assert.equal(parseMediaReference('media:not-a-uuid'), null);
	assert.equal(isMediaReference('media:not-a-uuid'), true);
	assert.equal(isMediaReference('https://example.test/image.jpg'), false);
});

test('resolves managed references while preserving legacy URLs', () => {
	assert.equal(resolveMediaReference(`media:${mediaId}`, media), item);
	assert.equal(resolveMediaDisplayUrl(`media:${mediaId}`, media), item.publicUrl);
	assert.equal(resolveMediaDisplayUrl('https://example.test/image.jpg', media), 'https://example.test/image.jpg');
	assert.equal(resolveMediaDisplayUrl('media:00000000-0000-0000-0000-000000000000', media), '');
});
