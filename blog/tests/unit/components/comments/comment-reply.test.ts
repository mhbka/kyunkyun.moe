import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import { runCommentAction } from '../../../../src/lib/utils/comment-action.ts';

interface Node {
	type: unknown;
	props: Record<string, unknown>;
	children: Node[];
}

/** Renders the reply form with inert React elements and invokes its real submit handler. */
function replyForm(onReply: (...args: string[]) => Promise<void>) {
	const source = readFileSync(new URL('../../../../src/components/comments/Comments.tsx', import.meta.url), 'utf8').replace(/^import .*;$/gm, '').replace('export default function', 'function');
	const script = ts.transpile(source, { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React });
	let error = '';
	const globals = {
		React: { createElement: (type: unknown, props: object | null, ...children: Node[]) => ({ type, props: props ?? {}, children: children.flat().filter(Boolean) }) },
		useState: () => ['', (value: string) => { error = value; }],
		Button: 'button', Textarea: 'textarea', runCommentAction,
		FormData: class { get() { return 'reply text'; } },
	};
	const render = runInNewContext(`${script}\nCommentNode`, globals);
	const tree: Node = render({ comment: { id: 'parent-1', authorId: 'author', body: 'original', createdAt: '2026-01-01' }, childrenByParent: new Map(), depth: 0, replyingTo: 'parent-1', onReply });
	const form = tree.children.find(child => child.type === 'form')!;
	assert.ok(form);
	return { submit: form.props.onSubmit as (event: object) => Promise<void>, getError: () => error };
}

test('sends reply text and parent ID in the correct order', async () => {
	const calls: string[][] = [];
	const form = replyForm(async (...args) => { calls.push(args); });
	let reset = false;
	await form.submit({ preventDefault() {}, currentTarget: { reset() { reset = true; } } });
	assert.deepEqual(calls, [['reply text', 'parent-1']]);
	assert.equal(reset, true);
});

test('keeps reply text and reports failed requests', async () => {
	const form = replyForm(async () => { throw new Error('Session expired'); });
	await form.submit({ preventDefault() {}, currentTarget: { reset: assert.fail } });
	assert.equal(form.getError(), 'Session expired');
});
