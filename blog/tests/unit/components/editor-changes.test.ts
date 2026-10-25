import assert from 'node:assert/strict';
import test from 'node:test';
import { trackEditorChanges } from '../../../src/components/editor/changes.ts';

/** Supplies the form events and dataset used by change tracking. */
function setup() {
	const form = Object.assign(new EventTarget(), { dataset: {} as Record<string, string> });
	const changes = trackEditorChanges(form as unknown as HTMLFormElement);
	return { form, changes };
}

test('marks edits and tag removal dirty and clears a saved revision', () => {
	for (const event of ['input', 'change', 'tags:change']) {
		const { form, changes } = setup();
		assert.equal(form.dataset.dirty, undefined);
		form.dispatchEvent(new Event(event));
		assert.equal(form.dataset.dirty, 'true');
		assert.equal(changes.markSaved(changes.getRevision()), true);
		assert.equal(form.dataset.dirty, 'false');
	}
});

test('keeps edits made during a save dirty', () => {
	const { form, changes } = setup();
	changes.markDirty();
	const submittedRevision = changes.getRevision();
	changes.markDirty();
	assert.equal(changes.markSaved(submittedRevision), false);
	assert.equal(form.dataset.dirty, 'true');
});
