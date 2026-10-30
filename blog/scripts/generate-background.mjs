import { mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import sharp from 'sharp';

export const BACKGROUND_WEBP_QUALITY = 80;
export const OVERLAY_WEBP_QUALITY = 92;

const SOURCE_IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.tif', '.tiff']);

// Converts the editable PNG background into the smaller file served by the site.
export async function generateBackground({ sourceFile, outputFile, quality = BACKGROUND_WEBP_QUALITY }) {
	await mkdir(dirname(outputFile), { recursive: true });
	await sharp(sourceFile).webp({ quality, alphaQuality: 100 }).toFile(outputFile);
}

// Converts every source image in an overlay folder into a high-quality WebP beside it.
export async function generateOverlayWebps({ directory }) {
	await mkdir(directory, { recursive: true });
	const entries = await readdir(directory, { withFileTypes: true });
	const sourceFiles = entries
		.filter((entry) => entry.isFile() && SOURCE_IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
		.sort((left, right) => left.name.localeCompare(right.name));

	const outputFiles = [];
	for (const source of sourceFiles) {
		const sourceExtension = extname(source.name);
		const outputFile = join(directory, `${basename(source.name, sourceExtension)}.webp`);
		await generateBackground({
			sourceFile: join(directory, source.name),
			outputFile,
			quality: OVERLAY_WEBP_QUALITY,
		});
		outputFiles.push(outputFile);
	}
	return outputFiles;
}
