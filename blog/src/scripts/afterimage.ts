/**
 * Creates a non-interactive visual copy of an element, pinned over its current
 * on-screen rect, for afterimage effects. The copy leaves layout untouched
 * (fixed positioning) and is inserted next to the original so inherited
 * selectors keep styling it. Callers animate it and must remove it afterwards.
 */
export function createAfterimage(element: HTMLElement, placement: 'beforebegin' | 'afterend' = 'beforebegin'): HTMLElement | null {
	const parent = element.parentElement;
	const rect = element.getBoundingClientRect();
	if (!parent || rect.width === 0 || rect.height === 0) return null;

	const ghost = element.cloneNode(true) as HTMLElement;
	ghost.removeAttribute('id');
	ghost.removeAttribute('data-sfx');
	ghost.classList.remove('click-feedback-pressed');
	ghost.classList.remove('click-feedback-pop');
	ghost.setAttribute('aria-hidden', 'true');
	ghost.setAttribute('inert', '');
	ghost.tabIndex = -1;
	for (const node of ghost.querySelectorAll('[id]')) node.removeAttribute('id');
	for (const media of ghost.querySelectorAll<HTMLMediaElement>('video, audio')) {
		media.removeAttribute('autoplay');
		media.pause();
	}

	const style = ghost.style;
	style.setProperty('position', 'fixed', 'important');
	style.setProperty('inset', 'auto', 'important');
	style.setProperty('top', `${rect.top}px`, 'important');
	style.setProperty('left', `${rect.left}px`, 'important');
	style.setProperty('width', `${rect.width}px`, 'important');
	style.setProperty('height', `${rect.height}px`, 'important');
	style.setProperty('margin', '0', 'important');
	style.setProperty('box-sizing', 'border-box', 'important');
	style.setProperty('z-index', '0', 'important');
	style.setProperty('pointer-events', 'none', 'important');
	style.setProperty('animation', 'none', 'important');
	style.setProperty('transition', 'none', 'important');
	style.setProperty('view-transition-name', 'none', 'important');

	element.insertAdjacentElement(placement, ghost);
	return ghost;
}
