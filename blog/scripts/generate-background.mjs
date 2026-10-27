import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

// Converts the editable PNG background into the smaller file served by the site.
export async function generateBackground({ sourceFile, outputFile }) {
	await mkdir(dirname(outputFile), { recursive: true });
	await sharp(sourceFile).webp({ quality: 80 }).toFile(outputFile);
}
