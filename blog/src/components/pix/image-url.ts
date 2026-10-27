const PIX_THUMBNAIL_SIZES = '(max-width: 800px) 50vw, 20vw';

export interface PixThumbnailSources {
	src: string;
	srcSet: string;
	sizes: string;
}

/** Builds a same-origin Cloudflare URL for a cropped Pix thumbnail. */
export function getPixThumbnailUrl(publicUrl: string, size: number): string {
	const url = new URL(publicUrl);
	url.pathname = `/cdn-cgi/image/width=${size},height=${size},fit=cover,format=auto,quality=75${url.pathname}`;
	return url.toString();
}

/** Returns the responsive sources shared by rendered and appended thumbnails. */
export function getPixThumbnailSources(publicUrl: string): PixThumbnailSources {
	const small = getPixThumbnailUrl(publicUrl, 320);
	const large = getPixThumbnailUrl(publicUrl, 640);
	return {
		src: small,
		srcSet: `${small} 320w, ${large} 640w`,
		sizes: PIX_THUMBNAIL_SIZES,
	};
}

/** Builds a non-cropped portal image URL without upscaling small originals. */
export function getPixPortalUrl(publicUrl: string): string {
	const url = new URL(publicUrl);
	url.pathname = `/cdn-cgi/image/width=1920,height=1920,fit=scale-down,format=auto,quality=85${url.pathname}`;
	return url.toString();
}
