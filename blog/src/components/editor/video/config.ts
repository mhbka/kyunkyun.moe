import { $ctx } from '@milkdown/kit/utils';

import type { PostMedia } from '../../../lib/models/media.ts';

/** Configuration used to resolve stable references in video node views. */
export interface VideoFeatureConfig {
	resolveMedia: (source: string) => PostMedia | undefined;
}

/** Slice holding the video feature's media resolver. */
export const videoConfig = $ctx<VideoFeatureConfig, 'videoFeatureConfig'>(
	{ resolveMedia: () => undefined },
	'videoFeatureConfig',
);
