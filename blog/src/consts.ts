// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.
export { DEFAULT_WALKER_ID, WALKERS } from './generated/walkers.ts';

export const SITE_TITLE = 'kyunkyun.moe';
export const SITE_DESCRIPTION = '-';

export const THEMES = [
	{ id: 'cargo', label: 'cargo' },
] as const;

export const DEFAULT_THEME_ID = THEMES[0].id;
