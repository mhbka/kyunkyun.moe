import assert from 'node:assert/strict';
import test from 'node:test';
import { getHoveredImage, getWalkerImage, getWalkingImage } from '../../../../src/components/walker/assets.ts';

const walker = { standSrc: '/stand.gif', poseSrc: '/pose.gif', walkLeftSrc: '/left.gif', walkRightSrc: '/right.gif' };

test('uses a pose image while hovered when one is available', () => {
	assert.equal(getHoveredImage(walker), '/pose.gif');
});

test('uses the standing image while hovered when no pose is available', () => {
	assert.equal(getHoveredImage({ ...walker, poseSrc: undefined }), '/stand.gif');
});

test('uses dedicated images for each walking direction', () => {
	assert.equal(getWalkingImage(walker, -1), '/left.gif');
	assert.equal(getWalkingImage(walker, 1), '/right.gif');
});

test('keeps walking when a hovered walker has not reached the cursor', () => {
	assert.equal(getWalkerImage(walker, true, true, -1), '/left.gif');
});

test('shows the standing image when idle', () => {
	assert.equal(getWalkerImage(walker, false, false, 1), '/stand.gif');
});
