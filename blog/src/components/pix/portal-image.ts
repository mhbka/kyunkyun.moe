import { getPixPortalUrl } from './image-url.ts';
import { finishMediaLoading, startMediaLoading } from '../../scripts/media-loading.ts';

interface PortalImageElement {
	src: string;
	dataset: { loading?: string };
	removeAttribute(name: string): void;
}

/** Clears stale pixels before loading the selected transformed portal image. */
export function startPixPortalImageLoad(image: PortalImageElement, publicUrl: string): void {
	image.removeAttribute('src');
	startMediaLoading(image);
	image.src = getPixPortalUrl(publicUrl);
}

/** Marks the current portal image as ready to display. */
export function finishPixPortalImageLoad(image: PortalImageElement): void {
	finishMediaLoading(image);
}
