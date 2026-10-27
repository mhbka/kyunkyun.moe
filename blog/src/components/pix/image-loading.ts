export interface PixImageLoading {
	loading: 'eager' | 'lazy';
	fetchPriority: 'high' | 'low';
}

/** Prioritizes the gallery's likely LCP image and defers the remaining thumbnails. */
export function getPixImageLoading(index: number): PixImageLoading {
	if (index === 0) return { loading: 'eager', fetchPriority: 'high' };
	return { loading: 'lazy', fetchPriority: 'low' };
}
