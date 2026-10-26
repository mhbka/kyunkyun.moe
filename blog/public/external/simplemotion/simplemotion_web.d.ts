/* tslint:disable */
/* eslint-disable */

/**
 * Runs the SD002 pendulum override demonstration.
 */
export class PendulumDemo {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Advances the simulation before evaluating an SVG or canvas frame.
     */
    advance(delta_seconds: number, clicked: boolean): void;
    /**
     * Evaluates the current pendulum state into SVG-friendly draw commands.
     */
    commands(frame: number): any;
    /**
     * Advances the simulation from browser input, then draws the current frame.
     */
    draw(canvas: CanvasRenderingContext2D, images: Map<any, any>, delta_seconds: number, clicked: boolean, frame: number): void;
    /**
     * Returns the exported image labels expected in the image map passed to `draw`.
     */
    iconLabels(): string[];
    /**
     * Returns the icon details collected by the most recent `draw` call.
     */
    lastIconDetails(): string[];
    /**
     * Returns the layer details collected by the most recent `draw` call.
     */
    lastLayerDetails(): string[];
    /**
     * Creates the SD002 pendulum demonstration from its Motion JSON.
     */
    constructor(json: string);
    /**
     * Enables or disables collection of the most recently evaluated icon commands.
     */
    setDebugIcons(enabled: boolean): void;
    /**
     * Enables or disables collection of the most recently evaluated layer transforms.
     */
    setDebugLayers(enabled: boolean): void;
    /**
     * Returns the pendulum's current angle in degrees.
     */
    readonly angleDegrees: number;
    /**
     * Returns the pendulum's current angular velocity.
     */
    readonly angularVelocity: number;
    /**
     * Returns the Motion document canvas height.
     */
    readonly screenHeight: number;
    /**
     * Returns the Motion document canvas width.
     */
    readonly screenWidth: number;
}

/**
 * Evaluates a Motion document and renders its commands to a browser canvas.
 */
export class SimpleMotionPlayer {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Appends a translation and rotation transform to one layer.
     */
    appendLayerTransform(path: string, angle: number, translate_x: number, translate_y: number, opacity: number, direct_icon_only: boolean): void;
    /**
     * Clears one external layer replacement.
     */
    clearLayerReplacement(path: string): void;
    /**
     * Clears one external transform override.
     */
    clearLayerTransform(path: string): void;
    /**
     * Evaluates one root motion into SVG-friendly draw commands.
     */
    commands(root_index: number, frame: number): any;
    /**
     * Draws one root motion at a timeline frame without clearing the canvas.
     *
     * `images` maps each exported icon label from `iconLabels()` to an `HTMLImageElement`.
     */
    draw(canvas: CanvasRenderingContext2D, images: Map<any, any>, root_index: number, frame: number): void;
    /**
     * Returns the exported image labels expected in the image map passed to `draw`.
     */
    iconLabels(): string[];
    /**
     * Returns the icon details collected by the most recent `draw` call.
     */
    lastIconDetails(): string[];
    /**
     * Returns the layer details collected by the most recent `draw` call.
     */
    lastLayerDetails(): string[];
    /**
     * Locks one layer to a point on its inherited timeline.
     */
    lockLayer(path: string, inherited_time: number): void;
    /**
     * Creates a player from the contents of one Motion JSON document.
     */
    constructor(json: string);
    /**
     * Replaces one layer with a donor layer selected by path.
     */
    replaceLayer(target: string, donor: string): void;
    /**
     * Returns the root-motion labels that can be passed to `draw` by index.
     */
    rootLabels(): string[];
    /**
     * Enables or disables collection of the most recently evaluated icon commands.
     */
    setDebugIcons(enabled: boolean): void;
    /**
     * Enables or disables collection of the most recently evaluated layer transforms.
     */
    setDebugLayers(enabled: boolean): void;
    /**
     * Returns the Motion document canvas height.
     */
    readonly screenHeight: number;
    /**
     * Returns the Motion document canvas width.
     */
    readonly screenWidth: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_pendulumdemo_free: (a: number, b: number) => void;
    readonly __wbg_simplemotionplayer_free: (a: number, b: number) => void;
    readonly pendulumdemo_advance: (a: number, b: number, c: number) => void;
    readonly pendulumdemo_angleDegrees: (a: number) => number;
    readonly pendulumdemo_angularVelocity: (a: number) => number;
    readonly pendulumdemo_commands: (a: number, b: number) => any;
    readonly pendulumdemo_draw: (a: number, b: any, c: any, d: number, e: number, f: number) => [number, number];
    readonly pendulumdemo_iconLabels: (a: number) => [number, number];
    readonly pendulumdemo_lastIconDetails: (a: number) => [number, number];
    readonly pendulumdemo_lastLayerDetails: (a: number) => [number, number];
    readonly pendulumdemo_new: (a: number, b: number) => [number, number, number];
    readonly pendulumdemo_screenHeight: (a: number) => number;
    readonly pendulumdemo_screenWidth: (a: number) => number;
    readonly pendulumdemo_setDebugIcons: (a: number, b: number) => void;
    readonly pendulumdemo_setDebugLayers: (a: number, b: number) => void;
    readonly simplemotionplayer_appendLayerTransform: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly simplemotionplayer_clearLayerReplacement: (a: number, b: number, c: number) => void;
    readonly simplemotionplayer_clearLayerTransform: (a: number, b: number, c: number) => void;
    readonly simplemotionplayer_commands: (a: number, b: number, c: number) => [number, number, number];
    readonly simplemotionplayer_draw: (a: number, b: any, c: any, d: number, e: number) => [number, number];
    readonly simplemotionplayer_iconLabels: (a: number) => [number, number];
    readonly simplemotionplayer_lastIconDetails: (a: number) => [number, number];
    readonly simplemotionplayer_lastLayerDetails: (a: number) => [number, number];
    readonly simplemotionplayer_lockLayer: (a: number, b: number, c: number, d: number) => void;
    readonly simplemotionplayer_new: (a: number, b: number) => [number, number, number];
    readonly simplemotionplayer_replaceLayer: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly simplemotionplayer_rootLabels: (a: number) => [number, number];
    readonly simplemotionplayer_screenHeight: (a: number) => number;
    readonly simplemotionplayer_screenWidth: (a: number) => number;
    readonly simplemotionplayer_setDebugIcons: (a: number, b: number) => void;
    readonly simplemotionplayer_setDebugLayers: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
