/**
 * Pure helpers for in-post galleries. These are shared by the published Markdown
 * renderer and the Milkdown editor, so they stay free of DOM, remark, and
 * ProseMirror dependencies to remain easily unit-testable.
 */

import { getBlogImagePortalUrl, getBlogImageSources } from './blog-media.ts';
import type { PostMedia, PostMediaMap } from '../models/media.ts';
import { isMediaReference, resolveMediaReference } from './media-reference.ts';

/** A single image within a gallery. */
export interface GalleryImage {
	src: string;
	caption?: string;
	alt?: string;
}

/** A gallery: an optional shared caption plus an ordered list of images. */
export interface Gallery {
	caption?: string;
	images: GalleryImage[];
}

/** A minimal structural view of a remark-directive node (mdast). */
export interface DirectiveNode {
	type?: string;
	name?: string;
	attributes?: Record<string, string>;
	children?: DirectiveNode[];
}

/** A `pic` leaf directive with required fields. */
export interface PicDirectiveNode {
	type: 'leafDirective';
	name: 'pic';
	attributes: Record<string, string>;
}

/** A `gallery` container directive with required fields. */
export interface GalleryDirectiveNode {
	type: 'containerDirective';
	name: 'gallery';
	attributes: Record<string, string>;
	children: PicDirectiveNode[];
}

/** Escapes text for safe insertion into HTML attribute values and content. */
export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Whether a media URL points at a video, judged by its file extension. */
export function isVideoSrc(src: string): boolean {
	return /\.(mp4|webm)$/i.test(src.split(/[?#]/)[0]);
}

/** Builds intrinsic size attributes when both stored dimensions are usable. */
function renderDimensions(media?: PostMedia): string {
	if (!media?.width || !media.height || media.width <= 0 || media.height <= 0) return '';
	return ` width="${media.width}" height="${media.height}"`;
}

/** Resolves managed media while preserving legacy URL-based content. */
function resolveRenderableMedia(
	src: string,
	media: PostMediaMap,
	expectedKind?: PostMedia['mediaKind'],
): { src: string; item?: PostMedia } | null {
	if (!isMediaReference(src)) return { src };
	const item = resolveMediaReference(src, media);
	if (!item || item.status !== 'ready' || !item.publicUrl || (expectedKind && item.mediaKind !== expectedKind)) return null;
	return { src: item.publicUrl, item };
}

/** Renders the `<img>` or `<video>` element for one media URL or stable reference. */
export function renderMediaHtml(
	src: string,
	options: { alt?: string; lazy?: boolean; media?: PostMediaMap; expectedKind?: PostMedia['mediaKind'] } = {},
): string {
	const resolved = resolveRenderableMedia(src, options.media ?? {}, options.expectedKind);
	if (!resolved) return '<span class="media-unavailable">media unavailable</span>';

	const url = escapeHtml(resolved.src);
	const dimensions = renderDimensions(resolved.item);
	const isVideo = resolved.item?.mediaKind === 'video' || (!resolved.item && isVideoSrc(resolved.src));
	if (isVideo) {
		const poster = resolved.item?.posterUrl ? ` poster="${escapeHtml(resolved.item.posterUrl)}"` : '';
		return `<video src="${url}"${poster}${dimensions} controls playsinline preload="metadata"></video>`;
	}
	const alt = options.alt ? ` alt="${escapeHtml(options.alt)}"` : '';
	const sources = getBlogImageSources(resolved.src);
	if (!sources) return `<img src="${url}"${dimensions}${alt}${options.lazy ? ' loading="lazy"' : ''}>`;
	const loading = options.lazy ? ' loading="lazy"' : '';
	return `<img class="media-loadable" data-loading src="${escapeHtml(sources.src)}" srcset="${escapeHtml(sources.srcSet)}" sizes="${escapeHtml(sources.sizes)}" data-original-src="${url}" data-prefetch-image="${escapeHtml(getBlogImagePortalUrl(sources.originalSrc))}" decoding="async"${dimensions}${alt}${loading}>`;
}

/** A standalone video: a `::video{src caption}` leaf directive. */
export interface Video {
	src: string;
	caption?: string;
}

/** A `video` leaf directive with required fields. */
export interface VideoDirectiveNode {
	type: 'leafDirective';
	name: 'video';
	attributes: Record<string, string>;
}

/** Parses a `video` leaf directive. Returns `null` for other nodes or a missing `src`. */
export function parseVideo(node: DirectiveNode): Video | null {
	if (node.type !== 'leafDirective' || node.name !== 'video') return null;
	const src = node.attributes?.src?.trim();
	if (!src) return null;
	const caption = node.attributes?.caption?.trim();
	return caption ? { src, caption } : { src };
}

/** Builds the `video` leaf directive node; the inverse of {@link parseVideo}. */
export function videoToDirectiveNode(video: Video): VideoDirectiveNode {
	const attributes: Record<string, string> = { src: video.src };
	if (video.caption) attributes.caption = video.caption;
	return { type: 'leafDirective', name: 'video', attributes };
}

/** Renders a standalone video to its published HTML markup. */
export function renderVideoHtml(video: Video, media: PostMediaMap = {}): string {
	const caption = video.caption
		? `<figcaption class="video__caption">${escapeHtml(video.caption)}</figcaption>`
		: '';
	return `<figure class="video">${renderMediaHtml(video.src, { media, expectedKind: 'video' })}${caption}</figure>`;
}

/** Reads the attributes that describe one `::pic{...}` leaf directive. */
function readImage(node: DirectiveNode): GalleryImage | null {
	const attrs = node.attributes ?? {};
	const src = attrs.src?.trim();
	if (!src) return null;

	const image: GalleryImage = { src };
	if (attrs.caption?.trim()) image.caption = attrs.caption.trim();
	if (attrs.alt?.trim()) image.alt = attrs.alt.trim();
	return image;
}

/**
 * Parses a directive container node into a {@link Gallery}. Returns `null` when
 * the node is not a `gallery` container, and drops `pic` children that lack a
 * valid `src`.
 */
export function parseGallery(node: DirectiveNode): Gallery | null {
	if (node.type !== 'containerDirective' || node.name !== 'gallery') return null;

	const caption = node.attributes?.caption?.trim();
	const images = (node.children ?? [])
		.filter((child) => child.type === 'leafDirective' && child.name === 'pic')
		.map(readImage)
		.filter((image): image is GalleryImage => image !== null);

	return { caption: caption || undefined, images };
}

/**
 * Builds the directive container node (and its `pic` leaf-directive children)
 * that represents a gallery. This is the inverse of {@link parseGallery} and is
 * used by the editor's markdown serializer.
 */
export function galleryToDirectiveNode(gallery: Gallery): GalleryDirectiveNode {
	return {
		type: 'containerDirective',
		name: 'gallery',
		attributes: gallery.caption ? { caption: gallery.caption } : {},
		children: gallery.images.map((image) => {
			const attributes: Record<string, string> = { src: image.src };
			if (image.caption) attributes.caption = image.caption;
			if (image.alt) attributes.alt = image.alt;
			return { type: 'leafDirective', name: 'pic', attributes };
		}),
	};
}

/** Chevron icons for the gallery's previous/next controls. */
const galleryPrevIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>';
const galleryNextIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

/** Renders a gallery to its published HTML markup (one image at a time with arrows). */
export function renderGalleryHtml(gallery: Gallery, media: PostMediaMap = {}): string {
	const captionHtml = gallery.caption
		? `<figcaption class="gallery__caption">${escapeHtml(gallery.caption)}</figcaption>`
		: '';
	const hasMultiple = gallery.images.length > 1;
	const nav = hasMultiple
		? `<button class="gallery__nav gallery__nav--prev" type="button" data-gallery-prev aria-label="Previous image">${galleryPrevIcon}</button>` +
			`<button class="gallery__nav gallery__nav--next" type="button" data-gallery-next aria-label="Next image">${galleryNextIcon}</button>`
		: '';

	const slides = gallery.images
		.map((image, index) => {
			const caption = image.caption
				? `<figcaption class="gallery__item-caption">${escapeHtml(image.caption)}</figcaption>`
				: '';
			const hidden = index === 0 ? '' : ' hidden';
			const initialNav = index === 0 ? nav : '';
			return `<figure class="gallery__item"${hidden}><div class="gallery__media">${renderMediaHtml(image.src, { alt: image.alt, lazy: index > 0, media })}${initialNav}</div>${caption}</figure>`;
		})
		.join('');

	const counter = hasMultiple
		? `<p class="gallery__counter" aria-live="polite"><span data-gallery-current>1</span> / <span data-gallery-total>${gallery.images.length}</span></p>`
		: '';

	return `<figure class="gallery" data-gallery>${captionHtml}<div class="gallery__viewport">${slides}</div>${counter}</figure>`;
}

/** Returns a copy of `images` with `image` appended. */
export function addImage(images: GalleryImage[], image: GalleryImage): GalleryImage[] {
	return [...images, image];
}

/** Returns a copy of `images` without the entry at `index`. */
export function removeImage(images: GalleryImage[], index: number): GalleryImage[] {
	return images.filter((_, i) => i !== index);
}

/**
 * Returns a copy of `images` with the entry at `from` moved to `to`, clamping
 * `to` to a valid position.
 */
export function moveImage(images: GalleryImage[], from: number, to: number): GalleryImage[] {
	if (from === to || from < 0 || from >= images.length) return [...images];
	const next = [...images];
	const [moved] = next.splice(from, 1);
	next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
	return next;
}
