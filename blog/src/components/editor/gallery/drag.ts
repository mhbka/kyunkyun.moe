export const galleryItemDragType = 'application/x-gallery-editor-item';

/** Distinguishes an internal media reorder from ProseMirror's whole-node drag. */
export function isGalleryItemDrag(activeIndex: number | null, types: readonly string[] = []): boolean {
	return activeIndex !== null || types.includes(galleryItemDragType);
}
