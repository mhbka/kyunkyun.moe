import assert from 'node:assert/strict';
import test from 'node:test';
import { getHoveredImage, getWalkerImage, getWalkingImage } from '../../../../src/components/walker/assets.ts';

test('uses a pose image while hovered when one is available', () => {
	const image = getHoveredImage({ standSrc: '/stand.gif', poseSrc: '/pose.gif' });

	assert.deepEqual(image, { src: '/pose.gif', mirrored: false });
});

test('uses the standing image while hovered when no pose is available', () => {
	const image = getHoveredImage({ standSrc: '/stand.png' });

	assert.deepEqual(image, { src: '/stand.png', mirrored: false });
});

test('uses dedicated images for each walking direction', () => {
	const walker = { standSrc: '/stand.gif', walkLeftSrc: '/left.gif', walkRightSrc: '/right.gif' };

	assert.deepEqual(getWalkingImage(walker, -1), { src: '/left.gif', mirrored: false });
	assert.deepEqual(getWalkingImage(walker, 1), { src: '/right.gif', mirrored: false });
});

test('mirrors the available walking image when the other direction is missing', () => {
	const walker = { standSrc: '/stand.png', walkLeftSrc: '/left.gif' };

	assert.deepEqual(getWalkingImage(walker, 1), { src: '/left.gif', mirrored: true });
});

test('keeps walking when a hovered walker has not reached the cursor', () => {
	const walker = { standSrc: '/stand.gif', poseSrc: '/pose.gif', walkLeftSrc: '/left.gif' };

	assert.deepEqual(getWalkerImage(walker, true, true, -1), { src: '/left.gif', mirrored: false });
});

test('mirrors the left-facing stand image after walking right', () => {
	const walker = { standSrc: '/stand.png', walkLeftSrc: '/left.gif' };

	assert.deepEqual(getWalkerImage(walker, false, false, -1), { src: '/stand.png', mirrored: false });
	assert.deepEqual(getWalkerImage(walker, false, false, 1), { src: '/stand.png', mirrored: true });
});
