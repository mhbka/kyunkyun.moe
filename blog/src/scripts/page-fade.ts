/**
 * Drives the content fade around Astro's router swaps with ordinary WAAPI
 * opacity animations. Native transition snapshots are disabled site-wide (see
 * styles/base/page-transitions.css), so fading content stays in the normal DOM
 * stacking order below the persistent foreground decorations.
 *
 * The outgoing fade starts only after the destination's real response arrived,
 * so preparation time is never padded with artificial delay. Aborted departures
 * restore visibility, and reduced motion skips the fade entirely.
 */

// Deliberately slow during visual validation; tune down after review.
const FADE_DURATION = 500;

let animations: Animation[] = [];
let owner: object | undefined;

/** Cancels unfinished fades and restores full opacity on the fading regions. */
function clearFade() {
	for (const animation of animations) animation.cancel();
	animations = [];
}

/** Fades every fading region between the given opacities and resolves when done. */
async function fadeContent(from: number, to: number) {
	clearFade();
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	animations = [...document.querySelectorAll('[data-fade]')].map((element) =>
		element.animate([{ opacity: from }, { opacity: to }], { duration: FADE_DURATION, fill: 'both', easing: 'ease' }),
	);
	await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
}

/** Starts the fade after the real response; restores it if the departure aborts. */
export function initPageFade() {
	document.addEventListener('astro:before-preparation', (event) => {
		clearFade();
		owner = event;
		const loader = event.loader;
		const restore = () => { if (owner === event) clearFade(); };
		event.signal.addEventListener('abort', restore, { once: true });
		event.loader = async () => {
			try {
				await loader();
				if (!event.signal.aborted && !event.defaultPrevented) await fadeContent(1, 0);
			} catch (error) {
				restore();
				throw error;
			} finally {
				event.signal.removeEventListener('abort', restore);
			}
		};
	});

	// Reveals the fresh page in the normal stacking order, below the decorations.
	document.addEventListener('astro:after-swap', () => {
		void fadeContent(0, 1);
	});
}
