import { $ctx } from '@milkdown/kit/utils';
import type { PostMedia } from '../../../lib/models/media.ts';

/** Configuration for the gallery editor feature. */
export interface GalleryFeatureConfig {
	/** Uploads one file and resolves to its stable Markdown reference. */
	onUpload: (file: File) => Promise<string>;
	/** Resolves a stable Markdown source to its editor display metadata. */
	resolveMedia: (source: string) => PostMedia | undefined;
}

/** Slice holding the gallery feature configuration. */
export const galleryConfig = $ctx<GalleryFeatureConfig, 'galleryFeatureConfig'>(
	{ onUpload: async () => '', resolveMedia: () => undefined },
	'galleryFeatureConfig',
);
