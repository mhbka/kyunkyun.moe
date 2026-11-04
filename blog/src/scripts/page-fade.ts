/**
 * Slides the main content cards off the right edge before a router swap and
 * back in from the right afterwards, using ordinary WAAPI transform animations.
 * Native transition snapshots are disabled site-wide (see
 * styles/base/page-transitions.css), so moving cards stay in the normal DOM
 * stacking order below the persistent foreground decorations.
 *
 * The outgoing slide starts immediately, in parallel with loading the destination.
 * If loading outlasts the slide, a loading indicator plays until the swap, when
 * the new cards slide in. Aborted departures restore the cards, and reduced
 * motion skips the animation entirely.
 */

import { createAfterimage } from './afterimage';

const SLIDE_OUT_DURATION = 400;
const SLIDE_IN_DURATION = 400;
// Eases strongly at both ends so cards accelerate and settle gently.
const EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';
const STAGGER = 40;
const MAX_STAGGER = 240;
// Clears the card's glow so no shadow lingers at the viewport edge.
const GLOW_MARGIN = 64;
const TRANSITIONING_CLASS = 'page-transitioning';
// How long the cards wait off-screen before the loading indicator appears.
const LOADING_DELAY = 250;
let loadingTimer: number | undefined;

// Trailing copies of each departing card: start delay (ms) behind the card and peak opacity.
const AFTERIMAGES = [
	{ lag: 50, opacity: 0.35 },
	{ lag: 100, opacity: 0.22 },
	{ lag: 150, opacity: 0.12 },
];

let animations: Animation[] = [];
let ghosts: HTMLElement[] = [];
let owner: object | undefined;

/** Cancels unfinished slides, returning cards to their resting position and dropping afterimages. */
function clearSlide() {
	for (const animation of animations) animation.cancel();
	animations = [];
	for (const ghost of ghosts) ghost.remove();
	ghosts = [];
	document.documentElement.classList.remove(TRANSITIONING_CLASS);
}

/** Finds visible top-level cards of the main content and the sidebar, excluding nested ones. */
function getCards() {
	return [...document.querySelectorAll<HTMLElement>('.site-content-region .edge-card')]
		.filter((card) => !card.parentElement?.closest('.edge-card') && card.getClientRects().length > 0);
}

/** Resolves after the browser has painted once, so heavy first-frame work doesn't eat into an animation. */
function nextPaint() {
	return new Promise<void>((resolve) => {
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
	});
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
	cards.forEach((card) => {
		// Sidebar cards move with the first main card instead of queueing behind it.
		const index = card.closest('.site-sidebar') ? 0 : mainIndex++;
		const distance = window.innerWidth - card.getBoundingClientRect().left + GLOW_MARGIN;
		const offscreen = `translateX(${distance}px)`;
		const delay = Math.min(index * STAGGER, MAX_STAGGER);
		if (out) {
			// Faded copies start slightly later and finish together with the card, trailing behind it mid-slide.
			AFTERIMAGES.forEach(({ lag, opacity }) => {
				const ghost = createAfterimage(card);
				if (!ghost) return;
				ghosts.push(ghost);
				animations.push(ghost.animate(
					[
						{ transform: 'translateX(0)', opacity: 0, offset: 0 },
						{ transform: 'translateX(0)', opacity, offset: 0.001 },
						{ transform: offscreen, opacity, offset: 1 },
					],
					{ duration: SLIDE_OUT_DURATION - lag, delay: delay + lag, fill: 'both', easing: EASING },
				));
			});
		}
		animations.push(card.animate(
			[{ transform: out ? 'translateX(0)' : offscreen }, { transform: out ? offscreen : 'translateX(0)' }],
			{
				duration: out ? SLIDE_OUT_DURATION : SLIDE_IN_DURATION,
				delay,
				fill: 'both',
				easing: EASING,
			},
		));
	});
	if (!out) {
		// Parks the cards at their off-screen start, then lets the browser lay out and paint the new page before the clock starts.
		const parked = animations;
		parked.forEach((animation) => animation.pause());
		await nextPaint();
		if (animations !== parked) return;
		parked.forEach((animation) => animation.play());
	}
	await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
	if (!out) clearSlide();
}

/** Shows the loading indicator while cards are parked off-screen waiting for the destination. */
function showLoading() {
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	hideLoading();
	loadingTimer = window.setTimeout(() => {
		const indicator = document.createElement('div');
		indicator.className = 'page-loading';
		indicator.setAttribute('aria-hidden', 'true');
		for (let i = 0; i < 3; i++) indicator.append(document.createElement('span'));
		document.body.append(indicator);
	}, LOADING_DELAY);
}

function hideLoading() {
	window.clearTimeout(loadingTimer);
	document.querySelectorAll('.page-loading').forEach((element) => element.remove());
}

/** Slides out immediately on navigation, shows a loader while waiting; restores cards if the departure aborts. */
export function initPageFade() {
	document.addEventListener('astro:before-preparation', (event) => {
		clearSlide();
		owner = event;
		const loader = event.loader;
		const restore = () => { if (owner === event) clearSlide(); };
		event.signal.addEventListener('abort', restore, { once: true });
		event.loader = async () => {
			try {
				// Slides out immediately while the destination loads in parallel.
				let loaded = false;
				const loading = loader().finally(() => { loaded = true; });
				loading.catch(() => {});
				await slideCards('out');
				if (!loaded && !event.signal.aborted) showLoading();
				await loading;
			} catch (error) {
				restore();
				throw error;
			} finally {
				hideLoading();
				event.signal.removeEventListener('abort', restore);
			}
		};
	});

	// Brings the fresh cards in before first paint, below the decorations.
	document.addEventListener('astro:after-swap', () => {
		void slideCards('in');
	});
}
