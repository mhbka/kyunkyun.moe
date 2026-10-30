import { createApiClient, DEFAULT_API_BASE_URL } from './client.ts';
import { createCommentsApi } from './comments.ts';
import { createLatestApi } from './latest.ts';
import { createPixApi } from './pix.ts';
import { createPostsApi } from './posts.ts';
import { createTagsApi } from './tags.ts';
import { createTweetsApi } from './tweets.ts';
import type { BlogApiOptions } from '../models/api.ts';

export { ApiError, DEFAULT_API_BASE_URL } from './client.ts';
export type { BlogApiOptions } from '../models/api.ts';
export type { Comment, CreateCommentInput, UpdateCommentInput } from '../models/comments.ts';
export type { Latest } from '../models/latest.ts';
export type { PostMedia, PostMediaKind, PostMediaMap, PostMediaStatus } from '../models/media.ts';
export type { CreatePostInput, DraftPostSummary, Post, PostPage, PostStatus, PostSummary, UpdatePostInput } from '../models/posts.ts';
export type { TagSummary } from '../models/tags.ts';
export type { Pix, PixPage, PixTagUpdate, PixUpload } from '../models/pix.ts';
export type { Tweet, TweetMedia, TweetPage, TweetUpload } from '../models/tweets.ts';

/** Combines each backend resource client into the application API. */
export function createBlogApi(options: BlogApiOptions = {}) {
	const request = createApiClient(options);
	return {
		...createLatestApi(request),
		...createPostsApi(request),
		...createTagsApi(request),
		...createCommentsApi(request),
		...createPixApi(request, options.fetch),
		...createTweetsApi(request, options.fetch),
	};
}

/** Provides the application's default backend API client. */
export const blogApi = createBlogApi({ baseUrl: DEFAULT_API_BASE_URL });
