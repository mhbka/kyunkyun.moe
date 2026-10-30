import type { PostMedia, PostMediaMap } from '../../lib/models/media.ts';
import { parseMediaReference } from '../../lib/content/media-reference.ts';

/** Tracks the media collection independently from the editor's Markdown. */
export function createEditorMediaRegistry(initialMedia: PostMediaMap = {}) {
	const media = new Map(Object.entries(initialMedia));

	return {
		/** Adds or refreshes one uploaded media item. */
		add(item: PostMedia) {
			media.set(item.id, item);
		},
		/** Finds one tracked item by its stable ID. */
		get(id: string) {
			return media.get(id);
		},
		/** Resolves the media item represented by a Markdown source value. */
		resolve(source: string) {
			const id = parseMediaReference(source);
			return id ? media.get(id) : undefined;
		},
		/** Resolves a managed source for display while preserving ordinary URLs. */
		displayUrl(source: string, expectedKind?: PostMedia['mediaKind']) {
			const id = parseMediaReference(source);
			if (!id) return source;
			const item = media.get(id);
			if (!item || (expectedKind && item.mediaKind !== expectedKind)) return '';
			return item.publicUrl ?? '';
		},
		/** Returns the IDs submitted with the next post save. */
		ids() {
			return [...media.keys()];
		},
	};
}
