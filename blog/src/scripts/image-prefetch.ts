interface PrefetchedImage {
	src: string;
}

/** Creates an image prefetcher that requests each URL at most once. */
export function createImagePrefetcher(createImage: () => PrefetchedImage = () => new Image()) {
	const requestedUrls = new Set<string>();
	return (url: string) => {
		if (!url || requestedUrls.has(url)) return;
		requestedUrls.add(url);
		createImage().src = url;
	};
}

/** Prefetches transformed viewer images after deliberate hover or keyboard focus. */
export function initImagePrefetch() {
	const prefetchImage = createImagePrefetcher();
	let hoverTimer: ReturnType<typeof setTimeout> | undefined;
	let hoverTarget: HTMLElement | undefined;

	/** Cancels a pending hover request before it consumes bandwidth. */
	const cancelHover = () => {
		if (hoverTimer) clearTimeout(hoverTimer);
		hoverTimer = undefined;
		hoverTarget = undefined;
	};

	document.addEventListener('pointerover', (event) => {
		if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		const target = event.target instanceof Element
			? event.target.closest<HTMLElement>('[data-prefetch-image]')
			: null;
		if (!target || target === hoverTarget) return;
		cancelHover();
		hoverTarget = target;
		hoverTimer = setTimeout(() => {
			prefetchImage(target.dataset.prefetchImage ?? '');
			cancelHover();
		}, 200);
	});

	document.addEventListener('pointerout', (event) => {
		if (!hoverTarget) return;
		if (event.relatedTarget instanceof Node && hoverTarget.contains(event.relatedTarget)) return;
		cancelHover();
	});

	document.addEventListener('focusin', (event) => {
		const target = event.target instanceof Element
			? event.target.closest<HTMLElement>('[data-prefetch-image]')
			: null;
		if (target) prefetchImage(target.dataset.prefetchImage ?? '');
	});
}
