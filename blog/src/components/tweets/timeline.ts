import { blogApi } from '../../lib/api.ts';
import { initFileDropzone } from '../ui/file-dropzone.ts';
import { createTweetPreviews } from './previews.ts';

/** Defines the maximum number of attachments accepted by one tweet. */
export const MAX_MEDIA_COUNT = 5;
/** Defines the browser-side attachment size limit. */
export const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

/** Wires tweet composition, attachment viewing, and author deletion. */
export function initTweetTimeline(timeline: HTMLElement) {
	const composer = timeline.querySelector<HTMLFormElement>('[data-tweet-composer]');
	const body = timeline.querySelector<HTMLTextAreaElement>('[data-tweet-body]');
	const dropzone = timeline.querySelector<HTMLElement>('[data-file-dropzone]');
	const tags = timeline.querySelector<HTMLInputElement>('[data-tag-value]');
	const count = timeline.querySelector<HTMLElement>('[data-tweet-count]');
	const previews = timeline.querySelector<HTMLElement>('[data-tweet-previews]');
	const status = timeline.querySelector<HTMLElement>('[data-tweet-status]');
	const submit = timeline.querySelector<HTMLButtonElement>('[data-tweet-submit]');
	const viewer = timeline.querySelector<HTMLDialogElement>('[data-tweet-viewer]');
	const viewerImage = timeline.querySelector<HTMLImageElement>('[data-tweet-viewer-image]');
	const viewerVideo = timeline.querySelector<HTMLVideoElement>('[data-tweet-viewer-video]');
	let selectedFiles: File[] = [];

	const attachmentPreviews = previews ? createTweetPreviews(previews) : undefined;
	// Releases preview URLs when navigation removes the timeline.
	window.addEventListener('pagehide', event => {
		if (!event.persisted) attachmentPreviews?.clear();
	});
	document.addEventListener('astro:before-swap', () => attachmentPreviews?.clear(), { once: true });

	body?.addEventListener('input', () => { if (count) count.textContent = `${body.value.length}/500`; });
	if (dropzone) initFileDropzone(dropzone, (newFiles) => {
		selectedFiles = [...newFiles];
		attachmentPreviews?.render(selectedFiles);
	});

	timeline.addEventListener('click', async (event) => {
		const deleteButton = (event.target as Element).closest<HTMLButtonElement>('[data-tweet-delete]');
		if (deleteButton) {
			const tweet = deleteButton.closest<HTMLElement>('[data-tweet-id]');
			const token = timeline.dataset.token;
			if (!tweet?.dataset.tweetId || !token || !window.confirm('delete this tweet?')) return;
			deleteButton.disabled = true;
			try { await blogApi.deleteTweet(tweet.dataset.tweetId, token); tweet.remove(); }
			catch { deleteButton.disabled = false; window.alert('could not delete tweet.'); }
			return;
		}
		const thumbnail = (event.target as Element).closest<HTMLElement>('[data-media-url]');
		if (!thumbnail || !viewer || !viewerImage || !viewerVideo) return;
		const isVideo = thumbnail.dataset.mediaKind === 'video';
		viewer.classList.toggle('is-video', isVideo);
		viewer.classList.toggle('is-image', !isVideo);
		if (isVideo) { viewerVideo.src = thumbnail.dataset.mediaUrl ?? ''; viewerImage.removeAttribute('src'); }
		else { viewerImage.src = thumbnail.dataset.mediaUrl ?? ''; viewerVideo.removeAttribute('src'); }
		viewer.showModal();
	});
	viewer?.addEventListener('click', (event) => { if (event.target === viewer) viewer.close(); });
	viewer?.addEventListener('close', () => { viewerVideo?.pause(); viewerVideo?.removeAttribute('src'); });

	composer?.addEventListener('submit', async (event) => {
		event.preventDefault();
		const token = timeline.dataset.token;
		const text = body?.value.trim() ?? '';
		if (!token || !submit) return;
		if (!text && !selectedFiles.length) { if (status) status.textContent = 'add text or an attachment.'; return; }
		if (selectedFiles.length > MAX_MEDIA_COUNT) { if (status) status.textContent = 'a tweet can have at most 5 attachments.'; return; }
		if (selectedFiles.some((file) => file.size > MAX_MEDIA_BYTES)) { if (status) status.textContent = 'attachments must be 100 MB or smaller.'; return; }
		submit.disabled = true;
		if (status) status.textContent = 'uploading attachments...';
		try {
			const uploaded = [];
			for (const file of selectedFiles) uploaded.push(await blogApi.uploadTweetMedia(file, token));
			if (status) status.textContent = 'posting...';
			await blogApi.createTweet(text, JSON.parse(tags?.value ?? '[]') as string[], uploaded.map((media) => media.id), token);
			window.location.reload();
		} catch (error) {
			if (status) status.textContent = error instanceof Error ? error.message : 'could not post tweet.';
			submit.disabled = false;
		}
	});
}
