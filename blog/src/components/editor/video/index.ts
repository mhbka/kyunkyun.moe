import type { Editor } from '@milkdown/kit/core';
import type { NodeViewConstructor } from '@milkdown/kit/prose/view';
import { $command, $nodeSchema, $view } from '@milkdown/kit/utils';

import { parseVideo, videoToDirectiveNode } from '../../../lib/content/gallery.ts';
import { isMediaReference } from '../../../lib/content/media-reference.ts';
import { videoConfig, type VideoFeatureConfig } from './config.ts';

/** ProseMirror + markdown schema for a standalone video block, stored as `::video{src caption}`. */
export const videoSchema = $nodeSchema('video', () => ({
	inline: false,
	group: 'block',
	selectable: true,
	draggable: true,
	isolating: true,
	atom: true,
	marks: '',
	attrs: {
		src: { default: '' },
		caption: { default: '' },
	},
	parseMarkdown: {
		match: (node) => node.type === 'leafDirective' && node.name === 'video',
		runner: (state, node, type) => {
			const video = parseVideo(node);
			if (!video) return;
			state.addNode(type, { src: video.src, caption: video.caption ?? '' });
		},
	},
	toMarkdown: {
		match: (node) => node.type.name === 'video',
		runner: (state, node) => {
			const directive = videoToDirectiveNode({
				src: node.attrs.src as string,
				caption: node.attrs.caption as string,
			});
			state.addNode('leafDirective', undefined, undefined, {
				name: directive.name,
				attributes: directive.attributes,
			});
		},
	},
}));

/** Inserts a video block for an uploaded reference or legacy URL. */
export const insertVideoCommand = $command('InsertVideo', (ctx) => (src?: string) => (state, dispatch) => {
	if (!src) return false;
	const node = videoSchema.type(ctx).create({ src, caption: '' });
	if (dispatch) dispatch(state.tr.replaceSelectionWith(node).scrollIntoView());
	return true;
});

/** Builds the editor UI for a video node: a player, a caption field, and a remove button. */
const videoNodeView = $view(videoSchema.node, (ctx): NodeViewConstructor => (initialNode, view, getPos) => {
	const config = ctx.get(videoConfig.key);
	const dom = document.createElement('div');
	dom.className = 'video-editor';
	dom.contentEditable = 'false';

	const player = document.createElement('video');
	player.controls = true;
	player.preload = 'metadata';
	player.playsInline = true;
	const unavailable = document.createElement('span');
	unavailable.className = 'media-unavailable';
	unavailable.textContent = 'media unavailable';
	unavailable.hidden = true;

	/** Applies the resolved player URL and stored presentation metadata. */
	function updatePlayer(source: string) {
		const media = config.resolveMedia(source);
		const displaySrc = media?.mediaKind === 'video'
			? media.publicUrl ?? ''
			: isMediaReference(source) ? '' : source;
		player.hidden = !displaySrc;
		unavailable.hidden = Boolean(displaySrc);
		if (displaySrc) player.src = displaySrc;
		else player.removeAttribute('src');
		if (media?.posterUrl) player.poster = media.posterUrl;
		else player.removeAttribute('poster');
		if (media?.width && media.height) {
			player.width = media.width;
			player.height = media.height;
		} else {
			player.removeAttribute('width');
			player.removeAttribute('height');
		}
	}

	updatePlayer(initialNode.attrs.src as string);

	const footer = document.createElement('div');
	footer.className = 'video-editor__footer';

	const caption = document.createElement('input');
	caption.className = 'ui-input video-editor__caption';
	caption.type = 'text';
	caption.placeholder = 'video caption';
	caption.value = (initialNode.attrs.caption ?? '') as string;
	caption.addEventListener('input', () => {
		const pos = getPos();
		if (pos == null || !view.editable) return;
		view.dispatch(view.state.tr.setNodeAttribute(pos, 'caption', caption.value));
	});

	const remove = document.createElement('button');
	remove.className = 'ui-button';
	remove.type = 'button';
	remove.setAttribute('aria-label', 'remove video');
	remove.textContent = '×';
	remove.addEventListener('click', () => {
		const pos = getPos();
		if (pos == null || !view.editable) return;
		view.dispatch(view.state.tr.deleteRange(pos, pos + initialNode.nodeSize));
	});

	footer.append(caption, remove);
	dom.append(player, unavailable, footer);

	return {
		dom,
		update: (node) => {
			if (node.type !== videoSchema.type(ctx)) return false;
			updatePlayer(node.attrs.src as string);
			if (document.activeElement !== caption) caption.value = (node.attrs.caption ?? '') as string;
			return true;
		},
		stopEvent: (event) =>
			event.target instanceof HTMLInputElement
			|| event.target instanceof HTMLButtonElement
			|| event.target instanceof HTMLVideoElement,
		destroy: () => dom.remove(),
	};
});

/** Registers the video block, its editor view, and its insert command. Requires the gallery feature, which registers the directive remark plugins. */
export function videoFeature(editor: Editor, config?: VideoFeatureConfig) {
	editor
		.config((ctx) => ctx.set(videoConfig.key, config ?? { resolveMedia: () => undefined }))
		.use(videoSchema)
		.use(videoNodeView)
		.use(insertVideoCommand)
		.use(videoConfig);
}

export { videoIcon } from './icon.ts';
