/** Normalizes a tag for consistent storage and filtering. */
export function normalizeTag(value: string): string {
	return value.toLowerCase().replace(/\s+/g, '');
}

/** Appends a new normalized tag while preserving existing unique tags. */
export function addTag(tags: readonly string[], value: string): string[] {
	const tag = normalizeTag(value);
	return tag && !tags.includes(tag) ? [...tags, tag] : [...tags];
}

/** Reads all selected tags from a shareable page URL. */
export function readTagFilters(query: URLSearchParams): string[] {
	return query.getAll('tag').reduce<string[]>((tags, tag) => addTag(tags, tag), []);
}

/** Builds a URL that adds or removes one tag, resetting pagination. */
export function toggleTagUrl(basePath: string, tags: readonly string[], tag: string): string {
	const selected = !tag ? [] : tags.includes(tag) ? tags.filter(value => value !== tag) : [...tags, tag];
	const query = new URLSearchParams();
	selected.forEach(value => query.append('tag', value));
	return query.size ? `${basePath}?${query}` : basePath;
}
