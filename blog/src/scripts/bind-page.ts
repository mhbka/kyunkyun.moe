type Cleanup = () => void;

/**
 * Initializes every element matching `selector` exactly once, now and after each
 * client-side navigation. Elements that persist across a swap keep their state;
 * `init` may return a cleanup that runs once the element has left the document.
 */
export function bindPage<T extends Element = HTMLElement>(selector: string, init: (element: T) => Cleanup | void) {
	const bound = new Map<Element, Cleanup | undefined>();

	function sync() {
		for (const [element, cleanup] of bound) {
			if (element.isConnected) continue;
			cleanup?.();
			bound.delete(element);
		}
		document.querySelectorAll<T>(selector).forEach((element) => {
			if (!bound.has(element)) bound.set(element, init(element) ?? undefined);
		});
	}

	sync();
	document.addEventListener('astro:page-load', sync);
}
