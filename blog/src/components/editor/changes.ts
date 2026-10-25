/** Tracks which editor revision was saved while allowing typing during requests. */
export function trackEditorChanges(form: HTMLFormElement) {
	let revision = 0;
	const markDirty = () => {
		revision += 1;
		form.dataset.dirty = 'true';
	};
	form.addEventListener('input', markDirty);
	form.addEventListener('change', markDirty);
	form.addEventListener('tags:change', markDirty);
	return {
		markDirty,
		getRevision: () => revision,
		markSaved(savedRevision: number) {
			if (revision === savedRevision) form.dataset.dirty = 'false';
			return revision === savedRevision;
		},
	};
}
