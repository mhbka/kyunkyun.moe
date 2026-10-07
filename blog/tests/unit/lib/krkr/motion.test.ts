import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getKrkrMotion, KrkrMotionParseError, parseKrkrMotionDocument } from '../../../../src/lib/krkr/parser.ts';

const sourceFile = new URL('../../../../public/images/nanami_hanging/sd002.json', import.meta.url);

test('parses Nanami MotionPlayer data and preserves its nested swing timeline', async () => {
	const rawDocument: unknown = JSON.parse(await readFile(sourceFile, 'utf8'));
	const document = parseKrkrMotionDocument(rawDocument);
	const swing = getKrkrMotion(document, 'swing2');

	assert.equal(document.width, 1125);
	assert.equal(document.height, 675);
	assert.equal(document.sources.get('七海体')?.originX, 209);
	assert.equal(swing.lastTime, 90);
	assert.equal(swing.layers[0].frameList[0].content?.src, 'motion/SD002/nanami2');
	assert.deepEqual(document.unsupportedFeatures, ['stencil masking']);
});

test('reports unsupported mesh, stencil, and 3D layer features', () => {
	const document = parseKrkrMotionDocument(createDocument({ meshTransform: 1, stencilType: 2, coordinate: 1 }));

	assert.deepEqual(document.unsupportedFeatures, ['3D coordinate mode', 'mesh deformation', 'stencil masking']);
});

test('rejects an incompatible or malformed document', () => {
	assert.throws(() => parseKrkrMotionDocument({ spec: 'other' }), KrkrMotionParseError);
	assert.throws(() => getKrkrMotion(parseKrkrMotionDocument(createDocument({})), 'missing'), /Available motions: idle/);
});

// Creates the smallest valid MotionPlayer-shaped fixture for parser tests.
function createDocument(layerOverrides: Record<string, unknown>): unknown {
	return {
		spec: 'krkr', label: 'model', screenSize: { width: 1, height: 1, originX: 0, originY: 0 },
		object: { model: { motion: { idle: { lastTime: 1, loopTime: 0, layer: [{ label: 'layer', type: 0, coordinate: 0, inheritMask: 0, transformOrder: [0, 3, 2, 1], frameList: [{ time: 0, type: 2, content: { src: 'src/model/image', coord: [0, 0, 0] } }], children: [], meshTransform: 0, stencilType: 0, stencilCompositeMaskLayerList: [], ...layerOverrides }] } } } },
		source: { model: { icon: { image: { width: 1, height: 1, originX: 0, originY: 0, clip: { left: 0, top: 0, right: 1, bottom: 1 } } } } },
	};
}
