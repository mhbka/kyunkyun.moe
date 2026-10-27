import { getPixPortalUrl } from './image-url.ts';

interface PortalImageElement {
	src: string;
	dataset: { loading?: string };
	removeAttribute(name: string): void;
}

/** Clears stale pixels before loading the selected transformed portal image. */
export function startPixPortalImageLoad(image: PortalImageElement, publicUrl: string): void {
	image.removeAttribute('src');
	image.dataset.loading = '';
	image.src = getPixPortalUrl(publicUrl);
}

/** Marks the current portal image as ready to display. */
export function finishPixPortalImageLoad(image: PortalImageElement): void {
	delete image.dataset.loading;
}
