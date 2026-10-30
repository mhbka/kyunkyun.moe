import type { PostMedia, PostMediaMap } from '../../lib/models/media.ts';

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
		/** Returns the IDs submitted with the next post save. */
		ids() {
			return [...media.keys()];
		},
	};
}
