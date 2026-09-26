export const WALK_SPEED = 65;
export const STOP_DISTANCE = 1;
export const RESTART_DISTANCE = 80;

export type WalkDirection = -1 | 0 | 1;

export interface WalkStep {
	position: number;
	direction: WalkDirection;
}

/** Returns whether the cursor is far enough away to restart a stopped walker. */
export function shouldRestartWalking(position: number, target: number): boolean {
	return Math.abs(target - position) > RESTART_DISTANCE;
}

/** Moves the walker toward the cursor without passing it. */
export function moveTowardsCursor(position: number, target: number, elapsedSeconds: number): WalkStep {
	const distance = target - position;

	if (Math.abs(distance) <= STOP_DISTANCE) {
		return { position: target, direction: 0 };
	}

	const direction: WalkDirection = distance < 0 ? -1 : 1;
	const distanceToTravel = Math.min(Math.abs(distance), WALK_SPEED * elapsedSeconds);

	return { position: position + direction * distanceToTravel, direction };
}
