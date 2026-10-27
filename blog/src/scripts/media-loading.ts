/** The small image surface shared by loading-state helpers and unit tests. */
export interface LoadableImage {
	complete: boolean;
	dataset: { loading?: string };
}

/** Marks an image as loading so the shared placeholder becomes visible. */
export function startMediaLoading(image: Pick<LoadableImage, 'dataset'>) {
	image.dataset.loading = '';
}

/** Clears an image's loading placeholder after either success or failure. */
export function finishMediaLoading(image: Pick<LoadableImage, 'dataset'>) {
	delete image.dataset.loading;
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
