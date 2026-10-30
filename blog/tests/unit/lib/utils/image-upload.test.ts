import assert from 'node:assert/strict';
import test from 'node:test';

import { uploadImage } from '../../../../src/lib/utils/image-upload.ts';

test('requests a presigned URL, uploads and completes the file, then returns its media', async () => {
	const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
	const fetcher: typeof fetch = async (input, init) => {
		requests.push({ input, init });
		if (requests.length === 1) {
			return Response.json({
				mediaId: 'media-id',
				uploadUrl: 'https://storage.example.test/presigned-upload',
				publicUrl: 'https://images.example.test/post.png',
			});
		}
		if (requests.length === 2) return new Response(null, { status: 200 });
		return Response.json({
			id: 'media-id',
			postId: 'post-id',
			mediaKind: 'image',
			status: 'ready',
			publicUrl: 'https://images.example.test/post.png',
			videoPosterId: null,
			posterUrl: null,
			contentType: 'image/png',
			width: null,
			height: null,
			createdAt: '2026-10-30T00:00:00Z',
		});
	};

	const media = await uploadImage(
		new File(['image'], 'post.png', { type: 'image/png' }),
		'https://api.example.test/media/uploads',
		'post-id',
		'access-token',
		fetcher,
	);

	assert.equal(media.id, 'media-id');
	assert.equal(media.publicUrl, 'https://images.example.test/post.png');
	assert.equal(requests[0].init?.method, 'POST');
	assert.equal(new Headers(requests[0].init?.headers).get('Authorization'), 'Bearer access-token');
	assert.equal(requests[0].init?.body, JSON.stringify({ postId: 'post-id', contentType: 'image/png' }));
	assert.equal(requests[1].input, 'https://storage.example.test/presigned-upload');
	assert.equal(requests[1].init?.method, 'PUT');
	assert.equal(new Headers(requests[1].init?.headers).get('Content-Type'), 'image/png');
	assert.equal(requests[2].input, 'https://api.example.test/media/uploads/media-id/complete');
	assert.equal(requests[2].init?.method, 'POST');
	assert.equal(new Headers(requests[2].init?.headers).get('Authorization'), 'Bearer access-token');
});

test('rejects upload responses without an image URL', async () => {
	const fetcher: typeof fetch = async () => Response.json({});

	await assert.rejects(
		uploadImage(
			new File(['image'], 'post.png', { type: 'image/png' }),
			'https://api.example.test/media/uploads',
			'post-id',
			'access-token',
			fetcher,
		),
		/upload details/,
	);
});
