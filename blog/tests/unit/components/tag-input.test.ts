import assert from 'node:assert/strict';
import test from 'node:test';
import { initTagInput } from '../../../src/components/tag-input.ts';

/** Supplies the controls used by a shared tag input without a browser renderer. */
function setup(initialTags: string[] = []) {
	const input = Object.assign(new EventTarget(), { value: '', focus() {} });
	const value = { value: JSON.stringify(initialTags) };
	const form = new EventTarget();
	const button = { dataset: { tag: '' } };
	const list = Object.assign(new EventTarget(), { replaceChildren() {}, closest: () => button });
	const template = { content: { firstElementChild: { cloneNode: () => ({ querySelector: () => ({ dataset: {} }) }) } } };
	const elements = new Map([['.ui-input', input], ['[data-tag-list]', list], ['[data-tag-value]', value], ['template', template]] as Array<[string, object]>);
	const root = Object.assign(new EventTarget(), { querySelector: (selector: string) => elements.get(selector), closest: () => form });
	let changes = 0;
	root.addEventListener('tags:change', () => changes++);
	const controls = initTagInput(root as unknown as HTMLElement)!;
	return { input, value, form, list, button, root, controls, getChanges: () => changes };
}

test('keeps initialization clean, commits pending tags on submit, and avoids duplicates', () => {
	const field = setup(['astro']);
	assert.equal(field.getChanges(), 0);
	assert.equal(initTagInput(field.root as unknown as HTMLElement), field.controls);
	field.input.value = 'CSS';
	field.form.dispatchEvent(new Event('submit'));
	assert.deepEqual(field.controls.getTags(), ['astro', 'css']);
	assert.equal(field.getChanges(), 1);
	field.input.value = 'css';
	field.controls.commit();
	assert.equal(field.getChanges(), 1);
	assert.equal(field.input.value, '');
});

test('notifies the editor when tags are removed by click or backspace', () => {
	const field = setup(['astro', 'css']);
	field.button.dataset.tag = 'astro';
	field.list.dispatchEvent(new Event('click'));
	assert.deepEqual(field.controls.getTags(), ['css']);
	field.input.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'Backspace' }));
	assert.deepEqual(field.controls.getTags(), []);
	assert.equal(field.value.value, '[]');
	assert.equal(field.getChanges(), 2);
});
