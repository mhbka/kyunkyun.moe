import assert from 'node:assert/strict';
import test from 'node:test';
import { createBlogApi } from '../../../src/lib/api.ts';

test('publishes a tweet with its completed attachment ids', async () => {
	let request: Request | undefined;
	const api = createBlogApi({ baseUrl: 'https://api.example.test', fetch: async (input, init) => {
		request = new Request(input, init);
		return Response.json({ id: 'tweet', authorId: 'user', body: 'hello', tags: [], createdAt: '', media: [] });
	} });

	await api.createTweet('hello', ['thought'], ['media-1'], 'token');

	assert.equal(request?.url, 'https://api.example.test/tweets');
	assert.equal(request?.method, 'POST');
	assert.equal(request?.headers.get('Authorization'), 'Bearer token');
	assert.deepEqual(await request?.json(), { body: 'hello', tags: ['thought'], mediaIds: ['media-1'] });
});
