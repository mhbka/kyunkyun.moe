import { $ctx } from '@milkdown/kit/utils';

/** Configuration for the gallery editor feature. */
export interface GalleryFeatureConfig {
	/** Uploads one image file and resolves to its public URL. */
	onUpload: (file: File) => Promise<string>;
}

/** Slice holding the gallery feature configuration. */
export const galleryConfig = $ctx<GalleryFeatureConfig, 'galleryFeatureConfig'>(
	{ onUpload: async () => '' },
	'galleryFeatureConfig',
);
