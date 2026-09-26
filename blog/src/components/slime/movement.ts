export const CRAWL_SPEED = 52;
export const STOP_DISTANCE = 1;
export const RESTART_DISTANCE = 16;

export type CrawlDirection = -1 | 0 | 1;

export interface CrawlStep {
	position: number;
	direction: CrawlDirection;
}

/** Returns whether the cursor is far enough away to restart a stopped slime. */
export function shouldRestartCrawling(position: number, target: number): boolean {
	return Math.abs(target - position) > RESTART_DISTANCE;
}

/** Moves the slime toward the cursor without passing it. */
export function moveTowardsCursor(position: number, target: number, elapsedSeconds: number): CrawlStep {
	const distance = target - position;

	if (Math.abs(distance) <= STOP_DISTANCE) {
		return { position: target, direction: 0 };
	}

	const direction: CrawlDirection = distance < 0 ? -1 : 1;
	const distanceToTravel = Math.min(Math.abs(distance), CRAWL_SPEED * elapsedSeconds);

	return { position: position + direction * distanceToTravel, direction };
}
