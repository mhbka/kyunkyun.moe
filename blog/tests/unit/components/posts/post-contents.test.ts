import assert from 'node:assert/strict';
import test from 'node:test';

import { getPostHeadingSelector } from '../../../../src/components/posts/post-contents.ts';

test('selects all headings from published post content', () => {
	assert.equal(getPostHeadingSelector(false), 'h1, h2, h3, h4, h5, h6');
});

test('selects only headings inside the editable ProseMirror document', () => {
	assert.equal(
		getPostHeadingSelector(true),
		'.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4, .ProseMirror h5, .ProseMirror h6',
	);
});
