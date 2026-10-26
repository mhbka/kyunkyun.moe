import assert from 'node:assert/strict';
import test from 'node:test';
import { runCommentAction } from '../../../../src/lib/utils/comment-action.ts';

test('allows clearing text only after a successful action', async () => {
	const errors: string[] = [];
	assert.equal(await runCommentAction(async () => {}, message => errors.push(message)), true);
	assert.deepEqual(errors, ['']);
});

test('reports rejected comment actions without clearing the form', async () => {
	for (const error of [new Error('Session expired'), 'network failure']) {
		let message = '';
		const saved = await runCommentAction(async () => { throw error; }, value => { message = value; });
		assert.equal(saved, false);
		assert.match(message, /Session expired|Unable to save/);
	}
});
