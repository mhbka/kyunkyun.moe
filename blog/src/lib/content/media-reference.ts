import type { PostMedia, PostMediaMap } from '../models/media.ts';

const MEDIA_REFERENCE_PATTERN = /^media:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Builds the stable Markdown reference for one managed post-media item. */
export function createMediaReference(mediaId: string): string {
	return `media:${mediaId}`;
}

/** Returns the media ID stored in a valid managed reference. */
export function parseMediaReference(value: string): string | null {
	return MEDIA_REFERENCE_PATTERN.exec(value.trim())?.[1]?.toLowerCase() ?? null;
}

/** Resolves a managed reference, leaving ordinary URLs outside this lookup. */
export function resolveMediaReference(value: string, media: PostMediaMap): PostMedia | undefined {
	const mediaId = parseMediaReference(value);
	return mediaId ? media[mediaId] : undefined;
}

/** Returns the display URL for a managed reference or the original legacy URL. */
export function resolveMediaDisplayUrl(value: string, media: PostMediaMap): string {
	const mediaId = parseMediaReference(value);
	if (!mediaId) return value;
	return media[mediaId]?.publicUrl ?? '';
}

/** Checks whether a value uses the managed-reference scheme, including malformed IDs. */
export function isMediaReference(value: string): boolean {
	return value.trim().toLowerCase().startsWith('media:');
}
