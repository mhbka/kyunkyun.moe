import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import { generateBackground } from '../../../scripts/generate-background.mjs';

test('generates a WebP background with the source dimensions', async (context) => {
	const directory = await mkdtemp(join(tmpdir(), 'site-background-'));
	const sourceFile = join(directory, 'bg.png');
	const outputFile = join(directory, 'images', 'bg.webp');
	context.after(() => rm(directory, { force: true, recursive: true }));

	// Creates a small source image without depending on the production artwork.
	await sharp({ create: { width: 12, height: 8, channels: 3, background: '#5797c9' } }).png().toFile(sourceFile);
	await generateBackground({ sourceFile, outputFile });

	const generatedFile = await readFile(outputFile);
	const metadata = await sharp(generatedFile).metadata();
	assert.equal(metadata.format, 'webp');
	assert.equal(metadata.width, 12);
	assert.equal(metadata.height, 8);
});
