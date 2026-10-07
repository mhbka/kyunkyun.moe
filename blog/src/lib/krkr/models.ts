/** Describes one image exported from a MotionPlayer PSB document. */
export interface KrkrSource {
    name: string;
    width: number;
    height: number;
    originX: number;
    originY: number;
    clip: KrkrClip;
}

/** Stores the normalized clip rectangle associated with an image source. */
export interface KrkrClip {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

/** Stores an individual animation frame as exported by MotionPlayer. */
export interface KrkrFrame {
    time: number;
    type: number;
    content?: KrkrFrameContent;
}

/** Stores the animated properties carried by a MotionPlayer frame. */
export interface KrkrFrameContent {
    mask?: number;
    src?: string;
    coord?: [number, number, number];
    ox?: number;
    oy?: number;
    angle?: number;
    motion?: { timeOffset?: number; mask?: number };
    acc?: KrkrCurve;
    ccc?: KrkrCurve;
}

/** Stores the cubic interpolation data attached to a frame segment. */
export interface KrkrCurve {
    c: [number, number];
    x: [number, number, number, number];
    y: [number, number, number, number];
}

/** Describes one layer in a MotionPlayer timeline tree. */
export interface KrkrLayer {
    label: string;
    type: number;
    coordinate: number;
    inheritMask: number;
    transformOrder: number[];
    frameList: KrkrFrame[];
    children: KrkrLayer[];
    unsupportedFeatures: string[];
}

/** Describes a named MotionPlayer timeline. */
export interface KrkrMotion {
    name: string;
    lastTime: number;
    loopTime: number;
    layers: KrkrLayer[];
}

/** Represents the validated 2D data of an E-mote animation. */
export interface KrkrMotionDocument {
    label: string;
    width: number;
    height: number;
    originX: number;
    originY: number;
    sources: Map<string, KrkrSource>;
    motions: Map<string, KrkrMotion>;
    unsupportedFeatures: string[];
}

/** Identifies a JSON document that cannot be interpreted as MotionPlayer data. */
export class KrkrMotionParseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KrkrMotionParseError';
    }
}