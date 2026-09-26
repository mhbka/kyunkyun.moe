export interface WalkerAssets {
	standSrc: string;
	poseSrc?: string;
	walkLeftSrc?: string;
	walkRightSrc?: string;
}

export interface WalkerDefinition extends WalkerAssets {
	id: string;
	label: string;
}

export interface WalkerImage {
	src: string;
	mirrored: boolean;
}

/** Returns the still image used while the walker is hovered. */
export function getHoveredImage(walker: WalkerAssets): WalkerImage {
	return { src: walker.poseSrc ?? walker.standSrc, mirrored: false };
}

/** Returns the directional walking image, mirroring its counterpart when needed. */
export function getWalkingImage(walker: WalkerAssets, direction: -1 | 1): WalkerImage {
	if (direction === -1) {
		if (walker.walkLeftSrc) return { src: walker.walkLeftSrc, mirrored: false };
		return { src: walker.walkRightSrc!, mirrored: true };
	}

	if (walker.walkRightSrc) return { src: walker.walkRightSrc, mirrored: false };
	return { src: walker.walkLeftSrc!, mirrored: true };
}

/** Returns the image for the walker's movement and hover state. */
export function getWalkerImage(
	walker: WalkerAssets,
	isWalking: boolean,
	isHovered: boolean,
	direction: -1 | 1,
): WalkerImage {
	if (isWalking) return getWalkingImage(walker, direction);
	if (isHovered) return getHoveredImage(walker);
	return { src: walker.standSrc, mirrored: direction === 1 };
}
