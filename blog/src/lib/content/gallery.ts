/**
 * Pure helpers for in-post galleries. These are shared by the published Markdown
 * renderer and the Milkdown editor, so they stay free of DOM, remark, and
 * ProseMirror dependencies to remain easily unit-testable.
 */

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

/** Renders the `<img>` or `<video>` element for one media URL. */
export function renderMediaHtml(src: string, options: { alt?: string; lazy?: boolean } = {}): string {
	const url = escapeHtml(src);
	if (isVideoSrc(src)) return `<video src="${url}" controls playsinline preload="metadata"></video>`;
	const alt = options.alt ? ` alt="${escapeHtml(options.alt)}"` : '';
	return `<img src="${url}"${alt}${options.lazy ? ' loading="lazy"' : ''}>`;
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
export function renderVideoHtml(video: Video): string {
	const caption = video.caption
		? `<figcaption class="video__caption">${escapeHtml(video.caption)}</figcaption>`
		: '';
	return `<figure class="video">${renderMediaHtml(video.src)}${caption}</figure>`;
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
export function renderGalleryHtml(gallery: Gallery): string {
	const captionHtml = gallery.caption
		? `<figcaption class="gallery__caption">${escapeHtml(gallery.caption)}</figcaption>`
		: '';

	const slides = gallery.images
		.map((image, index) => {
			const caption = image.caption
				? `<figcaption class="gallery__item-caption">${escapeHtml(image.caption)}</figcaption>`
				: '';
			const hidden = index === 0 ? '' : ' hidden';
			return `<figure class="gallery__item"${hidden}>${renderMediaHtml(image.src, { alt: image.alt, lazy: index > 0 })}${caption}</figure>`;
		})
		.join('');

	const hasMultiple = gallery.images.length > 1;
	const nav = hasMultiple
		? `<button class="gallery__nav gallery__nav--prev" type="button" data-gallery-prev aria-label="Previous image">${galleryPrevIcon}</button>` +
			`<button class="gallery__nav gallery__nav--next" type="button" data-gallery-next aria-label="Next image">${galleryNextIcon}</button>`
		: '';
	const counter = hasMultiple
		? `<p class="gallery__counter" aria-live="polite"><span data-gallery-current>1</span> / <span data-gallery-total>${gallery.images.length}</span></p>`
		: '';

	return `<figure class="gallery" data-gallery>${captionHtml}<div class="gallery__viewport">${slides}${nav}</div>${counter}</figure>`;
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
