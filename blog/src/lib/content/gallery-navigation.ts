/** Wraps a slide index so navigation loops around both ends of a gallery. */
export function wrapGalleryIndex(index: number, count: number): number {
	if (count <= 0) return 0;
	return ((index % count) + count) % count;
}

/** Lists the slides a viewer can reach in one step, so they can be fetched ahead of time. */
export function getGalleryNeighbourIndexes(index: number, count: number): number[] {
	if (count < 2) return [];
	const neighbours = new Set([wrapGalleryIndex(index - 1, count), wrapGalleryIndex(index + 1, count)]);
	neighbours.delete(wrapGalleryIndex(index, count));
	return [...neighbours];
}
