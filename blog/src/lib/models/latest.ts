import type { Pix } from './pix.ts';
import type { PostSummary } from './posts.ts';
import type { Tweet } from './tweets.ts';

/** Represents the cached public content displayed on the home page. */
export interface Latest {
	pix: Pix[];
	post: PostSummary | null;
	tweet: Tweet | null;
	generatedAt: string;
}
