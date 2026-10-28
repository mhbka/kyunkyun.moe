import type { GalleryImage } from '../../../lib/content/gallery.ts';

export interface GalleryNodeAttrs {
	caption: string;
	images: GalleryImage[];
}

/** Serializes gallery attributes for ProseMirror clipboard and node-drag HTML. */
export function serializeGalleryNodeAttrs(attrs: GalleryNodeAttrs): string {
	return JSON.stringify(attrs);
}

/** Restores validated gallery attributes from ProseMirror clipboard HTML. */
export function parseGalleryNodeAttrs(value: string | null): GalleryNodeAttrs | false {
	if (!value) return false;
	try {
		const attrs = JSON.parse(value) as Partial<GalleryNodeAttrs>;
		if (typeof attrs.caption !== 'string' || !Array.isArray(attrs.images)) return false;
		if (attrs.images.some((image) => !image || typeof image.src !== 'string')) return false;
		return { caption: attrs.caption, images: attrs.images };
	} catch {
		return false;
	}
}
