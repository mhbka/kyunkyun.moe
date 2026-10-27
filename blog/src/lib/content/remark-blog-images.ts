import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

import { getBlogImagePortalUrl, getBlogImageSources } from './blog-media.ts';

interface MarkdownImageNode extends Node {
	type: 'image';
	url: string;
	data?: {
		hProperties?: Record<string, string>;
	};
}

/** Adds responsive Cloudflare sources to Markdown images from blog media storage. */
export function remarkBlogImages() {
	return (tree: Node) => {
		visit(tree, 'image', (node) => {
			const image = node as MarkdownImageNode;
			const sources = getBlogImageSources(image.url);
			if (!sources) return;
			image.url = sources.src;
			image.data ??= {};
			image.data.hProperties = {
				...(image.data.hProperties ?? {}),
				className: 'media-loadable',
				srcset: sources.srcSet,
				sizes: sources.sizes,
				loading: 'lazy',
				decoding: 'async',
				'data-original-src': sources.originalSrc,
				'data-loading': '',
				'data-prefetch-image': getBlogImagePortalUrl(sources.originalSrc),
			};
		});
	};
}
