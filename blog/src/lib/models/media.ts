/** Identifies how a blog media item is rendered. */
export type PostMediaKind = 'image' | 'video';

/** Describes the upload or processing state of blog media. */
export type PostMediaStatus = 'pending' | 'processing' | 'ready' | 'failed';

/** Represents one post-owned media item returned by the backend. */
export interface PostMedia {
	id: string;
	postId: string;
	mediaKind: PostMediaKind;
	status: PostMediaStatus;
	publicUrl: string | null;
	videoPosterId: string | null;
	posterUrl: string | null;
	contentType: string;
	width: number | null;
	height: number | null;
	createdAt: string;
}

/** Provides constant-time media lookup by its stable ID. */
export type PostMediaMap = Record<string, PostMedia>;
