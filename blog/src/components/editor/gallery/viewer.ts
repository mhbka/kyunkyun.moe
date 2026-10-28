import { getBlogImagePortalUrl } from '../../../lib/content/blog-media.ts';
import { startMediaLoading } from '../../../scripts/media-loading.ts';

export interface GalleryThumbnailSource {
	dataset: { originalSrc?: string };
	currentSrc: string;
	src: string;
}

/** Resolves an editor thumbnail to the optimized large image shown in the viewer. */
export function getGalleryViewerImageUrl(image: GalleryThumbnailSource): string {
	return getBlogImagePortalUrl(image.dataset.originalSrc || image.currentSrc || image.src);
}

/** Opens gallery thumbnails in the post editor's shared large-image viewer. */
export function initGalleryImageViewer(form: HTMLFormElement, signal: AbortSignal) {
	const viewer = form.querySelector<HTMLDialogElement>('[data-gallery-image-viewer]');
	const viewerImage = viewer?.querySelector('img');
	if (!viewer || !viewerImage) return;

	form.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLImageElement) || !target.matches('.gallery-editor__item > img')) return;

		// Clear the previous image before loading the newly selected gallery item.
		viewerImage.removeAttribute('src');
		viewerImage.alt = target.alt;
		startMediaLoading(viewerImage);
		viewerImage.src = getGalleryViewerImageUrl(target);
		viewer.showModal();
	}, { signal });

	viewer.addEventListener('keydown', (event) => {
		if (event.key !== 'Escape') return;
		event.preventDefault();
		viewer.close();
	}, { signal });

	viewer.addEventListener('click', (event) => {
		if (event.target === viewer || event.target === viewerImage) viewer.close();
	}, { signal });
}
