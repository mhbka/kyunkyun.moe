export const NAVIGATION_FADE_CLASS = 'is-navigating';
export const NAVIGATION_FADE_DURATION_MS = 750;

interface NavigationFadeDocument {
	addEventListener(eventName: string, listener: (event: NavigationFadeEvent) => void): void;
}

interface NavigationFadeRoot {
	classList: Pick<DOMTokenList, 'add' | 'remove'>;
}

interface NavigationFadeEvent {
	loader?: () => Promise<void>;
	signal?: AbortSignal;
}

type WaitForFade = (signal?: AbortSignal) => Promise<void>;

// Waits for the outgoing page fade, unless the navigation has been cancelled.
export function waitForNavigationFade(signal?: AbortSignal) {
	return new Promise<void>((resolve) => {
		const complete = () => {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', complete);
			resolve();
		};
		const timeout = setTimeout(complete, NAVIGATION_FADE_DURATION_MS);

		signal?.addEventListener('abort', complete, { once: true });
	});
}

// Fades the current page while the router fetches the next one.
export function bindNavigationFade(
	documentRef: NavigationFadeDocument = document,
	root: NavigationFadeRoot = document.documentElement,
	waitForFade: WaitForFade = waitForNavigationFade,
) {
	const startFade = (event: NavigationFadeEvent) => {
		root.classList.add(NAVIGATION_FADE_CLASS);
		if (!event.loader) return;

		const loadPage = event.loader;
		event.loader = async () => {
			await Promise.all([loadPage(), waitForFade(event.signal)]);
		};
	};
	const stopFade = () => root.classList.remove(NAVIGATION_FADE_CLASS);

	documentRef.addEventListener('astro:before-preparation', startFade);
	documentRef.addEventListener('astro:before-swap', stopFade);
	documentRef.addEventListener('astro:page-load', stopFade);
}
