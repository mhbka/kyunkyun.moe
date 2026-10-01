import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_WALKER_ID, WALKERS } from '../../../../src/consts.ts';

test('registers every discovered snake_case UMA walker and places slime last', () => {
	assert.equal(DEFAULT_WALKER_ID, 'seiun_sky');
	assert.equal(WALKERS.length, 21);
	assert.deepEqual(WALKERS.at(-1), {
		id: 'slime',
		label: 'slime',
		standSrc: '/images/walkers/slime/stand.png',
		mirrorStandWithDirection: true,
		poseSrc: '/images/walkers/slime/pose.gif',
		walkLeftSrc: '/images/walkers/slime/walk-left.gif',
	});
	assert.ok(WALKERS.slice(0, -1).every((walker) => /^[a-z]+(?:_[a-z]+)*$/.test(walker.id)));
	assert.ok(WALKERS.slice(0, -1).every((walker) => walker.poseSrc?.endsWith('/pose.gif')));
	assert.ok(WALKERS.slice(0, -1).every((walker) => walker.walkRightSrc?.endsWith('/walk-right.gif')));
});
