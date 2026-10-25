import { $nodeSchema } from '@milkdown/kit/utils';

import { galleryToDirectiveNode, parseGallery, type GalleryImage } from '../../../lib/gallery.ts';

/** ProseMirror + markdown schema for the in-post gallery block node. */
export const gallerySchema = $nodeSchema('gallery', () => ({
	inline: false,
	group: 'block',
	selectable: true,
	draggable: true,
	isolating: true,
	atom: true,
	marks: '',
	attrs: {
		caption: { default: '' },
		images: { default: [] as GalleryImage[] },
	},
	parseMarkdown: {
		match: (node) => node.type === 'containerDirective' && node.name === 'gallery',
		runner: (state, node, type) => {
			const gallery = parseGallery(node);
			if (!gallery) return;
			state.addNode(type, {
				caption: gallery.caption ?? '',
				images: gallery.images,
			});
		},
	},
	toMarkdown: {
		match: (node) => node.type.name === 'gallery',
		runner: (state, node) => {
			const directive = galleryToDirectiveNode({
				caption: node.attrs.caption as string,
				images: node.attrs.images as GalleryImage[],
			});
			state.openNode('containerDirective', undefined, {
				name: directive.name,
				attributes: directive.attributes,
			});
			for (const child of directive.children ?? []) {
				state.addNode('leafDirective', undefined, undefined, {
					name: child.name,
					attributes: child.attributes,
				});
			}
			state.closeNode();
		},
	},
}));
