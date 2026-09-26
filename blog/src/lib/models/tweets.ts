/** Represents a completed image or video attached to a tweet. */
export interface TweetMedia {
	id: string;
	publicUrl: string;
	contentType: string;
	mediaKind: 'image' | 'video';
	position: number;
}

/** Represents a public short-form post. */
export interface Tweet {
	id: string;
	authorId: string;
	body: string;
	tags: string[];
	createdAt: string;
	media: TweetMedia[];
}

/** Represents one cursor-paginated timeline response. */
export interface TweetPage {
	tweets: Tweet[];
	nextBefore: string | null;
	hasMore: boolean;
}

/** Contains the direct-upload details for a pending attachment. */
export interface TweetUpload {
	mediaId: string;
	uploadUrl: string;
	publicUrl: string;
}
