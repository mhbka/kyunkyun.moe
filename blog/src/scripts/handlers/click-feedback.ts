/**
 * Site-wide click feedback: a held press followed by a game-style sound and pop.
 * Registered once by the click dispatcher (handlers/index.ts); no per-component wiring.
 *
 * Usage:
 * - Button-like elements (button, summary, .ui-button) and every internal link
 *   rendered through the Link component (`.ui-link`, including nav items, post
 *   cards, and the home previews) get feedback automatically.
 * - Any other element opts in with `data-sfx` (optionally `data-sfx="confirm"` to
 *   pick a specific sound); `data-sfx="none"` opts a subtree out.
 */

import { createAfterimage } from '../afterimage.ts';

interface SoundDefinition {
	src: string;
	volume: number;
}

/** Registry of named sounds. Adding a new sound is a one-line entry here. */
export const SOUNDS: Record<string, SoundDefinition> = {
	confirm: { src: '/sfx/confirm_soft.wav', volume: 0.5 },
};

export const DEFAULT_SOUND = 'confirm';

const MUTE_STORAGE_KEY = 'site-sfx-muted';

const SMALL_TARGET_LENGTH = 120;
const LARGE_TARGET_LENGTH = 480;
const SMALL_TARGET_SQUASH = 0.86;
const LARGE_TARGET_SQUASH = 0.98;
const SMALL_TARGET_STRETCH = 1.08;
const LARGE_TARGET_STRETCH = 1.01;

/** Elements that receive feedback without needing an explicit data-sfx. */
const DEFAULT_TARGET_SELECTOR = 'button, summary, [role="button"], .ui-button, .ui-link, .main-nav-item, .post-card, .home-preview, [data-sfx]';

/**
 * Resolves the element that should receive feedback from a click target.
 * Returns null for non-interactive targets and `data-sfx="none"` subtrees.
 */
export function findFeedbackTarget(target: Element): Element | null {
	const optedOut = target.closest('[data-sfx="none"]');
	const candidate = target.closest(DEFAULT_TARGET_SELECTOR);
	if (!candidate || (optedOut && optedOut.contains(candidate))) return null;
	return candidate;
}

/** Resolves the sound name for an element, falling back to the default. */
export function resolveSoundName(element: Element): string {
	const requested = element.getAttribute('data-sfx');
	if (requested && requested in SOUNDS) return requested;
	return DEFAULT_SOUND;
}

/** True while the user has not asked for reduced motion. */
function motionAllowed(): boolean {
	return window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
}

export interface FeedbackScale {
	squash: number;
	stretch: number;
}

/** Scales feedback strength down as the target's longest side grows. */
export function calculateFeedbackScale(width: number, height: number): FeedbackScale {
	const longestSide = Math.max(width, height);
	const lengthRange = LARGE_TARGET_LENGTH - SMALL_TARGET_LENGTH;
	const progress = Math.min(1, Math.max(0, (longestSide - SMALL_TARGET_LENGTH) / lengthRange));
	return {
		squash: SMALL_TARGET_SQUASH + (LARGE_TARGET_SQUASH - SMALL_TARGET_SQUASH) * progress,
		stretch: SMALL_TARGET_STRETCH + (LARGE_TARGET_STRETCH - SMALL_TARGET_STRETCH) * progress,
	};
}

/** Writes the target's size-adjusted feedback values to its CSS variables. */
function applyFeedbackScale(element: Element) {
	if (!(element instanceof HTMLElement)) return;
	const { width, height } = element.getBoundingClientRect();
	const { squash, stretch } = calculateFeedbackScale(width, height);
	element.style.setProperty('--click-feedback-squash', String(squash));
	element.style.setProperty('--click-feedback-stretch', String(stretch));
}

/** Plays the pop animation by toggling a class until the keyframes finish. */
function playPop(element: Element) {
	element.classList.remove('click-feedback-pressed');
	element.classList.remove('click-feedback-pop');
	// Restarts the animation when clicks land during an ongoing pop.
	void (element as HTMLElement).offsetWidth;
	element.classList.add('click-feedback-pop');
	element.addEventListener('animationend', () => element.classList.remove('click-feedback-pop'), { once: true });
}

const ECHO_DURATION = 320;
const ECHO_OPACITY = 0.3;
const ECHO_GROWTH = 1.1;
// Large surfaces grow less so the echo stays a nudge.
const ECHO_GROWTH_LARGE = 1.025;
const LARGE_ECHO_AREA = 40000;

/** Plays a faded copy that expands from the element and fades out, as an afterimage of the pop. */
function playEcho(element: Element) {
	if (!(element instanceof HTMLElement)) return;
	const ghost = createAfterimage(element, 'afterend');
	if (!ghost) return;
	const { width, height } = element.getBoundingClientRect();
	const growth = width * height > LARGE_ECHO_AREA ? ECHO_GROWTH_LARGE : ECHO_GROWTH;
	const echo = ghost.animate(
		[
			{ transform: 'scale(1)', opacity: ECHO_OPACITY },
			{ transform: `scale(${growth})`, opacity: 0 },
		],
		{ duration: ECHO_DURATION, easing: 'ease-out', fill: 'both' },
	);
	const remove = () => ghost.remove();
	echo.addEventListener('finish', remove);
	echo.addEventListener('cancel', remove);
}

export interface ClickFeedbackOptions {
	/** Injectable for tests; defaults to real audio playback. */
	playSound?: (sound: SoundDefinition) => void;
	/** Injectable for tests; defaults to the DOM animation. */
	playEffect?: (element: Element) => void;
	/** Injectable for tests; defaults to applying the held state. */
	startPress?: (element: Element) => void;
	/** Injectable for tests; defaults to clearing the held state. */
	endPress?: (element: Element) => void;
}

export interface ClickFeedbackController {
	handlePointerDown: (event: PointerEvent) => void;
	handlePointerUp: (event: PointerEvent) => void;
	handlePointerCancel: (event: PointerEvent) => void;
	handleClick: (event: MouseEvent) => void;
}

/** Resolves a valid primary-button feedback target for pointer and click events. */
function findEventTarget(event: MouseEvent | PointerEvent): Element | null {
	const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
	if (event.defaultPrevented || event.button !== 0 || hasModifier) return null;
	if (!(event.target instanceof Element)) return null;
	const target = findFeedbackTarget(event.target);
	if (target instanceof HTMLButtonElement && target.disabled) return null;
	return target;
}

/** Creates coordinated press, release, click, sound, and animation feedback. */
export function createClickFeedbackController(options: ClickFeedbackOptions = {}): ClickFeedbackController {
	// A small pool lets overlapping clicks each play instead of cutting off.
	const pool = new Map<string, { players: HTMLAudioElement[]; next: number }>();
	const activePointers = new Map<number, Element>();
	const playSound = options.playSound ?? ((sound: SoundDefinition) => {
		let entry = pool.get(sound.src);
		if (!entry) {
			entry = {
				players: [0, 1, 2].map(() => {
					const player = new Audio(sound.src);
					player.preload = 'auto';
					player.volume = sound.volume;
					return player;
				}),
				next: 0,
			};
			pool.set(sound.src, entry);
		}
		const player = entry.players[entry.next];
		entry.next = (entry.next + 1) % entry.players.length;
		player.currentTime = 0;
		void player.play().catch(() => {});
	});
	const playEffect = options.playEffect ?? ((element: Element) => {
		if (!motionAllowed()) return;
		applyFeedbackScale(element);
		// The echo clones before the pop class is added so the copy does not inherit the squash.
		playEcho(element);
		playPop(element);
	});
	const startPress = options.startPress ?? ((element: Element) => {
		if (!motionAllowed()) return;
		applyFeedbackScale(element);
		element.classList.add('click-feedback-pressed');
	});
	const endPress = options.endPress ?? ((element: Element) => element.classList.remove('click-feedback-pressed'));

	/** Holds the target down for as long as its primary pointer remains pressed. */
	function handlePointerDown(event: PointerEvent) {
		if (event.isPrimary === false) return;
		const target = findEventTarget(event);
		if (!target) return;
		activePointers.set(event.pointerId, target);
		startPress(target);
	}

	/** Clears the held state before the following click activates the target. */
	function handlePointerUp(event: PointerEvent) {
		const target = activePointers.get(event.pointerId);
		if (!target) return;
		activePointers.delete(event.pointerId);
		endPress(target);
	}

	/** Clears a cancelled pointer without treating it as an activation. */
	function handlePointerCancel(event: PointerEvent) {
		const target = activePointers.get(event.pointerId);
		if (!target) return;
		activePointers.delete(event.pointerId);
		endPress(target);
	}

	/** Plays the release effect after navigation state settles, plus the click sound. */
	function handleClick(event: MouseEvent) {
		const target = findEventTarget(event);
		if (!target) return;
		playEffect(target);
		if (localStorage.getItem(MUTE_STORAGE_KEY) === 'true') return;
		playSound(SOUNDS[resolveSoundName(target)]);
	}

	return { handlePointerDown, handlePointerUp, handlePointerCancel, handleClick };
}

/** Creates the legacy click-only handler used by isolated callers and tests. */
export function createClickFeedback(options: ClickFeedbackOptions = {}) {
	return createClickFeedbackController(options).handleClick;
}

/** Shared handlers registered once by the document dispatcher. */
const clickFeedback = createClickFeedbackController();
export const handlePointerDownFeedback = clickFeedback.handlePointerDown;
export const handlePointerUpFeedback = clickFeedback.handlePointerUp;
export const handlePointerCancelFeedback = clickFeedback.handlePointerCancel;
export const handleClickFeedback = clickFeedback.handleClick;
