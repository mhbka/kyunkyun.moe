import assert from 'node:assert/strict';
import test from 'node:test';
import { CRAWL_SPEED, RESTART_DISTANCE, moveTowardsCursor, shouldRestartCrawling } from '../../../../src/components/slime/movement.ts';

test('moves left toward a cursor on the left', () => {
	const step = moveTowardsCursor(100, 0, 1);

	assert.deepEqual(step, { position: 100 - CRAWL_SPEED, direction: -1 });
});

test('moves right toward a cursor on the right', () => {
	const step = moveTowardsCursor(100, 200, 1);

	assert.deepEqual(step, { position: 100 + CRAWL_SPEED, direction: 1 });
});

test('stops precisely at a nearby cursor without overshooting', () => {
	const step = moveTowardsCursor(100, 100.5, 1);

	assert.deepEqual(step, { position: 100.5, direction: 0 });
});

test('only restarts after the cursor moves beyond the restart distance', () => {
	assert.equal(shouldRestartCrawling(100, 100 + RESTART_DISTANCE), false);
	assert.equal(shouldRestartCrawling(100, 100 + RESTART_DISTANCE + 0.1), true);
});
