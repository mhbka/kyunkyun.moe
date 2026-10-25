import assert from 'node:assert/strict';
import test from 'node:test';
import { createTweetPreviews } from '../../../../src/components/tweets/previews.ts';

test('releases image and video URLs on replacement and disposal, even before loading', t => {
	const revoked: string[] = [];
	let nextUrl = 0;
	class Video { muted = false; }
	t.mock.method(URL, 'createObjectURL', () => `blob:${++nextUrl}`);
	t.mock.method(URL, 'revokeObjectURL', (url: string) => { revoked.push(url); });
	const oldDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
	const oldVideo = Object.getOwnPropertyDescriptor(globalThis, 'HTMLVideoElement');
	Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: (tag: string) => tag === 'video' ? new Video() : {} } });
	Object.defineProperty(globalThis, 'HTMLVideoElement', { configurable: true, value: Video });
	t.after(() => {
		if (oldDocument) Object.defineProperty(globalThis, 'document', oldDocument);
		else Reflect.deleteProperty(globalThis, 'document');
		if (oldVideo) Object.defineProperty(globalThis, 'HTMLVideoElement', oldVideo);
		else Reflect.deleteProperty(globalThis, 'HTMLVideoElement');
	});
	const previews = createTweetPreviews({ replaceChildren() {}, append() {} } as unknown as HTMLElement);
	previews.render([new File([], 'a.png', { type: 'image/png' }), new File([], 'b.mp4', { type: 'video/mp4' })]);
	assert.deepEqual(revoked, []);
	previews.render([new File([], 'c.png', { type: 'image/png' })]);
	assert.deepEqual(revoked, ['blob:1', 'blob:2']);
	previews.clear();
	previews.clear();
	assert.deepEqual(revoked, ['blob:1', 'blob:2', 'blob:3']);
});
