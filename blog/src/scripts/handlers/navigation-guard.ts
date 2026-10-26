const DIRTY_EDITOR = '[data-post-editor][data-dirty="true"]';

/** Warns before an internal link leaves an editor with unsaved changes. */
export function handleDirtyEditorClick(event: MouseEvent) {
	if (!(event.target instanceof Element)) return;
	const link = event.target.closest<HTMLAnchorElement>('a[href]');
	const editor = document.querySelector<HTMLElement>(DIRTY_EDITOR);
	if (!link || !editor || event.defaultPrevented || event.button !== 0 || link.target || link.hasAttribute('download') || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	const destination = new URL(link.href, window.location.href);
	if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search && destination.hash) return;
	if (!window.confirm('You have unsaved changes. Leave this page?')) {
		event.preventDefault();
		return;
	}
	// Avoids a second browser prompt for the same confirmed navigation.
	editor.dataset.dirty = 'false';
}

/** Covers refresh, tab close, and Back/Forward away from a dirty editor. */
export function registerNavigationGuards() {
	window.addEventListener('beforeunload', (event) => {
		if (document.querySelector(DIRTY_EDITOR)) event.preventDefault();
	});

	// The router cannot cancel a history traversal, so a dirty editor hands it to the
	// browser: a full navigation, which raises the native unsaved-changes prompt above.
	document.addEventListener('astro:before-preparation', (event) => {
		if (event.navigationType === 'traverse' && document.querySelector(DIRTY_EDITOR)) event.preventDefault();
	});
}
