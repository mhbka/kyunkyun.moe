const TWEET_MEDIA_ORIGIN = 'https://tweetmedia.kyunkyun.moe';
const TWEET_MEDIA_PATH = '/media/';

/** Responsive sources used by a Tweet image thumbnail. */
export interface TweetThumbnailSources {
	src: string;
	srcSet: string;
	sizes: string;
}

/** Checks whether a URL is an image stored under the Tweet media path. */
function isTweetMediaUrl(url: URL): boolean {
	return url.origin === TWEET_MEDIA_ORIGIN && url.pathname.startsWith(TWEET_MEDIA_PATH);
}

/** Builds a cropped Cloudflare URL for a Tweet image thumbnail. */
export function getTweetThumbnailUrl(publicUrl: string, size: number): string {
	const url = new URL(publicUrl);
	if (!isTweetMediaUrl(url)) return publicUrl;
	return `${url.origin}/cdn-cgi/image/width=${size},height=${size},fit=cover,format=auto,quality=75${url.pathname}${url.search}`;
}

/** Returns responsive sources for rendered Tweet thumbnails. */
export function getTweetThumbnailSources(publicUrl: string): TweetThumbnailSources {
	const small = getTweetThumbnailUrl(publicUrl, 320);
	const large = getTweetThumbnailUrl(publicUrl, 640);
	return {
		src: small,
		srcSet: `${small} 320w, ${large} 640w`,
		sizes: '(max-width: 800px) 50vw, 12rem',
	};
}

/** Builds a compressed, bounded Cloudflare URL for the Tweet image viewer. */
export function getTweetPortalUrl(publicUrl: string): string {
	const url = new URL(publicUrl);
	if (!isTweetMediaUrl(url)) return publicUrl;
	return `${url.origin}/cdn-cgi/image/width=1920,height=1920,fit=scale-down,format=auto,quality=85${url.pathname}${url.search}`;
}
