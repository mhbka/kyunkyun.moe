import { addTag, normalizeTag } from '../../lib/utils/tags.ts';

const initializedInputs = new WeakMap<HTMLElement, { commit: () => void; getTags: () => string[] }>();

/** Shares tag editing and submission between post, pix, and tweet forms. */
export function initTagInput(root: HTMLElement) {
	const existing = initializedInputs.get(root);
	if (existing) return existing;
	const input = root.querySelector<HTMLInputElement>('.ui-input');
	const list = root.querySelector<HTMLUListElement>('[data-tag-list]');
	const value = root.querySelector<HTMLInputElement>('[data-tag-value]');
	const template = root.querySelector<HTMLTemplateElement>('template');
	if (!input || !list || !value || !template) return;
	let tags: string[] = JSON.parse(value.value);
	const emptyPlaceholder = input.placeholder;

	// Shows the prompt only while the entire tag control is empty.
	function syncPlaceholder() {
		input!.placeholder = tags.length || input!.value ? '' : emptyPlaceholder;
	}

	// Clones shared UI markup so generated tags retain their scoped styling.
	function render() {
		list!.replaceChildren(...tags.map(tag => {
			const item = template!.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
			const button = item.querySelector('button')!;
			button.dataset.tag = tag;
			button.ariaLabel = `Remove ${tag} tag`;
			button.textContent = `${tag} ×`;
			return item;
		}));
		syncPlaceholder();
	}

	// Publishes only real tag changes, leaving initial rendering clean.
	function update(nextTags: string[]) {
		if (JSON.stringify(nextTags) === JSON.stringify(tags)) return;
		tags = nextTags;
		value!.value = JSON.stringify(tags);
		render();
		root.dispatchEvent(new CustomEvent('tags:change', { bubbles: true, detail: [...tags] }));
	}

	// Commits any unfinished tag before the containing form reads its values.
	function commit() {
		update(addTag(tags, input!.value));
		input!.value = '';
		syncPlaceholder();
	}

	render();
	input.addEventListener('input', () => {
		input.value = normalizeTag(input.value);
		syncPlaceholder();
	});
	input.addEventListener('keydown', event => {
		if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); commit(); }
		if (event.key === 'Backspace' && !input.value && tags.length) {
			event.preventDefault();
			update(tags.slice(0, -1));
		}
	});
	list.addEventListener('click', event => {
		const button = (event.target as Element).closest<HTMLButtonElement>('[data-tag]');
		if (!button?.dataset.tag) return;
		update(tags.filter(tag => tag !== button.dataset.tag));
		input.focus();
	});
	root.closest('form')?.addEventListener('submit', commit, { capture: true });
	const controls = { commit, getTags: () => [...tags] };
	initializedInputs.set(root, controls);
	return controls;
}
