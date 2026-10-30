import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
	BACKGROUND_WEBP_QUALITY,
	generateBackground,
	generateOverlayWebps,
	OVERLAY_WEBP_QUALITY,
} from '../../../scripts/generate-background.mjs';

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

test('generates high-quality WebPs for every overlay source image', async (context) => {
	const directory = await mkdtemp(join(tmpdir(), 'site-overlays-'));
	context.after(() => rm(directory, { force: true, recursive: true }));

	// Creates two supported sources and one unrelated file to verify folder filtering.
	await sharp({ create: { width: 10, height: 6, channels: 4, background: '#ffb6d5' } }).png().toFile(join(directory, 'b.png'));
	await sharp({ create: { width: 8, height: 5, channels: 3, background: '#5797c9' } }).jpeg().toFile(join(directory, 'a.jpg'));
	await writeFile(join(directory, 'notes.txt'), 'not an image');

	const outputFiles = await generateOverlayWebps({ directory });
	assert.deepEqual(outputFiles, [join(directory, 'a.webp'), join(directory, 'b.webp')]);
	assert.ok(OVERLAY_WEBP_QUALITY > BACKGROUND_WEBP_QUALITY);

	const generatedFiles = await Promise.all(outputFiles.map((file) => readFile(file)));
	const metadata = await Promise.all(generatedFiles.map((file) => sharp(file).metadata()));
	assert.deepEqual(metadata.map((image) => image.format), ['webp', 'webp']);
	assert.deepEqual(metadata.map((image) => [image.width, image.height]), [[8, 5], [10, 6]]);
});
