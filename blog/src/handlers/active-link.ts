/** Optimistically moves the current-page treatment to an internal link while its page loads. */
export function handleActiveLink(event: MouseEvent) {
	if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
	if (!(event.target instanceof Element)) return;
	const link = event.target.closest<HTMLAnchorElement>('.site-header .primary-links a.header-link-target[href]');
	const primaryLinks = link?.closest<HTMLElement>('.primary-links');
	if (!link || !primaryLinks || link.target || link.hasAttribute('download')) return;
	const destination = new URL(link.href, window.location.href);
	if (destination.origin !== window.location.origin) return;

	primaryLinks.querySelectorAll('.header-link-target.active').forEach((item) => item.classList.remove('active'));
	primaryLinks.querySelectorAll('[aria-current="page"]').forEach((item) => item.removeAttribute('aria-current'));
	link.classList.add('active');
	link.setAttribute('aria-current', 'page');
	link.closest('.nav-dropdown')?.querySelector(':scope > summary')?.classList.add('active');
}
