import { handleActiveLink } from './active-link';
import {
	handleClickFeedback,
	handlePointerCancelFeedback,
	handlePointerDownFeedback,
	handlePointerUpFeedback,
} from './click-feedback';
import { handleDirtyEditorClick, registerNavigationGuards } from './navigation-guard';
import { initMediaLoading } from '../media-loading';
import { initImagePrefetch } from '../image-prefetch';

let registered = false;

/**
 * Registers the site's document-level handlers once per page realm. Every
 * capture-phase click runs through the single listener below, in order, so
 * each step runs before the router's bubble-phase preventDefault() and a
 * cancelled departure (defaultPrevented) silences the later steps.
 */
export function initHandlers() {
	if (registered) return;
	registered = true;
	document.addEventListener('click', (event) => {
		handleDirtyEditorClick(event);
		handleActiveLink(event);
		handleClickFeedback(event);
	}, true);
	// Pointer events provide a held state before the click activation fires.
	document.addEventListener('pointerdown', handlePointerDownFeedback, true);
	document.addEventListener('pointerup', handlePointerUpFeedback, true);
	document.addEventListener('pointercancel', handlePointerCancelFeedback, true);
	initMediaLoading();
	initImagePrefetch();
	registerNavigationGuards();
}
