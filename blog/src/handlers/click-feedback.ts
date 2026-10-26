/**
 * Site-wide click feedback: a game-style sound plus a pop animation.
 * Registered once by the click dispatcher (handlers/index.ts); no per-component wiring.
 *
 * Usage:
 * - Button-like elements (button, summary, .ui-button) and every internal link
 *   rendered through the Link component (`.ui-link`, including nav items, post
 *   cards, and the home previews) get feedback automatically.
 * - Any other element opts in with `data-sfx` (optionally `data-sfx="confirm"` to
 *   pick a specific sound); `data-sfx="none"` opts a subtree out.
 */

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

/** Plays the pop animation by toggling a class until the keyframes finish. */
function playPop(element: Element) {
	element.classList.remove('click-feedback-pop');
	// Restarts the animation when clicks land during an ongoing pop.
	void (element as HTMLElement).offsetWidth;
	element.classList.add('click-feedback-pop');
	element.addEventListener('animationend', () => element.classList.remove('click-feedback-pop'), { once: true });
}

export interface ClickFeedbackOptions {
	/** Injectable for tests; defaults to real audio playback. */
	playSound?: (sound: SoundDefinition) => void;
	/** Injectable for tests; defaults to the DOM animation. */
	playEffect?: (element: Element) => void;
}

/** Creates a click handler with a pooled player so rapid clicks overlap cleanly. */
export function createClickFeedback(options: ClickFeedbackOptions = {}) {
	// A small pool lets overlapping clicks each play instead of cutting off.
	const pool = new Map<string, { players: HTMLAudioElement[]; next: number }>();
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
		playPop(element);
	});

	return (event: MouseEvent) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		if (!(event.target instanceof Element)) return;
		const target = findFeedbackTarget(event.target);
		if (!target) return;
		if (target instanceof HTMLButtonElement && target.disabled) return;
		playEffect(target);
		if (localStorage.getItem(MUTE_STORAGE_KEY) === 'true') return;
		playSound(SOUNDS[resolveSoundName(target)]);
	};
}

/** Shared handler registered once by the click dispatcher. */
export const handleClickFeedback = createClickFeedback();
