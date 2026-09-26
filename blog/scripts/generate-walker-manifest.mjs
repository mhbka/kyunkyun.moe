import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const assetNames = new Set(['pose', 'stand', 'walk-left', 'walk-right']);

// Finds every directory that contains a stand image and at least one walking image.
function findWalkers(directory, publicDirectory) {
	const walkers = [];
	const entries = readdirSync(directory, { withFileTypes: true });
	const images = new Map();

	for (const entry of entries) {
		const fullPath = join(directory, entry.name);
		if (entry.isDirectory()) {
			walkers.push(...findWalkers(fullPath, publicDirectory));
			continue;
		}

		const name = basename(entry.name, extname(entry.name));
		if (entry.isFile() && extname(entry.name) && assetNames.has(name)) images.set(name, fullPath);
	}

	if (images.has('stand') && (images.has('walk-left') || images.has('walk-right'))) {
		const imageUrl = (name) => `/${relative(publicDirectory, images.get(name)).split(sep).join('/')}`;
		const id = basename(directory);

		walkers.push({
			id,
			label: id,
			standSrc: imageUrl('stand'),
			...(images.has('pose') ? { poseSrc: imageUrl('pose') } : {}),
			...(images.has('walk-left') ? { walkLeftSrc: imageUrl('walk-left') } : {}),
			...(images.has('walk-right') ? { walkRightSrc: imageUrl('walk-right') } : {}),
		});
	}

	return walkers;
}

// Generates the client-safe walker manifest from the public asset folders.
export function generateWalkerManifest({ publicDirectory, outputFile }) {
	const walkerDirectory = join(publicDirectory, 'images', 'walkers');
	const walkers = findWalkers(walkerDirectory, publicDirectory).sort((left, right) => {
		if (left.id === 'slime') return -1;
		if (right.id === 'slime') return 1;
		return left.id.localeCompare(right.id);
	});
	const source = [
		"import type { WalkerDefinition } from '../components/walker/assets';",
		'',
		'// Generated from public/images/walkers. Do not edit manually.',
		`export const WALKERS = ${JSON.stringify(walkers, null, '\t')} satisfies readonly WalkerDefinition[];`,
		'',
		'export const DEFAULT_WALKER_ID = WALKERS[0].id;',
		'',
	].join('\n');

	try {
		if (readFileSync(outputFile, 'utf8') === source) return;
	} catch {
		// Creates the manifest when it does not exist yet.
	}

	mkdirSync(join(outputFile, '..'), { recursive: true });
	writeFileSync(outputFile, source);
}
