import type { Editor } from '@milkdown/kit/core';

import { galleryConfig, type GalleryFeatureConfig } from './config.ts';
import { gallerySchema } from './schema.ts';
import { galleryRemarkPlugin } from './remark.ts';
import { galleryNodeView } from './node-view.ts';
import { galleryInputRule, insertGalleryCommand } from './command.ts';

export { gallerySchema } from './schema.ts';
export { insertGalleryCommand } from './command.ts';
export { galleryIcon } from './icon.ts';
export type { GalleryFeatureConfig } from './config.ts';

/** Configures the gallery node, its editor view, and its insertion controls. */
export function galleryFeature(editor: Editor, config?: GalleryFeatureConfig) {
	editor
		.config((ctx) => {
			ctx.set(galleryConfig.key, config ?? { onUpload: async () => '' });
		})
		.use(galleryRemarkPlugin)
		.use(gallerySchema)
		.use(galleryNodeView)
		.use(galleryInputRule)
		.use(insertGalleryCommand)
		.use(galleryConfig);
}
