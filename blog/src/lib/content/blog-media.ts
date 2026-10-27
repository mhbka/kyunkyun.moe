const BLOG_MEDIA_ORIGIN = 'https://blogmedia.kyunkyun.moe';
const BLOG_IMAGE_PATH = '/post-images/';
const BLOG_IMAGE_SIZES = '(max-width: 800px) 100vw, 70vw';

export interface BlogImageSources {
	originalSrc: string;
	src: string;
	srcSet: string;
	sizes: string;
}

/** Checks whether a URL belongs to the blog's transformable R2 image path. */
export function isBlogImageUrl(src: string): boolean {
	try {
		const url = new URL(src);
		return url.origin === BLOG_MEDIA_ORIGIN && url.pathname.startsWith(BLOG_IMAGE_PATH);
	} catch {
		return false;
	}
}

/** Builds a non-cropped Cloudflare image URL for one responsive width. */
export function getBlogImageUrl(src: string, width: number, quality = 80): string {
	if (!isBlogImageUrl(src)) return src;
	const url = new URL(src);
	url.pathname = `/cdn-cgi/image/width=${width},fit=scale-down,format=auto,quality=${quality}${url.pathname}`;
	return url.toString();
}

/** Returns responsive sources for a blog image while retaining its original URL. */
export function getBlogImageSources(src: string): BlogImageSources | null {
	if (!isBlogImageUrl(src)) return null;
	const small = getBlogImageUrl(src, 640);
	const medium = getBlogImageUrl(src, 1280);
	const large = getBlogImageUrl(src, 1920);
	return {
		originalSrc: src,
		src: small,
		srcSet: `${small} 640w, ${medium} 1280w, ${large} 1920w`,
		sizes: BLOG_IMAGE_SIZES,
	};
}

/** Builds a large portal image URL without cropping or upscaling. */
export function getBlogImagePortalUrl(src: string): string {
	return getBlogImageUrl(src, 1920, 85);
}
