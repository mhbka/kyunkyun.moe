export interface WalkerAssets {
	standSrc: string;
	poseSrc?: string;
	walkLeftSrc: string;
	walkRightSrc: string;
}

export interface WalkerDefinition extends WalkerAssets {
	id: string;
	label: string;
}

/** Returns the still image used while the walker is hovered. */
export function getHoveredImage(walker: WalkerAssets): string {
	return walker.poseSrc ?? walker.standSrc;
}

/** Returns the walking image for the given direction. */
export function getWalkingImage(walker: WalkerAssets, direction: -1 | 1): string {
	return direction === -1 ? walker.walkLeftSrc : walker.walkRightSrc;
}

/** Returns the image for the walker's movement and hover state. */
export function getWalkerImage(
	walker: WalkerAssets,
	isWalking: boolean,
	isHovered: boolean,
	direction: -1 | 1,
): string {
	if (isWalking) return getWalkingImage(walker, direction);
	if (isHovered) return getHoveredImage(walker);
	return walker.standSrc;
}
