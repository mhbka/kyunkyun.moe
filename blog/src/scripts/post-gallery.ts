import { getGalleryNeighbourIndexes, wrapGalleryIndex } from '../lib/content/gallery-navigation.ts';

/** Starts fetching a hidden slide's media so it is ready before the reader navigates to it. */
function preloadSlide(slide: HTMLElement) {
	slide.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((image) => {
		image.loading = 'eager';
	});
	slide.querySelectorAll<HTMLVideoElement>('video').forEach((video) => {
		if (video.preload === 'none') video.preload = 'metadata';
	});
}

/** One server-rendered gallery: owns the active slide, its controls, and neighbour preloading. */
class PostGallery extends HTMLElement {
	#controller?: AbortController;

	connectedCallback() {
		const slides = Array.from(this.querySelectorAll<HTMLElement>('.gallery__item'));
		if (slides.length < 2) return;

		this.#controller = new AbortController();
		const { signal } = this.#controller;
		const prev = this.querySelector<HTMLButtonElement>('[data-gallery-prev]');
		const next = this.querySelector<HTMLButtonElement>('[data-gallery-next]');
		const currentLabel = this.querySelector<HTMLElement>('[data-gallery-current]');

		let index = 0;
		const preloadAround = () => {
			getGalleryNeighbourIndexes(index, slides.length).forEach((neighbour) => preloadSlide(slides[neighbour]));
		};
		const show = (nextIndex: number) => {
			index = wrapGalleryIndex(nextIndex, slides.length);
			slides.forEach((slide, i) => {
				slide.hidden = i !== index;
				if (slide.hidden) slide.querySelector('video')?.pause();
			});

			// Keep the controls anchored to the bounds of the active image or video.
			const activeMedia = slides[index].querySelector<HTMLElement>('.gallery__media');
			if (prev) activeMedia?.append(prev);
			if (next) activeMedia?.append(next);
			if (currentLabel) currentLabel.textContent = String(index + 1);
			preloadAround();
		};

		prev?.addEventListener('click', () => show(index - 1), { signal });
		next?.addEventListener('click', () => show(index + 1), { signal });
		this.addEventListener('keydown', (event) => {
			if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
			if (event.key === 'ArrowLeft') show(index - 1);
			else if (event.key === 'ArrowRight') show(index + 1);
		}, { signal });

		// Warm up the first hop shortly before the gallery scrolls into view.
		if (typeof IntersectionObserver === 'undefined') {
			preloadAround();
			return;
		}
		const observer = new IntersectionObserver((entries) => {
			if (!entries.some((entry) => entry.isIntersecting)) return;
			preloadAround();
			observer.disconnect();
		}, { rootMargin: '800px 0px' });
		observer.observe(this);
		signal.addEventListener('abort', () => observer.disconnect(), { once: true });
	}

	disconnectedCallback() {
		this.#controller?.abort();
	}
}

/** Registers the gallery element once per page realm. */
export function definePostGallery() {
	if (!customElements.get('post-gallery')) customElements.define('post-gallery', PostGallery);
}
