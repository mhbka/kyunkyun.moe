/** The small image surface shared by loading-state helpers and unit tests. */
export interface LoadableImage {
	complete: boolean;
	dataset: { loading?: string; placeholderSized?: string };
}

/** Stored pixel dimensions of the media a placeholder stands in for. */
export interface MediaPlaceholderSize {
	width: number;
	height: number;
}

type PlaceholderImage = Pick<LoadableImage, 'dataset'> & { style?: Pick<CSSStyleDeclaration, 'setProperty' | 'removeProperty'> };

/** Reads the stored dimensions an image was rendered with, if it has valid ones. */
export function getMediaPlaceholderSize(image: Pick<HTMLImageElement, 'getAttribute'>): MediaPlaceholderSize | undefined {
	const width = Number(image.getAttribute('width'));
	const height = Number(image.getAttribute('height'));
	return width > 0 && height > 0 ? { width, height } : undefined;
}

/** Marks an image as loading so the shared placeholder becomes visible, at its known size when given. */
export function startMediaLoading(image: PlaceholderImage, size?: MediaPlaceholderSize) {
	image.dataset.loading = '';
	if (!size || !image.style) return;
	image.dataset.placeholderSized = '';
	image.style.setProperty('--media-w', String(size.width));
	image.style.setProperty('--media-h', String(size.height));
}

/** Clears an image's loading placeholder after either success or failure. */
export function finishMediaLoading(image: PlaceholderImage) {
	delete image.dataset.loading;
	if (image.dataset.placeholderSized === undefined) return;
	delete image.dataset.placeholderSized;
	image.style?.removeProperty('--media-w');
	image.style?.removeProperty('--media-h');
}

/** Clears stale server-rendered state when an image finished before scripts ran. */
export function syncMediaLoading(image: LoadableImage) {
	if (image.complete) finishMediaLoading(image);
}

/** Registers the shared image load/error handling once per page realm. */
export function initMediaLoading() {
	const finishEvent = (event: Event) => {
		if (event.target instanceof HTMLImageElement) finishMediaLoading(event.target);
	};
	const syncImages = () => {
		document.querySelectorAll<HTMLImageElement>('img.media-loadable[data-loading]').forEach(syncMediaLoading);
	};

	document.addEventListener('load', finishEvent, true);
	document.addEventListener('error', finishEvent, true);
	document.addEventListener('astro:page-load', syncImages);
	syncImages();
}
