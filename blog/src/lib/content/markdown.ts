import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import type { Node } from 'unist';

import { remarkRestoreTextDirectives } from './restore-text-directives.ts';
import { parseGallery, parseVideo, renderGalleryHtml, renderVideoHtml, type DirectiveNode } from './gallery.ts';

let processor: ReturnType<typeof createMarkdownProcessor> | undefined;

/** Combines directly adjacent unordered lists into one continuous list. */
function mergeAdjacentUnorderedLists(html: string): string {
	return html.replace(/<\/ul>\s*<ul>/g, '');
}

/** Transforms `:::gallery` directive containers into their rendered HTML. */
function remarkGallery() {
	return (tree: Node) => {
		visit(tree, 'containerDirective', (node, index, parent) => {
			if (index == null || !parent) return;
			const gallery = parseGallery(node as unknown as DirectiveNode);
			if (!gallery) return;
			(parent as unknown as { children: Node[] }).children[index] = {
				type: 'html',
				value: renderGalleryHtml(gallery),
			} as unknown as Node;
		});
	};
}

/** Transforms `::video` leaf directives into their rendered HTML. */
function remarkVideo() {
	return (tree: Node) => {
		visit(tree, 'leafDirective', (node, index, parent) => {
			if (index == null || !parent) return;
			const video = parseVideo(node as unknown as DirectiveNode);
			if (!video) return;
			(parent as unknown as { children: Node[] }).children[index] = {
				type: 'html',
				value: renderVideoHtml(video),
			} as unknown as Node;
		});
	};
}

/** Renders Markdown to HTML with the shared Astro processor. */
export async function renderMarkdown(markdown: string): Promise<string> {
	processor ??= createMarkdownProcessor({
		remarkPlugins: [remarkDirective, remarkRestoreTextDirectives, remarkGallery, remarkVideo],
	});
	const renderer = await processor;
	return mergeAdjacentUnorderedLists((await renderer.render(markdown)).code);
}
