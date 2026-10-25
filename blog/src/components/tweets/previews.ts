/** Owns attachment preview URLs until the previews are replaced or disposed. */
export function createTweetPreviews(container: HTMLElement) {
	let urls: string[] = [];
	const clear = () => {
		container.replaceChildren();
		urls.forEach(url => URL.revokeObjectURL(url));
		urls = [];
	};
	return {
		clear,
		render(files: File[]) {
			clear();
			for (const file of files) {
				const url = URL.createObjectURL(file);
				urls.push(url);
				const isVideo = file.type.startsWith('video/');
				const preview = document.createElement(isVideo ? 'video' : 'img');
				if (preview instanceof HTMLVideoElement) preview.muted = true;
				preview.src = url;
				container.append(preview);
			}
		},
	};
}
