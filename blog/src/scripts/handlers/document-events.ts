type Unsubscribe = () => void;

/** Shares one document listener per event type between all subscribers. */
function createSubscription<E extends Event>(type: string) {
	const listeners = new Set<(event: E) => void>();
	const dispatch = (event: Event) => listeners.forEach((listener) => listener(event as E));
	return (listener: (event: E) => void): Unsubscribe => {
		if (!listeners.size) document.addEventListener(type, dispatch);
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
			if (!listeners.size) document.removeEventListener(type, dispatch);
		};
	};
}

/** Bubble-phase document clicks; the capture-phase dispatcher lives in handlers/index.ts. */
export const onDocumentClick = createSubscription<MouseEvent>('click');

/** Document pointer movement shared by the walker and title wave. */
export const onPointerMove = createSubscription<PointerEvent>('pointermove');
