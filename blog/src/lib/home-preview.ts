/** Shortens preview text without cutting through a word when possible. */
export function truncatePreviewText(value: string, maximumLength = 160) {
	const text = value.replace(/\s+/g, ' ').trim();
	if (text.length <= maximumLength) return text;

	const shortened = text.slice(0, maximumLength).trimEnd();
	const lastSpace = shortened.lastIndexOf(' ');
	return `${lastSpace > 0 ? shortened.slice(0, lastSpace) : shortened}…`;
}
