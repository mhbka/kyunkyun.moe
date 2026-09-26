import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_WALKER_ID, WALKERS } from '../../../../src/consts.ts';

test('registers the slime and every discovered snake_case UMA walker', () => {
	assert.equal(DEFAULT_WALKER_ID, 'slime');
	assert.deepEqual(WALKERS[0], {
		id: 'slime',
		label: 'slime',
		standSrc: '/images/walkers/slime/stand.png',
		poseSrc: '/images/walkers/slime/pose.gif',
		walkLeftSrc: '/images/walkers/slime/walk-left.gif',
	});
	assert.equal(WALKERS.length, 21);
	assert.ok(WALKERS.slice(1).every((walker) => /^[a-z]+(?:_[a-z]+)*$/.test(walker.id)));
	assert.ok(WALKERS.slice(1).every((walker) => walker.poseSrc?.endsWith('/pose.gif')));
	assert.ok(WALKERS.slice(1).every((walker) => walker.walkRightSrc?.endsWith('/walk-right.gif')));
});
