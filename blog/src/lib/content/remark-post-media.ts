import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

import type { PostMediaMap } from '../models/media.ts';
import { isMediaReference, resolveMediaReference } from './media-reference.ts';

interface MarkdownImageNode extends Node {
	type: 'image';
	url: string;
	data?: {
		hProperties?: Record<string, string | number>;
	};
}

interface ParentNode extends Node {
	children: Node[];
}

/** Resolves managed Markdown images before ordinary responsive-image handling. */
export function remarkPostMedia(media: PostMediaMap) {
	return (tree: Node) => {
		visit(tree, 'image', (node, index, parent) => {
			const image = node as MarkdownImageNode;
			if (!isMediaReference(image.url)) return;

			const item = resolveMediaReference(image.url, media);
			if (!item || item.mediaKind !== 'image' || item.status !== 'ready' || !item.publicUrl) {
				if (index == null || !parent) return;
				(parent as ParentNode).children[index] = {
					type: 'html',
					value: '<span class="media-unavailable">media unavailable</span>',
				} as Node;
				return;
			}

			image.url = item.publicUrl;
			if (!item.width || !item.height) return;
			image.data ??= {};
			image.data.hProperties = {
				...(image.data.hProperties ?? {}),
				width: item.width,
				height: item.height,
			};
		});
	};
}
