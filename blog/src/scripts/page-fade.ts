/**
 * Slides the main content cards off the right edge before a router swap and
 * back in from the right afterwards, using ordinary WAAPI transform animations.
 * Native transition snapshots are disabled site-wide (see
 * styles/base/page-transitions.css), so moving cards stay in the normal DOM
 * stacking order below the persistent foreground decorations.
 *
 * The outgoing slide starts only after the destination's real response arrived,
 * so preparation time is never padded with artificial delay. Aborted departures
 * restore the cards, and reduced motion skips the animation entirely.
 */

const SLIDE_OUT_DURATION = 400;
const SLIDE_IN_DURATION = 400;
// Eases strongly at both ends so cards accelerate and settle gently.
const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';
const STAGGER = 40;
const MAX_STAGGER = 240;
// Clears the card's glow so no shadow lingers at the viewport edge.
const GLOW_MARGIN = 64;
const TRANSITIONING_CLASS = 'page-transitioning';

let animations: Animation[] = [];
let owner: object | undefined;

/** Cancels unfinished slides, returning cards to their resting position. */
function clearSlide() {
	for (const animation of animations) animation.cancel();
	animations = [];
	document.documentElement.classList.remove(TRANSITIONING_CLASS);
}

/** Finds visible top-level cards of the main content and the sidebar, excluding nested ones. */
function getCards() {
	return [...document.querySelectorAll<HTMLElement>('.site-content-region .edge-card')]
		.filter((card) => !card.parentElement?.closest('.edge-card') && card.getClientRects().length > 0);
}

/** Slides the cards out to the right, or back in from it, and resolves when done. */
async function slideCards(direction: 'out' | 'in') {
	clearSlide();
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const cards = getCards();
	if (cards.length === 0) return;

	const out = direction === 'out';
	document.documentElement.classList.add(TRANSITIONING_CLASS);
	let mainIndex = 0;
	animations = cards.map((card) => {
		// Sidebar cards move with the first main card instead of queueing behind it.
		const index = card.closest('.site-sidebar') ? 0 : mainIndex++;
		const distance = window.innerWidth - card.getBoundingClientRect().left + GLOW_MARGIN;
		const offscreen = `translateX(${distance}px)`;
		return card.animate(
			[{ transform: out ? 'translateX(0)' : offscreen }, { transform: out ? offscreen : 'translateX(0)' }],
			{
				duration: out ? SLIDE_OUT_DURATION : SLIDE_IN_DURATION,
				delay: Math.min(index * STAGGER, MAX_STAGGER),
				fill: 'both',
				easing: EASING,
			},
		);
	});
	await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
	if (!out) clearSlide();
}

/** Starts the slide-out after the real response; restores cards if the departure aborts. */
export function initPageFade() {
	document.addEventListener('astro:before-preparation', (event) => {
		clearSlide();
		owner = event;
		const loader = event.loader;
		const restore = () => { if (owner === event) clearSlide(); };
		event.signal.addEventListener('abort', restore, { once: true });
		event.loader = async () => {
			try {
				await loader();
				if (!event.signal.aborted && !event.defaultPrevented) await slideCards('out');
			} catch (error) {
				restore();
				throw error;
			} finally {
				event.signal.removeEventListener('abort', restore);
			}
		};
	});

	// Brings the fresh cards in before first paint, below the decorations.
	document.addEventListener('astro:after-swap', () => {
		void slideCards('in');
	});
}
