// @ts-check

import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { generateWalkerManifest } from './scripts/generate-walker-manifest.mjs';

import node from '@astrojs/node';

const exposedEnvPrefixes = ['PUBLIC_', 'SUPABASE_', 'BACKEND_'];
const isBuild = process.argv.includes('build');

generateWalkerManifest({
	publicDirectory: fileURLToPath(new URL('./public', import.meta.url)),
	outputFile: fileURLToPath(new URL('./src/generated/walkers.ts', import.meta.url)),
});

function loadBuildEnv() {
	const env = parseEnv(readFileSync(new URL('./.env', import.meta.url), 'utf8'));

	return Object.fromEntries(
		Object.entries(env)
			.filter(([name]) => exposedEnvPrefixes.some((prefix) => name.startsWith(prefix)))
			.map(([name, value]) => [`import.meta.env.${name}`, JSON.stringify(value)]),
	);
}

// https://astro.build/config
export default defineConfig({
    site: 'https://kyunkyun.moe',
	integrations: [mdx(), react(), sitemap()],
	output: 'server',
	// The Supabase URL and publishable key are deliberately available to browser scripts.
	vite: {
		envPrefix: exposedEnvPrefixes,
		// Vite normally loads .env.local for every mode. Production builds must use
		// only .env, while local development keeps Vite's standard .env.local override.
		...(isBuild
			? {
				envDir: false,
				define: loadBuildEnv(),
			}
			: {}),
	},

	fonts: [
		{
			provider: fontProviders.google(),
			name: 'M PLUS 1p',
			cssVariable: '--font-m-plus-1p',
			fallbacks: ['sans-serif'],
			weights: [400, 700],
			subsets: ['latin', 'japanese'],
		},
	],

  adapter: node({
    mode: 'standalone',
  }),
});
