import type { ApiRequest } from '../models/api.ts';
import type { Tweet, TweetMedia, TweetPage, TweetUpload } from '../models/tweets.ts';

/** Creates requests for the public tweet feed and authenticated composer. */
export function createTweetsApi(request: ApiRequest, upload: typeof globalThis.fetch = globalThis.fetch) {
	return {
		getTweetStatus: (token: string) => request<{ isTweet: boolean }>('/users/is-tweet', {}, token),
		listTweetTags: () => request<Array<{ tag: string; count: number }>>('/tweets/tags'),
		listTweets: (limit = 30, before?: string, tag?: string | string[]) => {
			const query = new URLSearchParams({ limit: String(limit) });
			if (before) query.set('before', before);
			if (Array.isArray(tag)) query.set('tags', JSON.stringify(tag));
			else if (tag) query.set('tag', tag);
			return request<TweetPage>(`/tweets?${query}`);
		},
		createTweet: (body: string, tags: string[], mediaIds: string[], token: string) =>
			request<Tweet>('/tweets', { method: 'POST', body: JSON.stringify({ body, tags, mediaIds }) }, token),
		deleteTweet: (id: string, token: string) => request<void>(`/tweets/id/${encodeURIComponent(id)}`, { method: 'DELETE' }, token),
		uploadTweetMedia: async (file: File, token: string) => {
			const prepared = await request<TweetUpload>('/tweets/uploads', { method: 'POST', body: JSON.stringify({ contentType: file.type, byteSize: file.size }) }, token);
			const response = await upload(prepared.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
			if (!response.ok) throw new Error('tweet attachment upload failed');
			return request<TweetMedia>(`/tweets/uploads/${encodeURIComponent(prepared.mediaId)}/complete`, { method: 'POST' }, token);
		},
	};
}
