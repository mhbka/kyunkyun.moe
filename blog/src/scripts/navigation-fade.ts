export const NAVIGATION_FADE_CLASS = 'is-navigating';

interface NavigationFadeDocument {
	addEventListener(eventName: string, listener: () => void): void;
}

interface NavigationFadeRoot {
	classList: Pick<DOMTokenList, 'add' | 'remove'>;
}

// Fades the current page while the router fetches the next one.
export function bindNavigationFade(
	documentRef: NavigationFadeDocument = document,
	root: NavigationFadeRoot = document.documentElement,
) {
	const startFade = () => root.classList.add(NAVIGATION_FADE_CLASS);
	const stopFade = () => root.classList.remove(NAVIGATION_FADE_CLASS);

	documentRef.addEventListener('astro:before-preparation', startFade);
	documentRef.addEventListener('astro:before-swap', stopFade);
	documentRef.addEventListener('astro:page-load', stopFade);
}
