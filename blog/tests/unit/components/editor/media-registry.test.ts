import assert from 'node:assert/strict';
import test from 'node:test';

import { createEditorMediaRegistry } from '../../../../src/components/editor/media-registry.ts';
import type { PostMedia } from '../../../../src/lib/models/media.ts';

const imageId = '550e8400-e29b-41d4-a716-446655440000';
const videoId = '550e8400-e29b-41d4-a716-446655440001';

const media: PostMedia = {
	id: imageId,
	postId: 'post-1',
	mediaKind: 'image',
	status: 'ready',
	publicUrl: 'https://media.example.test/image.png',
	videoPosterId: null,
	posterUrl: null,
	contentType: 'image/png',
	width: null,
	height: null,
	createdAt: '2026-10-30T00:00:00Z',
};

test('tracks initial and newly uploaded media by stable ID', () => {
	const registry = createEditorMediaRegistry({ [media.id]: media });
	const video = { ...media, id: videoId, mediaKind: 'video' as const, contentType: 'video/mp4' };

	registry.add(video);

	assert.equal(registry.get(imageId), media);
	assert.equal(registry.get(videoId), video);
	assert.deepEqual(registry.ids(), [imageId, videoId]);
	assert.equal(registry.resolve(`media:${videoId}`), video);
	assert.equal(registry.displayUrl(`media:${imageId}`), media.publicUrl);
	assert.equal(registry.displayUrl(`media:${videoId}`, 'image'), '');
	assert.equal(registry.displayUrl('https://example.test/legacy.jpg'), 'https://example.test/legacy.jpg');
});

test('refreshes an existing media item without duplicating its ID', () => {
	const registry = createEditorMediaRegistry({ [media.id]: media });
	const refreshed = { ...media, width: 1200, height: 800 };

	registry.add(refreshed);

	assert.equal(registry.get(media.id), refreshed);
	assert.deepEqual(registry.ids(), [media.id]);
});
