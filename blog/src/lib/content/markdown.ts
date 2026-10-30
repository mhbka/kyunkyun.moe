import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

import { remarkRestoreTextDirectives } from './restore-text-directives.ts';
import { remarkBlogImages } from './remark-blog-images.ts';
import { parseGallery, parseVideo, renderGalleryHtml, renderVideoHtml, type DirectiveNode } from './gallery.ts';
import { remarkPostMedia } from './remark-post-media.ts';
import type { PostMediaMap } from '../models/media.ts';

/** Combines directly adjacent unordered lists into one continuous list. */
function mergeAdjacentUnorderedLists(html: string): string {
	return html.replace(/<\/ul>\s*<ul>/g, '');
}

/** Transforms `:::gallery` directive containers into their rendered HTML. */
function remarkGallery(media: PostMediaMap) {
	return (tree: Node) => {
		visit(tree, 'containerDirective', (node, index, parent) => {
			if (index == null || !parent) return;
			const gallery = parseGallery(node as unknown as DirectiveNode);
			if (!gallery) return;
			(parent as unknown as { children: Node[] }).children[index] = {
				type: 'html',
				value: renderGalleryHtml(gallery, media),
			} as unknown as Node;
		});
	};
}

/** Transforms `::video` leaf directives into their rendered HTML. */
function remarkVideo(media: PostMediaMap) {
	return (tree: Node) => {
		visit(tree, 'leafDirective', (node, index, parent) => {
			if (index == null || !parent) return;
			const video = parseVideo(node as unknown as DirectiveNode);
			if (!video) return;
			(parent as unknown as { children: Node[] }).children[index] = {
				type: 'html',
				value: renderVideoHtml(video, media),
			} as unknown as Node;
		});
	};
}

/** Renders Markdown to HTML with the shared Astro processor. */
export async function renderMarkdown(markdown: string, media: PostMediaMap = {}): Promise<string> {
	// Build per render so a post's media map cannot leak into another request.
	const processor = createMarkdownProcessor({
		remarkPlugins: [
			remarkDirective,
			remarkRestoreTextDirectives,
			() => remarkPostMedia(media),
			remarkBlogImages,
			() => remarkGallery(media),
			() => remarkVideo(media),
		],
	});
	const renderer = await processor;
	return mergeAdjacentUnorderedLists((await renderer.render(markdown)).code);
}
