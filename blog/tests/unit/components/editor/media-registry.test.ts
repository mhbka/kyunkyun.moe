import assert from 'node:assert/strict';
import test from 'node:test';

import { createEditorMediaRegistry } from '../../../../src/components/editor/media-registry.ts';
import type { PostMedia } from '../../../../src/lib/models/media.ts';

const media: PostMedia = {
	id: 'media-1',
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
	const video = { ...media, id: 'media-2', mediaKind: 'video' as const, contentType: 'video/mp4' };

	registry.add(video);

	assert.equal(registry.get('media-1'), media);
	assert.equal(registry.get('media-2'), video);
	assert.deepEqual(registry.ids(), ['media-1', 'media-2']);
});

test('refreshes an existing media item without duplicating its ID', () => {
	const registry = createEditorMediaRegistry({ [media.id]: media });
	const refreshed = { ...media, width: 1200, height: 800 };

	registry.add(refreshed);

	assert.equal(registry.get(media.id), refreshed);
	assert.deepEqual(registry.ids(), [media.id]);
});
