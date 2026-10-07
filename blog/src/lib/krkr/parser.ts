import { KrkrMotionParseError, type KrkrCurve, type KrkrFrame, type KrkrFrameContent, type KrkrLayer, type KrkrMotion, type KrkrMotionDocument, type KrkrSource } from "./models";


/** Parses exported MotionPlayer PSB JSON into a small, validated representation. */
export function parseKrkrMotionDocument(value: unknown): KrkrMotionDocument {
	const root = objectAt(value, 'document');
	if (root.spec !== 'krkr') throw new KrkrMotionParseError('Expected a MotionPlayer document with spec "krkr".');
	const label = stringAt(root.label, 'label');
	const screen = objectAt(root.screenSize, 'screenSize');
	const objectRoot = objectAt(root.object, 'object');
	const sourceRoot = objectAt(root.source, 'source');
	const model = objectAt(objectRoot[label], `object.${label}`);
	const sourceModel = objectAt(sourceRoot[label], `source.${label}`);
	const sources = parseSources(objectAt(sourceModel.icon, `source.${label}.icon`));
	const motions = parseMotions(objectAt(model.motion, `object.${label}.motion`));
	const unsupportedFeatures = new Set<string>();
	for (const motion of motions.values()) collectUnsupportedFeatures(motion.layers, unsupportedFeatures);

	return {
		label,
		width: numberAt(screen.width, 'screenSize.width'),
		height: numberAt(screen.height, 'screenSize.height'),
		originX: numberAt(screen.originX, 'screenSize.originX'),
		originY: numberAt(screen.originY, 'screenSize.originY'),
		sources,
		motions,
		unsupportedFeatures: [...unsupportedFeatures].sort(),
	};
}

/** Returns a named timeline or explains which timeline names are available. */
export function getKrkrMotion(document: KrkrMotionDocument, name: string): KrkrMotion {
	const motion = document.motions.get(name);
	if (motion) return motion;
	throw new KrkrMotionParseError(`Unknown motion "${name}". Available motions: ${[...document.motions.keys()].join(', ')}.`);
}

// Parses every source image belonging to the document's selected model.
function parseSources(value: Record<string, unknown>): Map<string, KrkrSource> {
	const sources = new Map<string, KrkrSource>();
	for (const [name, rawSource] of Object.entries(value)) {
		const source = objectAt(rawSource, `source.${name}`);
		const clip = objectAt(source.clip, `source.${name}.clip`);
		sources.set(name, {
			name,
			width: numberAt(source.width, `source.${name}.width`),
			height: numberAt(source.height, `source.${name}.height`),
			originX: numberAt(source.originX, `source.${name}.originX`),
			originY: numberAt(source.originY, `source.${name}.originY`),
			clip: { left: numberAt(clip.left, 'clip.left'), top: numberAt(clip.top, 'clip.top'), right: numberAt(clip.right, 'clip.right'), bottom: numberAt(clip.bottom, 'clip.bottom') },
		});
	}
	return sources;
}

// Parses every named MotionPlayer timeline in the selected model.
function parseMotions(value: Record<string, unknown>): Map<string, KrkrMotion> {
	const motions = new Map<string, KrkrMotion>();
	for (const [name, rawMotion] of Object.entries(value)) {
		const motion = objectAt(rawMotion, `motion.${name}`);
		motions.set(name, {
			name,
			lastTime: numberAt(motion.lastTime, `motion.${name}.lastTime`),
			loopTime: numberAt(motion.loopTime, `motion.${name}.loopTime`),
			layers: arrayAt(motion.layer, `motion.${name}.layer`).map((layer, index) => parseLayer(layer, `motion.${name}.layer[${index}]`)),
		});
	}
	return motions;
}

// Parses a layer and preserves fields the first compiler version cannot draw.
function parseLayer(value: unknown, path: string): KrkrLayer {
	const layer = objectAt(value, path);
	const unsupportedFeatures: string[] = [];
	if ((optionalNumber(layer.meshTransform, `${path}.meshTransform`) ?? 0) !== 0) unsupportedFeatures.push('mesh deformation');
	if ((optionalNumber(layer.stencilType, `${path}.stencilType`) ?? 0) !== 0) unsupportedFeatures.push('stencil masking');
	if (numberAt(layer.coordinate, `${path}.coordinate`) !== 0) unsupportedFeatures.push('3D coordinate mode');
	if (arrayAt(layer.stencilCompositeMaskLayerList ?? [], `${path}.stencilCompositeMaskLayerList`).length > 0) unsupportedFeatures.push('composite stencil masks');

	return {
		label: stringAt(layer.label, `${path}.label`),
		type: numberAt(layer.type, `${path}.type`),
		coordinate: numberAt(layer.coordinate, `${path}.coordinate`),
		inheritMask: numberAt(layer.inheritMask, `${path}.inheritMask`),
		transformOrder: arrayAt(layer.transformOrder, `${path}.transformOrder`).map((entry, index) => numberAt(entry, `${path}.transformOrder[${index}]`)),
		frameList: arrayAt(layer.frameList, `${path}.frameList`).map((frame, index) => parseFrame(frame, `${path}.frameList[${index}]`)),
		children: arrayAt(layer.children, `${path}.children`).map((child, index) => parseLayer(child, `${path}.children[${index}]`)),
		unsupportedFeatures,
	};
}

// Parses one frame while retaining its sparse, masked payload.
function parseFrame(value: unknown, path: string): KrkrFrame {
	const frame = objectAt(value, path);
	const content = frame.content === undefined || frame.content === null ? undefined : parseFrameContent(frame.content, `${path}.content`);
	return { time: numberAt(frame.time, `${path}.time`), type: numberAt(frame.type, `${path}.type`), content };
}

// Parses the animated values that are used by the compiler.
function parseFrameContent(value: unknown, path: string): KrkrFrameContent {
	const content = objectAt(value, path);
	const coord = content.coord === undefined ? undefined : tuple3(arrayAt(content.coord, `${path}.coord`), `${path}.coord`);
	return {
		mask: optionalNumber(content.mask, `${path}.mask`), src: optionalString(content.src, `${path}.src`), coord,
		ox: optionalNumber(content.ox, `${path}.ox`), oy: optionalNumber(content.oy, `${path}.oy`), angle: optionalNumber(content.angle, `${path}.angle`),
		motion: content.motion === undefined ? undefined : parseMotionReference(content.motion, `${path}.motion`),
		acc: content.acc === undefined ? undefined : parseCurve(content.acc, `${path}.acc`),
		ccc: content.ccc === undefined ? undefined : parseCurve(content.ccc, `${path}.ccc`),
	};
}

// Parses timing information for a nested motion reference.
function parseMotionReference(value: unknown, path: string): { timeOffset?: number; mask?: number } {
	const motion = objectAt(value, path);
	return { timeOffset: optionalNumber(motion.timeOffset, `${path}.timeOffset`), mask: optionalNumber(motion.mask, `${path}.mask`) };
}

// Parses the four cubic control points exported by MotionPlayer.
function parseCurve(value: unknown, path: string): KrkrCurve {
	const curve = objectAt(value, path);
	return { c: tuple2(arrayAt(curve.c, `${path}.c`), `${path}.c`), x: tuple4(arrayAt(curve.x, `${path}.x`), `${path}.x`), y: tuple4(arrayAt(curve.y, `${path}.y`), `${path}.y`) };
}

// Adds each layer's deferred renderer requirements to the document report.
function collectUnsupportedFeatures(layers: KrkrLayer[], features: Set<string>): void {
	for (const layer of layers) {
		for (const feature of layer.unsupportedFeatures) features.add(feature);
		collectUnsupportedFeatures(layer.children, features);
	}
}

// Narrows a JSON value to an object with string keys.
function objectAt(value: unknown, path: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
	throw new KrkrMotionParseError(`Expected an object at ${path}.`);
}

// Narrows a JSON value to an array.
function arrayAt(value: unknown, path: string): unknown[] {
	if (Array.isArray(value)) return value;
	throw new KrkrMotionParseError(`Expected an array at ${path}.`);
}

// Narrows a JSON value to a finite number.
function numberAt(value: unknown, path: string): number {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	throw new KrkrMotionParseError(`Expected a finite number at ${path}.`);
}

// Narrows an optional JSON value to a finite number.
function optionalNumber(value: unknown, path: string): number | undefined {
	return value === undefined ? undefined : numberAt(value, path);
}

// Narrows a JSON value to a string.
function stringAt(value: unknown, path: string): string {
	if (typeof value === 'string') return value;
	throw new KrkrMotionParseError(`Expected a string at ${path}.`);
}

// Narrows an optional JSON value to a string.
function optionalString(value: unknown, path: string): string | undefined {
	return value === undefined ? undefined : stringAt(value, path);
}

// Narrows an array to a pair of finite numbers.
function tuple2(value: unknown[], path: string): [number, number] {
	if (value.length !== 2) throw new KrkrMotionParseError(`Expected two values at ${path}.`);
	return [numberAt(value[0], `${path}[0]`), numberAt(value[1], `${path}[1]`)];
}

// Narrows an array to a three-dimensional coordinate.
function tuple3(value: unknown[], path: string): [number, number, number] {
	if (value.length !== 3) throw new KrkrMotionParseError(`Expected three values at ${path}.`);
	return [numberAt(value[0], `${path}[0]`), numberAt(value[1], `${path}[1]`), numberAt(value[2], `${path}[2]`)];
}

// Narrows an array to four cubic control-point values.
function tuple4(value: unknown[], path: string): [number, number, number, number] {
	if (value.length !== 4) throw new KrkrMotionParseError(`Expected four values at ${path}.`);
	return [numberAt(value[0], `${path}[0]`), numberAt(value[1], `${path}[1]`), numberAt(value[2], `${path}[2]`), numberAt(value[3], `${path}[3]`)];
}
