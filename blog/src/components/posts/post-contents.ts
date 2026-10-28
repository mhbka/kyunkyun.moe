const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/** Builds the heading selector for published content or the editable document only. */
export function getPostHeadingSelector(editable: boolean): string {
	return headingTags
		.map((tag) => editable ? `.ProseMirror ${tag}` : tag)
		.join(', ');
}
